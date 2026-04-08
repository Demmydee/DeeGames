import { Router } from 'express';
import * as chatController from '../controllers/chatController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/rooms/:roomId/messages', authenticateToken, chatController.getRoomMessages);
router.post('/rooms/:roomId/messages', authenticateToken, chatController.sendRoomMessage);
router.get('/matches/:matchId/messages', authenticateToken, chatController.getMatchMessages);
router.post('/matches/:matchId/messages', authenticateToken, chatController.sendMatchMessage);

export default router;
