import { Router } from 'express';
import * as payoutAccountController from '../controllers/payoutAccountController';
import { authenticateToken as authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, payoutAccountController.createPayoutAccount);
router.get('/', authenticate, payoutAccountController.getPayoutAccounts);
router.put('/:id', authenticate, payoutAccountController.updatePayoutAccount);
router.delete('/:id', authenticate, payoutAccountController.deletePayoutAccount);

export default router;
