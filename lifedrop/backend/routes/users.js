const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const router = express.Router();

// GET /api/users/me
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await db.query(`
    SELECT u.id, u.name, u.email, u.phone, u.role, u.blood_group, u.city, u.state,
      u.is_available, u.is_verified, u.points, u.avatar_url, u.created_at,
      COUNT(DISTINCT d.id) AS total_donations,
      MAX(d.donated_at) AS last_donation,
      ARRAY_AGG(DISTINCT b.key) FILTER (WHERE b.key IS NOT NULL) AS badge_keys
    FROM users u
    LEFT JOIN donations d ON d.donor_id = u.id
    LEFT JOIN user_badges ub ON ub.user_id = u.id
    LEFT JOIN badges b ON b.id = ub.badge_id
    WHERE u.id = $1
    GROUP BY u.id
  `, [req.user.id]);
  res.json(rows[0]);
}));

// PATCH /api/users/me
router.patch('/me', authenticate, asyncHandler(async (req, res) => {
  const { name, email, city, state, lat, lng } = req.body;
  const location = lat && lng ? `ST_GeogFromText('SRID=4326;POINT(${lng} ${lat})')` : null;
  const { rows } = await db.query(`
    UPDATE users SET
      name = COALESCE($1, name),
      email = COALESCE($2, email),
      city = COALESCE($3, city),
      state = COALESCE($4, state)
      ${location ? `, location = ${location}` : ''}
    WHERE id = $5
    RETURNING id, name, email, phone, role, blood_group, city, state, is_available, points
  `, [name||null, email||null, city||null, state||null, req.user.id]);
  res.json(rows[0]);
}));

// GET /api/users/:id/badges
router.get('/:id/badges', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await db.query(`
    SELECT b.*, ub.earned_at FROM badges b
    LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.user_id = $1
    ORDER BY b.id
  `, [req.params.id]);
  res.json({ badges: rows });
}));

module.exports = router;
