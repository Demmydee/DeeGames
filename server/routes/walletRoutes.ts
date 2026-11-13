import { Router } from 'express';
import * as walletController from '../controllers/walletController';
import * as depositController from '../controllers/depositController';
import * as withdrawalController from '../controllers/withdrawalController';
import { authenticateToken as authenticate, requireRegisteredUser } from '../middleware/auth';

const router = Router();

// Wallet
router.get('/', authenticate, requireRegisteredUser, walletController.getWallet);
router.get('/transactions', authenticate, requireRegisteredUser, walletController.getTransactions);
router.get('/transactions/recent', authenticate, requireRegisteredUser, walletController.getRecentTransactions);

// Deposits
router.post('/deposit/initiate', authenticate, requireRegisteredUser, depositController.initiateDeposit);
router.post('/deposit/verify', authenticate, requireRegisteredUser, depositController.verifyDeposit);
router.get('/deposit/callback', depositController.handleCallback);
router.post('/deposit/webhook', depositController.handleWebhook);
router.get('/deposits', authenticate, requireRegisteredUser, depositController.getDeposits);

// Withdrawals
router.post('/withdraw', authenticate, requireRegisteredUser, withdrawalController.requestWithdrawal);
router.get('/withdrawals', authenticate, requireRegisteredUser, withdrawalController.getWithdrawals);

export default router;
