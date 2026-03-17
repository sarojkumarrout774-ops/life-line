const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/chat/conversations
router.get('/conversations', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await db.query(`
    SELECT DISTINCT ON (LEAST(sender_id,receiver_id), GREATEST(sender_id,receiver_id))
      m.id, m.content, m.sent_at, m.is_read,
      CASE WHEN m.sender_id=$1 THEN m.receiver_id ELSE m.sender_id END AS other_user_id,
      u.name AS other_name, u.blood_group AS other_blood_group, u.avatar_url
    FROM messages m
    JOIN users u ON u.id = CASE WHEN m.sender_id=$1 THEN m.receiver_id ELSE m.sender_id END
    WHERE m.sender_id=$1 OR m.receiver_id=$1
    ORDER BY LEAST(sender_id,receiver_id), GREATEST(sender_id,receiver_id), m.sent_at DESC
  `, [req.user.id]);
  res.json({ conversations: rows });
}));

// GET /api/chat/:userId - message thread
router.get('/:userId', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await db.query(`
    SELECT m.*, u.name AS sender_name
    FROM messages m JOIN users u ON u.id = m.sender_id
    WHERE (m.sender_id=$1 AND m.receiver_id=$2) OR (m.sender_id=$2 AND m.receiver_id=$1)
    ORDER BY m.sent_at ASC LIMIT 100
  `, [req.user.id, req.params.userId]);
  // Mark as read
  await db.query('UPDATE messages SET is_read=TRUE WHERE receiver_id=$1 AND sender_id=$2', [req.user.id, req.params.userId]);
  res.json({ messages: rows });
}));

// POST /api/chat/:userId
router.post('/:userId', authenticate, asyncHandler(async (req, res) => {
  const { content, request_id } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Message cannot be empty' });
  const { rows } = await db.query(`
    INSERT INTO messages (sender_id, receiver_id, content, request_id)
    VALUES ($1,$2,$3,$4) RETURNING *
  `, [req.user.id, req.params.userId, content.trim(), request_id||null]);
  // Emit via socket
  const io = req.app.get('io');
  io.to(req.params.userId).emit('new_message', { ...rows[0], sender_name: req.user.name });
  res.status(201).json(rows[0]);
}));

module.exports = router;
