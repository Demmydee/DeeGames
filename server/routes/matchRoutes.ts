import { Router } from 'express';
import * as matchController from '../controllers/matchController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/active', authenticateToken, matchController.getUserActiveMatch);
router.get('/:id', authenticateToken, matchController.getMatchById);
router.post('/:id/presence', authenticateToken, matchController.updateMatchPresence);
router.post('/:id/leave', authenticateToken, matchController.leaveMatch);

export default router;
