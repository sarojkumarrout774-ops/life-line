const db = require('../config/db');
const { sendNotificationToUsers } = require('../services/notificationService');

// Run daily: remind donors who became eligible in the last 24h
async function checkEligibilityReminders() {
  console.log('[Scheduler] Checking eligibility reminders...');
  try {
    const { rows } = await db.query(`
      SELECT DISTINCT d.donor_id
      FROM donations d
      WHERE donated_at BETWEEN NOW() - INTERVAL '91 days' AND NOW() - INTERVAL '90 days'
        AND d.donor_id NOT IN (
          SELECT donor_id FROM donations WHERE donated_at > NOW() - INTERVAL '90 days'
        )
    `);
    if (rows.length) {
      const ids = rows.map(r => r.donor_id);
      await sendNotificationToUsers(ids, {
        type: 'eligibility_reminder',
        title: '🩸 You can donate again!',
        body: "It's been 90 days since your last donation. Someone nearby may need your help.",
        data: { action: 'open_requests' },
      });
      console.log(`[Scheduler] Sent eligibility reminders to ${ids.length} donors`);
    }
  } catch (e) {
    console.error('[Scheduler] Eligibility check failed:', e);
  }
}

// Run hourly: expire old requests
async function expireOldRequests() {
  console.log('[Scheduler] Expiring old requests...');
  try {
    const { rowCount } = await db.query(`
      UPDATE blood_requests
      SET status = 'expired'
      WHERE status = 'active' AND expires_at < NOW()
    `);
    if (rowCount) console.log(`[Scheduler] Expired ${rowCount} requests`);
  } catch (e) {
    console.error('[Scheduler] Expiry failed:', e);
  }
}

module.exports = { checkEligibilityReminders, expireOldRequests };
