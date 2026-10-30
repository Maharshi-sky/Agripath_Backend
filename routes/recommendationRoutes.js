// routes/recommendationRoutes.js
import express from 'express';
import { getVendorRecommendations, getSeedRecommendations } from '../controllers/recommendationController.js';

const router = express.Router();

// 1. Root vendor recommendation endpoint
if (typeof getVendorRecommendations === 'function') {
  router.post('/', getVendorRecommendations);
}

// 2. Alternative seed country recommendations (80%+ Alternative Markets)
if (typeof getSeedRecommendations === 'function') {
  router.post('/seed-recommendations', getSeedRecommendations);
}

export default router;