import { Router } from 'express';
import * as socialController from '../controllers/socialController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/recent-opponents', authenticateToken, socialController.getRecentOpponents);

export default router;
