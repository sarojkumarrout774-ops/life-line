const db = require('../config/db');

// Initialize Firebase Admin only if credentials are provided
let firebaseAdmin = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const admin = require('firebase-admin');
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    firebaseAdmin = admin;
  }
} catch (e) { console.warn('Firebase not configured:', e.message); }

/**
 * Send push notification + store in DB
 */
async function sendNotificationToUsers(userIds, { type, title, body, data = {} }) {
  if (!userIds?.length) return;

  // Store in DB
  const values = userIds.map((_, i) => `($${i*5+1},$${i*5+2},$${i*5+3},$${i*5+4},$${i*5+5})`).join(',');
  const params = userIds.flatMap(uid => [uid, type, title, body, JSON.stringify(data)]);
  await db.query(
    `INSERT INTO notifications (user_id, type, title, body, data) VALUES ${values}`,
    params
  );

  // Send FCM push if Firebase configured
  if (firebaseAdmin) {
    const tokens = await db.query(
      'SELECT fcm_token FROM users WHERE id = ANY($1) AND fcm_token IS NOT NULL',
      [userIds]
    );
    const fcmTokens = tokens.rows.map(r => r.fcm_token).filter(Boolean);
    if (fcmTokens.length) {
      await firebaseAdmin.messaging().sendEachForMulticast({
        tokens: fcmTokens,
        notification: { title, body },
        data: Object.fromEntries(Object.entries(data).map(([k,v]) => [k, String(v)])),
        android: { priority: type === 'sos_alert' ? 'high' : 'normal' },
      });
    }
  }
}

module.exports = { sendNotificationToUsers };
