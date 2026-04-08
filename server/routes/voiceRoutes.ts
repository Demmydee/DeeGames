import { Router } from 'express';
import * as voiceController from '../controllers/voiceController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/matches/:matchId/session', authenticateToken, voiceController.getMatchVoiceSession);

export default router;
