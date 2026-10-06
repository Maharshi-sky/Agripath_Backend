// routes/bioInputRoutes.js
import express from 'express';
import {
  getBioCropTypes,
  getBioCategories,
  getBioCompanies,
  getBioProducts,
  getBioMatchScore
} from '../controllers/match/bioMatchEngine.js';

const router = express.Router();

// 1. Step 1 Cascading Dropdowns
router.get('/crops', getBioCropTypes);
router.get('/categories', getBioCategories);
router.get('/companies', getBioCompanies);
router.get('/products', getBioProducts);

// 2. Step 3 Specialized Match Analysis
router.post('/match', getBioMatchScore);
router.post('/calculate-match', getBioMatchScore);
router.post('/', getBioMatchScore);

export default router;