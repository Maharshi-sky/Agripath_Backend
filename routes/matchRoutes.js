// agripath-backend/routes/matchRoutes.js
import express from 'express';
import { getMatchScore } from '../controllers/matchController.js';
import { getBioMatchScore } from '../controllers/bioMatchController.js'; // <- Naya dedicated bio controller

const router = express.Router();

// 1. Existing Crops & Seeds Route (Unchanged)
router.post('/match-score', getMatchScore);

// 2. Dedicated Biological Inputs Route
router.post('/bio-match-score', getBioMatchScore);

export default router;