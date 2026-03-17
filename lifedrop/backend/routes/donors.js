const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/donors/nearby?blood_group=O+&lat=17.38&lng=78.48&radius_km=10
router.get('/nearby', authenticate, asyncHandler(async (req, res) => {
  const { blood_group, lat, lng, radius_km = 10 } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });

  let query = `
    SELECT
      u.id, u.name, u.blood_group, u.is_available, u.city, u.avatar_url,
      ROUND(ST_Distance(u.location, ST_GeogFromText('SRID=4326;POINT(${parseFloat(lng)} ${parseFloat(lat)})'))/1000, 1) AS distance_km,
      (SELECT MAX(donated_at) FROM donations WHERE donor_id = u.id) AS last_donation,
      u.points
    FROM users u
    WHERE u.role IN ('donor','both')
      AND u.is_available = TRUE
      AND ST_DWithin(
        u.location,
        ST_GeogFromText('SRID=4326;POINT(${parseFloat(lng)} ${parseFloat(lat)})'),
        ${parseFloat(radius_km) * 1000}
      )
      ${blood_group ? `AND u.blood_group = '${blood_group}'` : ''}
    ORDER BY distance_km ASC
    LIMIT 50
  `;

  const { rows } = await db.query(query);
  res.json({ donors: rows, count: rows.length });
}));

// PUT /api/donors/:id/availability
router.put('/:id/availability', authenticate, asyncHandler(async (req, res) => {
  if (req.params.id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const { available, lat, lng } = req.body;

  const location = lat && lng ? `SRID=4326;POINT(${lng} ${lat})` : null;
  const updates = ['is_available=$1'];
  const values = [available];

  if (location) { updates.push(`location=ST_GeogFromText('${location}')`); }

  const { rows } = await db.query(`
    UPDATE users SET ${updates.join(',')} WHERE id=$2
    RETURNING id, is_available, updated_at
  `, [available, req.params.id]);

  res.json(rows[0]);
}));

// GET /api/donors/:id/profile
router.get('/:id/profile', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await db.query(`
    SELECT u.id, u.name, u.blood_group, u.city, u.is_available, u.points, u.avatar_url,
      COUNT(d.id) AS total_donations,
      MAX(d.donated_at) AS last_donation,
      ARRAY_AGG(b.name ORDER BY ub.earned_at DESC) FILTER (WHERE b.name IS NOT NULL) AS badges
    FROM users u
    LEFT JOIN donations d ON d.donor_id = u.id
    LEFT JOIN user_badges ub ON ub.user_id = u.id
    LEFT JOIN badges b ON b.id = ub.badge_id
    WHERE u.id=$1
    GROUP BY u.id
  `, [req.params.id]);

  if (!rows[0]) return res.status(404).json({ error: 'Donor not found' });
  res.json(rows[0]);
}));

module.exports = router;
