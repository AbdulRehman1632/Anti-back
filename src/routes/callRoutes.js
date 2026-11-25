import express from 'express';
import {
  initiateCall,
  getIncomingCalls,
  getCallStatus,
  respondCall,
  endCall,
} from '../controllers/callController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.post('/initiate', initiateCall);
router.get('/incoming', getIncomingCalls);
router.get('/:callId', getCallStatus);
router.post('/:callId/respond', respondCall);
router.post('/:callId/end', endCall);

export default router;
