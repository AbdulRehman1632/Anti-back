import express from 'express';
import {
  getWorkspace,
  updateWorkspace,
  inviteMember,
  getSidebarNav,
  createSection,
  updateSection,
  deleteSection,
  createTab,
  updateTab,
  updateTabPermissions,
  deleteTab,
} from '../controllers/workspaceController.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

// Workspace core
router.get('/', getWorkspace);
router.put('/:id', requireRole('Owner', 'Admin'), updateWorkspace);
router.post('/invite', requireRole('Owner', 'Admin'), inviteMember);

// Dynamic Sidebar Navigation CRUD
router.get('/sidebar', getSidebarNav);
router.post('/sidebar/sections', requireRole('Owner', 'Admin'), createSection);
router.put('/sidebar/sections/:id', requireRole('Owner', 'Admin'), updateSection);
router.delete('/sidebar/sections/:id', requireRole('Owner', 'Admin'), deleteSection);

router.post('/sidebar/tabs', requireRole('Owner', 'Admin'), createTab);
router.put('/sidebar/tabs/:id', requireRole('Owner', 'Admin'), updateTab);
router.put('/sidebar/tabs/:id/permissions', requireRole('Owner', 'Admin'), updateTabPermissions);
router.delete('/sidebar/tabs/:id', requireRole('Owner', 'Admin'), deleteTab);

export default router;
