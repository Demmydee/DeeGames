import { Router } from 'express';
import * as reportController from '../controllers/reportController';
import { authenticateToken, requireRegisteredUser } from '../middleware/auth';

const router = Router();

router.post('/player', authenticateToken, requireRegisteredUser, reportController.submitReport);
router.get('/my', authenticateToken, requireRegisteredUser, reportController.getMyReports);

export default router;
