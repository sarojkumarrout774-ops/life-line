/**
 * LifeDrop Smart Matching Engine
 * AI-powered donor-request matching algorithm
 */
const db = require('../config/db');

const BLOOD_COMPATIBILITY = {
  'O-': ['O-'],
  'O+': ['O-','O+'],
  'A-': ['O-','A-'],
  'A+': ['O-','O+','A-','A+'],
  'B-': ['O-','B-'],
  'B+': ['O-','O+','B-','B+'],
  'AB-': ['O-','A-','B-','AB-'],
  'AB+': ['O-','O+','A-','A+','B-','B+','AB-','AB+'],
};

/**
 * Calculate a donor's match score for a given request
 * Score = distance_score + availability_bonus + recency_score + response_history_bonus
 */
function calculateScore({ distanceKm, isAvailable, daysSinceLastDonation, responseRate, urgency }) {
  // Distance: inverse — closer = higher score (max 40 points)
  const distanceScore = isAvailable ? Math.max(0, 40 - distanceKm * 2) : 0;

  // Availability (20 points)
  const availabilityBonus = isAvailable ? 20 : 0;

  // Days since last donation (max 25 points) — longer gap = more likely eligible & motivated
  const daysCapped = Math.min(daysSinceLastDonation || 0, 365);
  const recencyScore = daysCapped >= 90 ? Math.min(25, (daysCapped - 90) / 10) : 0;

  // Historical response rate (max 15 points)
  const responseBonus = Math.min(15, (responseRate || 0) * 15);

  // Urgency multiplier
  const multiplier = urgency === 'critical' ? 1.3 : urgency === 'moderate' ? 1.1 : 1.0;

  return Math.round((distanceScore + availabilityBonus + recencyScore + responseBonus) * multiplier);
}

/**
 * Main matching function
 * @param {Object} request - blood request with blood_group, lat, lng, urgency
 * @returns {Array} top matched donors with scores
 */
async function smartMatch(request) {
  const { blood_group, lat, lng, urgency = 'moderate', radius_km = 25 } = request;
  const compatible = BLOOD_COMPATIBILITY[blood_group] || [blood_group];

  // Fetch candidate donors
  const { rows: donors } = await db.query(`
    SELECT
      u.id AS donor_id,
      u.name,
      u.blood_group,
      u.is_available,
      u.fcm_token,
      ROUND(ST_Distance(u.location, ST_GeogFromText('SRID=4326;POINT(${parseFloat(lng)} ${parseFloat(lat)})'))/1000, 2) AS distance_km,
      COALESCE(
        EXTRACT(EPOCH FROM (NOW() - MAX(d.donated_at))) / 86400,
        999
      ) AS days_since_donation,
      COALESCE(
        COUNT(rr.id) FILTER (WHERE rr.status IN ('donated','confirmed'))::float /
        NULLIF(COUNT(rr.id), 0),
        0.5
      ) AS response_rate
    FROM users u
    LEFT JOIN donations d ON d.donor_id = u.id
    LEFT JOIN request_responses rr ON rr.donor_id = u.id
    WHERE u.role IN ('donor','both')
      AND u.blood_group = ANY($1::varchar[])
      AND ST_DWithin(u.location, ST_GeogFromText('SRID=4326;POINT(${parseFloat(lng)} ${parseFloat(lat)})'), $2)
    GROUP BY u.id
    LIMIT 100
  `, [compatible, radius_km * 1000]);

  // Score each donor
  const scored = donors.map(donor => ({
    donor_id: donor.donor_id,
    name: donor.name,
    blood_group: donor.blood_group,
    distance_km: parseFloat(donor.distance_km),
    is_available: donor.is_available,
    days_since_donation: Math.floor(parseFloat(donor.days_since_donation)),
    fcm_token: donor.fcm_token,
    score: calculateScore({
      distanceKm: parseFloat(donor.distance_km),
      isAvailable: donor.is_available,
      daysSinceLastDonation: parseFloat(donor.days_since_donation),
      responseRate: parseFloat(donor.response_rate),
      urgency,
    }),
  }));

  // Sort by score descending, return top 10
  return scored.sort((a, b) => b.score - a.score).slice(0, 10);
}

/**
 * Predict donation likelihood for a single donor/request pair
 */
function predictDonationLikelihood({ distanceKm, daysSince, isAvailable, responseRate }) {
  if (!isAvailable || daysSince < 90) return 0;
  const base = 0.5;
  const distFactor = Math.max(0, 1 - distanceKm / 30);
  const histFactor = responseRate || 0.5;
  return Math.min(0.99, base + distFactor * 0.3 + histFactor * 0.2).toFixed(2);
}

module.exports = { smartMatch, calculateScore, predictDonationLikelihood, BLOOD_COMPATIBILITY };
