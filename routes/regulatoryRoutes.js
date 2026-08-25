import express from 'express';
import {
  getRegulatoryPathway,
  getRegulatorySources,
  getRegulatoryUpdates,
} from '../controllers/regulatoryController.js';

const router = express.Router();

// Match root and explicit paths
router.post('/', getRegulatoryPathway);
router.post('/pathway', getRegulatoryPathway);
router.post('/regulatory-pathway', getRegulatoryPathway);

router.get('/sources', getRegulatorySources);
router.get('/updates', getRegulatoryUpdates);

export default router;