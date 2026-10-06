// routes/regulatoryRoutes.js
import express from 'express';
import {
  getRegulatoryPathway,
  getRegulatorySources,
  getRegulatoryUpdates,
  getSeedRegulatoryDirect,
  getBioRegulatoryDirect,
  getCropProtectionRegulatoryDirect,
  getFertilizerRegulatoryDirect,
  getMachineryRegulatoryDirect,
} from '../controllers/regulatoryController.js';

const router = express.Router();

// 1. Unified Master Dispatcher Endpoints (Frontend default routes)
router.post('/', getRegulatoryPathway);
router.post('/pathway', getRegulatoryPathway);
router.post('/regulatory-pathway', getRegulatoryPathway);

// 2. Direct Category-Specific Endpoints (Bifurcated routes)
router.post('/seeds', getSeedRegulatoryDirect);
router.post('/bio', getBioRegulatoryDirect);
router.post('/crop-protection', getCropProtectionRegulatoryDirect);
router.post('/fertilizers', getFertilizerRegulatoryDirect);
router.post('/machinery', getMachineryRegulatoryDirect);

// 3. Metadata & Source Endpoints
router.get('/sources', getRegulatorySources);
router.get('/updates', getRegulatoryUpdates);

export default router;