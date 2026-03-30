import { Router } from 'express';
import * as kycController from '../controllers/kycController';
import { authenticateToken as authenticate } from '../middleware/auth';

const router = Router();

router.get('/status', authenticate, kycController.getKycStatus);

export default router;
