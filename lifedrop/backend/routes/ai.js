const express = require('express');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { smartMatch, predictDonationLikelihood } = require('../ai/matchingEngine');

const router = express.Router();

// POST /api/ai/match - run smart matching for a request
router.post('/match', authenticate, asyncHandler(async (req, res) => {
  const { blood_group, lat, lng, urgency, radius_km } = req.body;
  if (!blood_group || !lat || !lng) return res.status(400).json({ error: 'blood_group, lat, lng required' });
  const matches = await smartMatch({ blood_group, lat: parseFloat(lat), lng: parseFloat(lng), urgency, radius_km });
  res.json({ matches, count: matches.length });
}));

// POST /api/ai/predict - predict donation likelihood
router.post('/predict', authenticate, asyncHandler(async (req, res) => {
  const { distance_km, days_since, is_available, response_rate } = req.body;
  const likelihood = predictDonationLikelihood({
    distanceKm: distance_km, daysSince: days_since, isAvailable: is_available, responseRate: response_rate
  });
  res.json({ likelihood: parseFloat(likelihood), percent: Math.round(likelihood * 100) });
}));

module.exports = router;
