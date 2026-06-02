import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { authenticateAdmin, requireRole } from '../middleware/adminAuth';

const router = Router();

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================
router.post('/auth/login', adminController.login);
router.post('/auth/logout', authenticateAdmin, adminController.logout);
router.get('/auth/me', authenticateAdmin, adminController.getMe);

// ==========================================
// DASHBOARD OVERVIEW
// ==========================================
router.get('/dashboard/stats', authenticateAdmin, adminController.getStats);

// ==========================================
// USER PLAYS & PROFILES
// ==========================================
router.get('/users', authenticateAdmin, adminController.getUsersList);
router.get('/users/:id', authenticateAdmin, adminController.getUserById);
router.get('/users/:id/wallet', authenticateAdmin, adminController.getUserWallet);
router.get('/users/:id/transactions', authenticateAdmin, adminController.getUserTransactions);
router.get('/users/:id/games', authenticateAdmin, adminController.getUserGames);
router.post('/users/:id/suspend', authenticateAdmin, requireRole(['super_admin', 'moderation_admin']), adminController.suspendUser);
router.post('/users/:id/unsuspend', authenticateAdmin, requireRole(['super_admin', 'moderation_admin']), adminController.unsuspendUser);
router.post('/users/:id/ban', authenticateAdmin, requireRole(['super_admin', 'moderation_admin']), adminController.banUser);
router.post('/users/:id/unban', authenticateAdmin, requireRole(['super_admin', 'moderation_admin']), adminController.unbanUser);
router.put('/users/:id/kyc', authenticateAdmin, requireRole(['super_admin', 'moderation_admin']), adminController.updateKyc);

// ==========================================
// WITHDRAWALS PROCESSING
// ==========================================
router.get('/withdrawals', authenticateAdmin, adminController.getWithdrawalsList);
router.get('/withdrawals/:id', authenticateAdmin, adminController.getWithdrawalById);
router.post('/withdrawals/:id/approve', authenticateAdmin, requireRole(['super_admin', 'finance_admin']), adminController.approveWithdrawal);
router.post('/withdrawals/:id/processing', authenticateAdmin, requireRole(['super_admin', 'finance_admin']), adminController.processWithdrawal);
router.post('/withdrawals/:id/complete', authenticateAdmin, requireRole(['super_admin', 'finance_admin']), adminController.completeWithdrawal);
router.post('/withdrawals/:id/reject', authenticateAdmin, requireRole(['super_admin', 'finance_admin']), adminController.rejectWithdrawal);
router.put('/withdrawals/:id/note', authenticateAdmin, requireRole(['super_admin', 'finance_admin']), adminController.updateWithdrawalNote);

// ==========================================
// DEPOSITS OVERSEE
// ==========================================
router.get('/deposits', authenticateAdmin, adminController.getDepositsList);
router.get('/deposits/:id', authenticateAdmin, adminController.getDepositById);
router.post('/deposits/:id/verify', authenticateAdmin, requireRole(['super_admin', 'finance_admin']), adminController.verifyDepositManually);

// ==========================================
// MATCH PLAY OVERSIGHT
// ==========================================
router.get('/matches/active', authenticateAdmin, adminController.getActiveMatches);
router.get('/matches/completed', authenticateAdmin, adminController.getCompletedMatches);
router.get('/matches/:id', authenticateAdmin, adminController.getMatchById);
router.post('/matches/:id/force-end', authenticateAdmin, requireRole(['super_admin']), adminController.forceEndMatch);

// ==========================================
// HOUSE REVENUE REPORTS
// ==========================================
router.get('/revenue/summary', authenticateAdmin, requireRole(['super_admin', 'finance_admin']), adminController.getRevenueSummary);
router.get('/revenue/transactions', authenticateAdmin, requireRole(['super_admin', 'finance_admin']), adminController.getRevenueTransactions);

// ==========================================
// MODERATION QUEUE
// ==========================================
router.get('/reports', authenticateAdmin, adminController.getReportsList);
router.get('/reports/:id', authenticateAdmin, adminController.getReportById);
router.post('/reports/:id/review', authenticateAdmin, requireRole(['super_admin', 'moderation_admin']), adminController.reviewReport);
router.post('/reports/:id/resolve', authenticateAdmin, requireRole(['super_admin', 'moderation_admin']), adminController.resolveReport);
router.post('/reports/:id/dismiss', authenticateAdmin, requireRole(['super_admin', 'moderation_admin']), adminController.dismissReport);

// ==========================================
// SUPPORT TICKETS
// ==========================================
router.get('/support/tickets', authenticateAdmin, adminController.getTicketsList);
router.get('/support/tickets/:id', authenticateAdmin, adminController.getTicketById);
router.post('/support/tickets/:id/reply', authenticateAdmin, requireRole(['super_admin', 'support_admin']), adminController.replyTicket);
router.post('/support/tickets/:id/close', authenticateAdmin, requireRole(['super_admin', 'support_admin']), adminController.closeTicket);

// ==========================================
// ADMINISTRATIVE TEAM (ADMIN USERS)
// ==========================================
router.get('/admins', authenticateAdmin, requireRole(['super_admin']), adminController.getAdminUsers);
router.post('/admins', authenticateAdmin, requireRole(['super_admin']), adminController.createAdminUser);
router.put('/admins/:id/deactivate', authenticateAdmin, requireRole(['super_admin']), adminController.deactivateAdminUser);
router.put('/admins/:id/reactivate', authenticateAdmin, requireRole(['super_admin']), adminController.reactivateAdminUser);

// ==========================================
// SYSTEM AUDIT LOGS
// ==========================================
router.get('/audit-logs', authenticateAdmin, requireRole(['super_admin']), adminController.getAuditLogs);
router.get('/audit-logs/:id', authenticateAdmin, requireRole(['super_admin']), adminController.getAuditLogById);

export default router;
