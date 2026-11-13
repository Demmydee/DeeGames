import { Router } from 'express';
import * as socialController from '../controllers/socialController';
import { authenticateToken, requireRegisteredUser } from '../middleware/auth';

const router = Router();

router.get('/recent-opponents', authenticateToken, requireRegisteredUser, socialController.getRecentOpponents);
router.get('/search', authenticateToken, requireRegisteredUser, socialController.searchUsers);

export default router;
