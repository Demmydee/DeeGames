import { Router } from 'express';
import * as voiceController from '../controllers/voiceController';
import { authenticateToken, requireRegisteredUser } from '../middleware/auth';

const router = Router();

router.get('/matches/:matchId/session', authenticateToken, requireRegisteredUser, voiceController.getMatchVoiceSession);

export default router;
