import { Router } from 'express';
import * as gameRequestController from '../controllers/gameRequestController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/', authenticateToken, gameRequestController.createGameRequest);
router.get('/:id', authenticateToken, gameRequestController.getGameRequestById);
router.post('/:id/join', authenticateToken, gameRequestController.joinGameRequest);
router.post('/:id/cancel', authenticateToken, gameRequestController.cancelGameRequest);
router.post('/:id/leave', authenticateToken, gameRequestController.leaveGameRequest);
router.post('/:id/start', authenticateToken, gameRequestController.startGameRequest);

export default router;
