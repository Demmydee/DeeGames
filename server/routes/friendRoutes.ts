import { Router } from 'express';
import * as friendController from '../controllers/friendController';
import { authenticateToken, requireRegisteredUser } from '../middleware/auth';

const router = Router();

router.post('/request', authenticateToken, requireRegisteredUser, friendController.sendFriendRequest);
router.post('/:id/accept', authenticateToken, requireRegisteredUser, friendController.acceptFriendRequest);
router.post('/:id/reject', authenticateToken, requireRegisteredUser, friendController.rejectFriendRequest);
router.post('/:id/remove', authenticateToken, requireRegisteredUser, friendController.removeFriend);
router.get('/', authenticateToken, requireRegisteredUser, friendController.getFriends);
router.get('/requests/incoming', authenticateToken, requireRegisteredUser, friendController.getIncomingRequests);
router.get('/requests/outgoing', authenticateToken, requireRegisteredUser, friendController.getOutgoingRequests);

export default router;
