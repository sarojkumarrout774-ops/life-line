const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { smartMatch } = require('../ai/matchingEngine');
const { sendNotificationToUsers } = require('../services/notificationService');

const router = express.Router();

// POST /api/requests - create new blood request
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { blood_group, units_needed, hospital, lat, lng, address, urgency, notes, patient_name, contact_phone } = req.body;
  if (!blood_group || !hospital) return res.status(400).json({ error: 'blood_group and hospital are required' });

  const location = lat && lng ? `SRID=4326;POINT(${lng} ${lat})` : null;

  const { rows } = await db.query(`
    INSERT INTO blood_requests (requester_id, blood_group, units_needed, hospital, location, address, urgency, notes, patient_name, contact_phone)
    VALUES ($1,$2,$3,$4,ST_GeogFromText($5),$6,$7,$8,$9,$10)
    RETURNING *
  `, [req.user.id, blood_group, units_needed||1, hospital, location, address||null, urgency||'moderate', notes||null, patient_name||null, contact_phone||null]);

  const request = rows[0];

  // Run AI matching and notify donors async
  if (lat && lng) {
    setImmediate(async () => {
      try {
        const matched = await smartMatch({ ...request, lat: parseFloat(lat), lng: parseFloat(lng) });
        const donorIds = matched.map(d => d.donor_id);

        await db.query(`
          INSERT INTO ai_match_logs (request_id, matched_donors) VALUES ($1,$2)
        `, [request.id, JSON.stringify(matched)]);

        await sendNotificationToUsers(donorIds, {
          type: 'request_match',
          title: `🩸 Blood needed: ${blood_group}`,
          body: `${hospital} needs ${units_needed} unit(s) of ${blood_group}. Urgency: ${urgency}.`,
          data: { request_id: request.id },
        });
      } catch (e) { console.error('Matching error:', e); }
    });
  }

  res.status(201).json(request);
}));

// GET /api/requests - list active requests (with optional filters)
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { blood_group, urgency, status = 'active', lat, lng, radius_km = 20, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let where = ['r.status=$1'];
  let params = [status];
  let idx = 2;

  if (blood_group) { where.push(`r.blood_group=$${idx++}`); params.push(blood_group); }
  if (urgency)     { where.push(`r.urgency=$${idx++}`);     params.push(urgency); }
  if (lat && lng)  {
    where.push(`ST_DWithin(r.location, ST_GeogFromText('SRID=4326;POINT(${parseFloat(lng)} ${parseFloat(lat)})'), ${parseFloat(radius_km)*1000})`);
  }

  const { rows } = await db.query(`
    SELECT r.*, u.name AS requester_name, u.phone AS requester_phone,
      ${lat && lng ? `ROUND(ST_Distance(r.location, ST_GeogFromText('SRID=4326;POINT(${parseFloat(lng)} ${parseFloat(lat)})'))/1000,1)` : 'NULL'} AS distance_km
    FROM blood_requests r
    JOIN users u ON u.id = r.requester_id
    WHERE ${where.join(' AND ')}
    ORDER BY CASE r.urgency WHEN 'critical' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END, r.created_at DESC
    LIMIT $${idx} OFFSET $${idx+1}
  `, [...params, parseInt(limit), offset]);

  res.json({ requests: rows, page: parseInt(page), total: rows.length });
}));

// GET /api/requests/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await db.query(`
    SELECT r.*, u.name AS requester_name,
      (SELECT COUNT(*) FROM request_responses WHERE request_id=r.id AND status IN ('confirmed','donated')) AS response_count,
      (SELECT JSON_AGG(json_build_object('donor_id',rr.donor_id,'donor_name',d.name,'status',rr.status,'eta',rr.eta_minutes))
       FROM request_responses rr JOIN users d ON d.id=rr.donor_id WHERE rr.request_id=r.id) AS responses
    FROM blood_requests r JOIN users u ON u.id=r.requester_id WHERE r.id=$1
  `, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Request not found' });
  res.json(rows[0]);
}));

// POST /api/requests/:id/respond - donor responds
router.post('/:id/respond', authenticate, asyncHandler(async (req, res) => {
  const { eta_minutes, message } = req.body;
  const { rows } = await db.query(`
    INSERT INTO request_responses (request_id, donor_id, eta_minutes, message)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT (request_id, donor_id) DO UPDATE SET status='pending', eta_minutes=$3, message=$4
    RETURNING *
  `, [req.params.id, req.user.id, eta_minutes||null, message||null]);

  // Notify requester
  const reqData = await db.query('SELECT requester_id, blood_group, hospital FROM blood_requests WHERE id=$1', [req.params.id]);
  if (reqData.rows[0]) {
    await sendNotificationToUsers([reqData.rows[0].requester_id], {
      type: 'donor_responded',
      title: '✅ A donor is responding!',
      body: `${req.user.name} (${req.user.blood_group}) will reach in ~${eta_minutes} min.`,
      data: { request_id: req.params.id },
    });
  }

  res.status(201).json(rows[0]);
}));

// PATCH /api/requests/:id - update status
router.patch('/:id', authenticate, asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { rows } = await db.query(
    'UPDATE blood_requests SET status=$1 WHERE id=$2 AND requester_id=$3 RETURNING *',
    [status, req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Request not found or unauthorized' });
  res.json(rows[0]);
}));

module.exports = router;
