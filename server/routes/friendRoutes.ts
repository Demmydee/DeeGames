import { Router } from 'express';
import * as friendController from '../controllers/friendController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/request', authenticateToken, friendController.sendFriendRequest);
router.post('/:id/accept', authenticateToken, friendController.acceptFriendRequest);
router.post('/:id/reject', authenticateToken, friendController.rejectFriendRequest);
router.post('/:id/remove', authenticateToken, friendController.removeFriend);
router.get('/', authenticateToken, friendController.getFriends);
router.get('/requests/incoming', authenticateToken, friendController.getIncomingRequests);
router.get('/requests/outgoing', authenticateToken, friendController.getOutgoingRequests);

export default router;
