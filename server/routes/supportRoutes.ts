import { Router } from 'express';
import * as supportController from '../controllers/supportController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/', authenticateToken, supportController.submitSupportTicket);
router.get('/my', authenticateToken, supportController.getMyTickets);

export default router;
