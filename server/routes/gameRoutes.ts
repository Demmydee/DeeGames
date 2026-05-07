import { Router } from 'express';
import * as gameController from '../controllers/gameController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/:matchId/draw-offer/accept', authenticateToken, gameController.acceptDrawOffer);
router.post('/:matchId/draw-offer/decline', authenticateToken, gameController.declineDrawOffer);
router.post('/:matchId/draw-offer', authenticateToken, gameController.createDrawOffer);
router.get('/:matchId/state', authenticateToken, gameController.getGameState);
router.post('/:matchId/move', authenticateToken, gameController.processMove);
router.get('/:matchId/result', authenticateToken, gameController.getMatchResult);
router.post('/:matchId/heartbeat', authenticateToken, gameController.recordHeartbeat);
router.post('/:matchId/leave', authenticateToken, gameController.leaveMatch);

// Debug 404s within game routes
router.all('*', (req, res) => {
  console.log(`404 Game Route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `Not Found: ${req.method} ${req.originalUrl}` });
});

export default router;
