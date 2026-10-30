// Agripath_Backend-main Groq/routes/fertilizerRoutes.js
import express from 'express';
import { 
  getFertilizerCategories, 
  getFertilizerProducts, 
  getZonesByCountry, 
  calculateOllamaMatchEngine 
} from '../controllers/match/fertilizerMatchEngine.js';

const router = express.Router();

// 1. Categories Endpoint
router.get('/categories', getFertilizerCategories);

// 2. Products Endpoint (supports query param or URL param)
router.get('/products/:category', (req, res, next) => {
  req.query.category = req.params.category;
  return getFertilizerProducts(req, res, next);
});
router.get('/products', getFertilizerProducts);

// 3. Zones Endpoint (supports query param or URL param)
router.get('/zones/:country', (req, res, next) => {
  req.query.country = req.params.country;
  return getZonesByCountry(req, res, next);
});
router.get('/zones', getZonesByCountry);

// 4. Precision Match Ranking Endpoint
router.post('/calculate-match', calculateOllamaMatchEngine);

export default router;