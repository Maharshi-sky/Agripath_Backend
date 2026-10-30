// Agripath_Backend-main Groq/routes/cropProtectionRoutes.js
import express from 'express';
import { 
  getCropProtectionChemicalTypes, 
  getCropProtectionProducts, 
  calculateCropProtectionMatch, 
  synthesizeCropProtectionZone 
} from '../controllers/match/cropProtectionMatchEngine.js';
import { calculateMatchScore, getMatchScore } from '../controllers/matchController.js';

const router = express.Router();

// 1. Step 1 Dropdown Endpoints (Fixes blank "Chemical Type *" dropdown)
router.get('/chemical-types', getCropProtectionChemicalTypes);
router.get('/categories', getCropProtectionChemicalTypes);

// 2. Products Endpoint
router.get('/products', getCropProtectionProducts);

// 3. Step 3 Match & Synthesis Endpoints
router.post('/calculate-match', calculateCropProtectionMatch);
router.post('/synthesize-zone', synthesizeCropProtectionZone);

// 4. Unified Master Pipeline Compatibility
const handleProtectionMatch = (req, res, next) => {
  req.body = { ...req.body, category: 'Crop Protection & Agrochem' };
  return (calculateMatchScore || getMatchScore)(req, res, next);
};

router.post('/match', handleProtectionMatch);
router.post('/', handleProtectionMatch);

export default router;