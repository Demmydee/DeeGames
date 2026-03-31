import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/status', authenticateToken, dashboardController.getDashboardStatus);

export default router;
