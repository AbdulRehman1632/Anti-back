import express from 'express';
import { getMessages, createMessage, addReaction } from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getMessages);
router.post('/', createMessage);
router.post('/:id/react', addReaction);

export default router;
