// bloodBanks.js
const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const router = express.Router();

router.get('/nearby', authenticate, asyncHandler(async (req, res) => {
  const { lat, lng, radius_km = 20 } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
  const { rows } = await db.query(`
    SELECT *, ROUND(ST_Distance(location, ST_GeogFromText('SRID=4326;POINT(${parseFloat(lng)} ${parseFloat(lat)})'))/1000,1) AS distance_km
    FROM blood_banks
    WHERE ST_DWithin(location, ST_GeogFromText('SRID=4326;POINT(${parseFloat(lng)} ${parseFloat(lat)})'), ${parseFloat(radius_km)*1000})
    ORDER BY distance_km ASC LIMIT 20
  `);
  res.json({ blood_banks: rows });
}));

module.exports = router;
