import express from 'express';
import {
  getCropGroups,
  getCropsByGroup,
  getVarietiesByCrop,
  getVarietyDetails,
} from '../controllers/cropController.js';

const router = express.Router();

router.get('/groups', getCropGroups);
router.get('/names', getCropsByGroup);
router.get('/varieties', getVarietiesByCrop);
router.get('/details', getVarietyDetails);

export default router;