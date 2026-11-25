import express from 'express';
import {
  getChannels,
  getChannelById,
  createChannel,
  updateChannel,
  deleteChannel,
} from '../controllers/channelController.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

router.get('/', getChannels);
router.get('/:id', getChannelById);
router.post('/', requireRole('Owner', 'Admin'), createChannel);
router.put('/:id', requireRole('Owner', 'Admin'), updateChannel);
router.delete('/:id', requireRole('Owner', 'Admin'), deleteChannel);

export default router;
