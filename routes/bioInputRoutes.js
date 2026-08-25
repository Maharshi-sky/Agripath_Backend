import express from 'express';
import {
  getBioCropTypes,
  getBioCategories,
  getBioCompanies,
  getBioProducts,
} from '../controllers/bioInputController.js';

const router = express.Router();

router.get('/crops', getBioCropTypes);
router.get('/categories', getBioCategories);
router.get('/companies', getBioCompanies);
router.get('/products', getBioProducts);

export default router;