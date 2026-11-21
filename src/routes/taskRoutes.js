import express from 'express';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  addComment,
  toggleSubtask,
  addSubtask,
} from '../controllers/taskController.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

router.get('/', getTasks);
router.get('/:id', getTaskById);
router.post('/', requireRole('Owner', 'Admin', 'Editor'), createTask);
router.put('/:id', requireRole('Owner', 'Admin', 'Editor'), updateTask);
router.delete('/:id', requireRole('Owner', 'Admin'), deleteTask);
router.post('/:id/comments', addComment);
router.put('/:id/subtasks/:subtaskId', requireRole('Owner', 'Admin', 'Editor'), toggleSubtask);
router.post('/:id/subtasks', requireRole('Owner', 'Admin', 'Editor'), addSubtask);

export default router;
