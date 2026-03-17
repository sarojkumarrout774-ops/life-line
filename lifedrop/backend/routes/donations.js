const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { checkAndAwardBadges } = require('../services/badgeService');

const router = express.Router();

// POST /api/donations/confirm
router.post('/confirm', authenticate, asyncHandler(async (req, res) => {
  const { request_id, units, hospital, donated_at, notes } = req.body;

  // Enforce 90-day rule
  const last = await db.query(
    'SELECT donated_at FROM donations WHERE donor_id=$1 ORDER BY donated_at DESC LIMIT 1',
    [req.user.id]
  );
  if (last.rows[0]) {
    const daysSince = (Date.now() - new Date(last.rows[0].donated_at)) / (1000 * 60 * 60 * 24);
    if (daysSince < 90) {
      return res.status(400).json({
        error: 'You must wait 90 days between donations.',
        eligible_at: new Date(new Date(last.rows[0].donated_at).getTime() + 90 * 86400000),
      });
    }
  }

  const { rows } = await db.query(`
    INSERT INTO donations (donor_id, request_id, hospital, units, donated_at, notes)
    VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
  `, [req.user.id, request_id||null, hospital, units||1, donated_at||new Date(), notes||null]);

  // Award points
  await db.query('UPDATE users SET points = points + 50 WHERE id=$1', [req.user.id]);

  // Update request if linked
  if (request_id) {
    await db.query(`
      UPDATE blood_requests SET units_fulfilled = units_fulfilled + $1
      WHERE id=$2
    `, [units||1, request_id]);
    await db.query(`
      UPDATE request_responses SET status='donated', confirmed_at=NOW()
      WHERE request_id=$1 AND donor_id=$2
    `, [request_id, req.user.id]);
  }

  // Check badge eligibility
  setImmediate(() => checkAndAwardBadges(req.user.id));

  res.status(201).json({ ...rows[0], points_earned: 50 });
}));

// GET /api/donations/my - donor's history
router.get('/my', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await db.query(`
    SELECT d.*, br.hospital AS req_hospital, br.blood_group AS req_blood_group
    FROM donations d
    LEFT JOIN blood_requests br ON br.id = d.request_id
    WHERE d.donor_id = $1
    ORDER BY d.donated_at DESC
  `, [req.user.id]);
  res.json({ donations: rows });
}));

// GET /api/donations/eligibility
router.get('/eligibility', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    'SELECT donated_at FROM donations WHERE donor_id=$1 ORDER BY donated_at DESC LIMIT 1',
    [req.user.id]
  );

  if (!rows[0]) return res.json({ eligible: true, days_since: null, next_eligible: null });

  const daysSince = Math.floor((Date.now() - new Date(rows[0].donated_at)) / (1000 * 60 * 60 * 24));
  const eligible = daysSince >= 90;
  const next_eligible = eligible ? null : new Date(new Date(rows[0].donated_at).getTime() + 90 * 86400000);

  res.json({ eligible, days_since: daysSince, next_eligible, last_donation: rows[0].donated_at });
}));

module.exports = router;
