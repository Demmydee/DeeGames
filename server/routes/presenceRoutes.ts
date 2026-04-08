import { Router } from 'express';
import * as presenceController from '../controllers/presenceController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/ping', authenticateToken, presenceController.ping);

export default router;
