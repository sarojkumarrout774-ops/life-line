const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendNotificationToUsers } = require('../services/notificationService');

const router = express.Router();

// POST /api/sos - broadcast emergency
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { blood_group, lat, lng, hospital, message, radius_km = 15 } = req.body;
  if (!blood_group || !lat || !lng) return res.status(400).json({ error: 'blood_group, lat, lng required' });

  const location = `SRID=4326;POINT(${lng} ${lat})`;

  const { rows } = await db.query(`
    INSERT INTO sos_alerts (requester_id, blood_group, location, hospital, message, radius_km)
    VALUES ($1,$2,ST_GeogFromText($3),$4,$5,$6) RETURNING *
  `, [req.user.id, blood_group, location, hospital||null, message||null, radius_km]);

  const sos = rows[0];

  // Find ALL nearby donors of matching blood group
  const compatible = getCompatibleGroups(blood_group);
  const donors = await db.query(`
    SELECT id FROM users
    WHERE role IN ('donor','both')
      AND is_available = TRUE
      AND blood_group = ANY($1::varchar[])
      AND id != $2
      AND ST_DWithin(location, ST_GeogFromText($3), $4)
  `, [compatible, req.user.id, location, radius_km * 1000]);

  const donorIds = donors.rows.map(d => d.id);

  await db.query('UPDATE sos_alerts SET donors_alerted=$1 WHERE id=$2', [donorIds.length, sos.id]);

  // Send push + socket notifications
  const io = req.app.get('io');
  io.emit('sos_alert', {
    sos_id: sos.id,
    blood_group,
    hospital,
    message,
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    requester: req.user.name,
  });

  await sendNotificationToUsers(donorIds, {
    type: 'sos_alert',
    title: `🚨 EMERGENCY: ${blood_group} needed`,
    body: `${hospital || 'Nearby location'} urgently needs blood. Tap to respond.`,
    data: { sos_id: sos.id, blood_group, lat, lng },
  });

  res.status(201).json({ ...sos, donors_alerted: donorIds.length });
}));

// GET /api/sos/active - list active SOS alerts nearby
router.get('/active', authenticate, asyncHandler(async (req, res) => {
  const { lat, lng, radius_km = 20 } = req.query;
  const { rows } = await db.query(`
    SELECT s.*, u.name AS requester_name
    FROM sos_alerts s JOIN users u ON u.id = s.requester_id
    WHERE s.status = 'active'
      AND s.created_at > NOW() - INTERVAL '2 hours'
      ${lat && lng ? `AND ST_DWithin(s.location, ST_GeogFromText('SRID=4326;POINT(${parseFloat(lng)} ${parseFloat(lat)})'), ${parseFloat(radius_km)*1000})` : ''}
    ORDER BY s.created_at DESC
  `);
  res.json({ alerts: rows });
}));

// POST /api/sos/:id/resolve
router.post('/:id/resolve', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `UPDATE sos_alerts SET status='resolved', resolved_at=NOW() WHERE id=$1 AND requester_id=$2 RETURNING *`,
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'SOS not found' });
  res.json(rows[0]);
}));

function getCompatibleGroups(bloodGroup) {
  const compatibility = {
    'O-': ['O-'],
    'O+': ['O-','O+'],
    'A-': ['O-','A-'],
    'A+': ['O-','O+','A-','A+'],
    'B-': ['O-','B-'],
    'B+': ['O-','O+','B-','B+'],
    'AB-': ['O-','A-','B-','AB-'],
    'AB+': ['O-','O+','A-','A+','B-','B+','AB-','AB+'],
  };
  return compatibility[bloodGroup] || [bloodGroup];
}

module.exports = router;
