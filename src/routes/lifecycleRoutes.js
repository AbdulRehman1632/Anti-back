import express from 'express';
import { getLifecycleStages, createLifecycleStage, deleteLifecycleStage } from '../controllers/lifecycleController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);
router.get('/', getLifecycleStages);
router.post('/', createLifecycleStage);
router.delete('/:id', deleteLifecycleStage);
export default router;
