import { Router } from 'express';
import * as walletController from '../controllers/walletController';
import * as depositController from '../controllers/depositController';
import * as withdrawalController from '../controllers/withdrawalController';
import { authenticateToken as authenticate } from '../middleware/auth';

const router = Router();

// Wallet
router.get('/', authenticate, walletController.getWallet);
router.get('/transactions', authenticate, walletController.getTransactions);
router.get('/transactions/recent', authenticate, walletController.getRecentTransactions);

// Deposits
router.post('/deposit/initiate', authenticate, depositController.initiateDeposit);
router.post('/deposit/verify', authenticate, depositController.verifyDeposit);
router.get('/deposit/callback', depositController.handleCallback);
router.post('/deposit/webhook', depositController.handleWebhook);
router.get('/deposits', authenticate, depositController.getDeposits);

// Withdrawals
router.post('/withdraw', authenticate, withdrawalController.requestWithdrawal);
router.get('/withdrawals', authenticate, withdrawalController.getWithdrawals);

export default router;
