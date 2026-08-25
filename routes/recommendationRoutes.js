import express from 'express';
import { getVendorRecommendations } from '../controllers/recommendationController.js';

const router = express.Router();

router.post('/', getVendorRecommendations);

export default router;