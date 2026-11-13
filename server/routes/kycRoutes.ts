import { Router } from 'express';
import * as kycController from '../controllers/kycController';
import { authenticateToken as authenticate, requireRegisteredUser } from '../middleware/auth';

const router = Router();

router.get('/status', authenticate, requireRegisteredUser, kycController.getKycStatus);

export default router;
