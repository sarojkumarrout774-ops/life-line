const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/notifications
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM notifications WHERE user_id=$1 ORDER BY sent_at DESC LIMIT 50',
    [req.user.id]
  );
  const unread = rows.filter(n => !n.is_read).length;
  res.json({ notifications: rows, unread });
}));

// PATCH /api/notifications/read-all
router.patch('/read-all', authenticate, asyncHandler(async (req, res) => {
  await db.query('UPDATE notifications SET is_read=TRUE WHERE user_id=$1', [req.user.id]);
  res.json({ success: true });
}));

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, asyncHandler(async (req, res) => {
  await db.query('UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ success: true });
}));

// PUT /api/notifications/fcm-token
router.put('/fcm-token', authenticate, asyncHandler(async (req, res) => {
  const { fcm_token } = req.body;
  await db.query('UPDATE users SET fcm_token=$1 WHERE id=$2', [fcm_token, req.user.id]);
  res.json({ success: true });
}));

module.exports = router;
