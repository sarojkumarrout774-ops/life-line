const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { strictLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// ── Register ───────────────────────────────────────────────
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('blood_group').isIn(['A+','A-','B+','B-','AB+','AB-','O+','O-']).withMessage('Invalid blood group'),
  body('role').isIn(['donor','receiver','both']).withMessage('Invalid role'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, phone, password, blood_group, role, lat, lng, city, state } = req.body;

  const existing = await db.query('SELECT id FROM users WHERE phone=$1 OR email=$2', [phone, email || '']);
  if (existing.rows.length) return res.status(409).json({ error: 'Phone or email already registered' });

  const password_hash = await bcrypt.hash(password, 12);
  const location = lat && lng ? `SRID=4326;POINT(${lng} ${lat})` : null;

  const { rows } = await db.query(`
    INSERT INTO users (name, email, phone, password_hash, role, blood_group, location, city, state)
    VALUES ($1,$2,$3,$4,$5,$6,ST_GeogFromText($7),$8,$9)
    RETURNING id, name, email, phone, role, blood_group, points, is_available
  `, [name, email||null, phone, password_hash, role, blood_group, location, city||null, state||null]);

  const token = jwt.sign({ userId: rows[0].id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.status(201).json({ user: rows[0], token });
}));

// ── Login ──────────────────────────────────────────────────
router.post('/login', strictLimiter, [
  body('phone').notEmpty(),
  body('password').notEmpty(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { phone, email, password } = req.body;
  const identifier = phone || email;

  const { rows } = await db.query(
    'SELECT * FROM users WHERE phone=$1 OR email=$1', [identifier]
  );
  if (!rows[0]) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, rows[0].password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: rows[0].id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  const { password_hash, ...user } = rows[0];
  res.json({ user, token });
}));

// ── Refresh Token ─────────────────────────────────────────
router.post('/refresh', asyncHandler(async (req, res) => {
  const { token } = req.body;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const newToken = jwt.sign({ userId: decoded.userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.json({ token: newToken });
}));

module.exports = router;
