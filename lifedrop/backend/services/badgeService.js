const db = require('../config/db');
const { sendNotificationToUsers } = require('./notificationService');

async function checkAndAwardBadges(userId) {
  const [donations, responses, badges] = await Promise.all([
    db.query('SELECT COUNT(*) AS cnt FROM donations WHERE donor_id=$1', [userId]),
    db.query(`SELECT COUNT(*) AS cnt FROM request_responses WHERE donor_id=$1 AND status IN ('donated','confirmed')`, [userId]),
    db.query('SELECT badge_id FROM user_badges WHERE user_id=$1', [userId]),
  ]);

  const earnedIds = new Set(badges.rows.map(b => b.badge_id));
  const donationCount = parseInt(donations.rows[0].cnt);
  const responseCount = parseInt(responses.rows[0].cnt);

  const { rows: allBadges } = await db.query('SELECT * FROM badges');
  const newBadges = [];

  for (const badge of allBadges) {
    if (earnedIds.has(badge.id)) continue;
    const cond = badge.condition;
    let earned = false;

    if (cond.type === 'donation_count' && donationCount >= cond.value) earned = true;
    if (cond.type === 'sos_response' && responseCount >= cond.value) earned = true;

    if (earned) {
      await db.query('INSERT INTO user_badges (user_id, badge_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, badge.id]);
      await db.query('UPDATE users SET points = points + $1 WHERE id=$2', [badge.points, userId]);
      newBadges.push(badge);
    }
  }

  if (newBadges.length) {
    await sendNotificationToUsers([userId], {
      type: 'badge_earned',
      title: `${newBadges[0].icon} Badge unlocked: ${newBadges[0].name}!`,
      body: newBadges[0].description,
      data: { badge_key: newBadges[0].key },
    });
  }

  return newBadges;
}

module.exports = { checkAndAwardBadges };
