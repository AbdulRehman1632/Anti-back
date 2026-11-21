import express from 'express';
import { login, register, getMe, updateStatus } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.get('/me', protect, getMe);
router.put('/status', protect, updateStatus);

export default router;
