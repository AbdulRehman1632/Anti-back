import express from 'express';
import { getUsers, updateUserRole, createCredentials } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

router.get('/', getUsers);
router.put('/role', requireRole('Owner', 'Admin'), updateUserRole);
router.post('/credentials', requireRole('Owner', 'Admin'), createCredentials);

export default router;
