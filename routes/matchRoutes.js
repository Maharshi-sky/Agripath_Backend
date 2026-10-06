// routes/matchRoutes.js
import express from 'express';
import { getMatchScore, calculateMatchScore } from '../controllers/matchController.js';

const router = express.Router();

// Unified multi-category match score endpoint (Seeds, Bio, Protection, Fertilizers, Machinery)
router.post('/match-score', calculateMatchScore || getMatchScore);
router.post('/', calculateMatchScore || getMatchScore);

// Backward compatibility: If any client calls bio-match-score
router.post('/bio-match-score', calculateMatchScore || getMatchScore);

export default router;