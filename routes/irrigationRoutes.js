// routes/irrigationRoutes.js
import express from 'express';
import {
  calculateCountryIrrigationRecommendation,
  getCropWaterRequirements,
  evaluateIrrigationMatch
} from '../controllers/match/irrigationMatchEngine.js';

const router = express.Router();

// 1. Primary Recommendation Endpoint (POST)
router.post('/country-recommendation', calculateCountryIrrigationRecommendation);
router.post('/calculate-match', calculateCountryIrrigationRecommendation);
router.post('/match', calculateCountryIrrigationRecommendation);

// 2. Crop Water Requirements (GET)
router.get('/crop-water-requirements', getCropWaterRequirements);

// 3. Zone by Zone payload evaluation
router.post('/evaluate-zones', async (req, res) => {
  try {
    const result = await evaluateIrrigationMatch(req.body);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;