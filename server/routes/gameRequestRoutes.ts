import { Router } from 'express';
import * as gameRequestController from '../controllers/gameRequestController';
import { authenticateToken, requireRegisteredUser } from '../middleware/auth';

const router = Router();

router.post('/', authenticateToken, requireRegisteredUser, gameRequestController.createGameRequest);
router.get('/:id', authenticateToken, gameRequestController.getGameRequestById);
router.post('/:id/join', authenticateToken, requireRegisteredUser, gameRequestController.joinGameRequest);
router.post('/:id/cancel', authenticateToken, requireRegisteredUser, gameRequestController.cancelGameRequest);
router.post('/:id/leave', authenticateToken, requireRegisteredUser, gameRequestController.leaveGameRequest);
router.post('/:id/start', authenticateToken, requireRegisteredUser, gameRequestController.startGameRequest);

export default router;
