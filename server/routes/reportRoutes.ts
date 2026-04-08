import { Router } from 'express';
import * as reportController from '../controllers/reportController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/player', authenticateToken, reportController.submitReport);
router.get('/my', authenticateToken, reportController.getMyReports);

export default router;
