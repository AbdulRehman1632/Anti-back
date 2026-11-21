import express from 'express';
import {
  getCustomFields,
  createCustomField,
  updateCustomField,
  deleteCustomField,
} from '../controllers/customFieldController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getCustomFields);
router.post('/', createCustomField);
router.put('/:id', updateCustomField);
router.delete('/:id', deleteCustomField);

export default router;

