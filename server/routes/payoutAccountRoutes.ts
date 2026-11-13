import { Router } from 'express';
import * as payoutAccountController from '../controllers/payoutAccountController';
import { authenticateToken as authenticate, requireRegisteredUser } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, requireRegisteredUser, payoutAccountController.createPayoutAccount);
router.get('/', authenticate, requireRegisteredUser, payoutAccountController.getPayoutAccounts);
router.put('/:id', authenticate, requireRegisteredUser, payoutAccountController.updatePayoutAccount);
router.delete('/:id', authenticate, requireRegisteredUser, payoutAccountController.deletePayoutAccount);

export default router;
