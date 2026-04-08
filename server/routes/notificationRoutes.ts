import { Router } from 'express';
import * as notificationController from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, notificationController.getNotifications);
router.get('/unread-count', authenticateToken, notificationController.getUnreadCount);
router.post('/:id/read', authenticateToken, notificationController.markAsRead);
router.post('/read-all', authenticateToken, notificationController.markAllAsRead);

export default router;
