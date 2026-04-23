import { Router } from 'express';
import * as gameController from '../controllers/gameController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/:matchId/state', authenticateToken, gameController.getGameState);
router.post('/:matchId/move', authenticateToken, gameController.processMove);
router.get('/:matchId/result', authenticateToken, gameController.getMatchResult);
router.post('/:matchId/heartbeat', authenticateToken, gameController.recordHeartbeat);
router.post('/:matchId/leave', authenticateToken, gameController.leaveMatch);
router.post('/:matchId/draw-offer', authenticateToken, gameController.createDrawOffer);
router.post('/:matchId/draw-offer/accept', authenticateToken, gameController.acceptDrawOffer);
router.post('/:matchId/draw-offer/decline', authenticateToken, gameController.declineDrawOffer);

export default router;
