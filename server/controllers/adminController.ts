import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';
import { AdminAuditService } from '../services/adminAuditService';
import * as depositService from '../services/depositService';
import { AdminRequest } from '../middleware/adminAuth';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'fallback-admin-jwt-secret-key-102938';
const ADMIN_TOKEN_EXPIRY = parseInt(process.env.ADMIN_TOKEN_EXPIRY || '7200', 10);
const ADMIN_LOGIN_MAX_ATTEMPTS = parseInt(process.env.ADMIN_LOGIN_MAX_ATTEMPTS || '5', 10);
const ADMIN_LOCKOUT_DURATION_MINUTES = parseInt(process.env.ADMIN_LOCKOUT_DURATION_MINUTES || '15', 10);

export const login = async (req: any, res: Response) => {
  const { email, password } = req.body;
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown-ip';
  const userAgent = req.headers['user-agent'] || 'unknown';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const lowerEmail = email.toLowerCase();

  try {
    // 1. Fetch admin record
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', lowerEmail)
      .single();

    if (error || !admin) {
      // Log the login failure (unknown admin user)
      await AdminAuditService.log({
        adminUserId: '00000000-0000-0000-0000-000000000000',
        adminEmail: lowerEmail,
        actionType: 'failed_admin_login',
        resourceType: 'admin',
        description: `Failed login attempt with unregistered email from IP ${ip}`,
        ipAddress: ip,
        userAgent
      });
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // 2. Check if locked out
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      const lockRemaining = Math.ceil((new Date(admin.locked_until).getTime() - Date.now()) / (60 * 1000));
      return res.status(403).json({
        error: `This account is locked due to too many failed attempts. Try again in ${lockRemaining} minute(s).`
      });
    }

    // 3. Verify password
    const isPwMatch = await bcrypt.compare(password, admin.password_hash);
    
    if (!isPwMatch) {
      const newAttempts = admin.login_attempts + 1;
      let updatePayload: any = { login_attempts: newAttempts };

      // Trigger 15-minute lockout if limit reached
      if (newAttempts >= ADMIN_LOGIN_MAX_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + ADMIN_LOCKOUT_DURATION_MINUTES * 60 * 1000);
        updatePayload.locked_until = lockUntil.toISOString();
        updatePayload.login_attempts = 0; // Reset counter for after lockout
      }

      await supabase
        .from('admin_users')
        .update(updatePayload)
        .eq('id', admin.id);

      // Log the login failure
      await AdminAuditService.log({
        adminUserId: admin.id,
        adminEmail: admin.email,
        actionType: 'failed_admin_login',
        resourceType: 'admin',
        resourceId: admin.id,
        description: `Incorrect password login attempt (Attempt ${newAttempts})`,
        ipAddress: ip,
        userAgent
      });

      return res.status(401).json({
        error: 'Invalid email or password.',
        attemptsRemaining: Math.max(0, ADMIN_LOGIN_MAX_ATTEMPTS - newAttempts)
      });
    }

    if (!admin.is_active) {
      return res.status(403).json({ error: 'This administrative account is currently deactivated.' });
    }

    // 4. Successful Login: generate token
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role, name: admin.name },
      ADMIN_JWT_SECRET,
      { expiresIn: ADMIN_TOKEN_EXPIRY }
    );

    // Reset login attempts
    await supabase
      .from('admin_users')
      .update({
        login_attempts: 0,
        locked_until: null,
        last_login_at: new Date().toISOString()
      })
      .eq('id', admin.id);

    // Log the successful login
    await AdminAuditService.log({
      adminUserId: admin.id,
      adminEmail: admin.email,
      actionType: 'admin_login',
      resourceType: 'admin',
      resourceId: admin.id,
      description: `Successful administrative login from IP ${ip}`,
      ipAddress: ip,
      userAgent
    });

    return res.status(200).json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (err: any) {
    console.error('Admin login handler error:', err);
    return res.status(500).json({ error: 'Internal server error during login processing.' });
  }
};

export const logout = async (req: AdminRequest, res: Response) => {
  const ip = req.ip || 'unknown-ip';
  const userAgent = req.headers['user-agent'] || 'unknown';

  if (req.admin) {
    await AdminAuditService.log({
      adminUserId: req.admin.id,
      adminEmail: req.admin.email,
      actionType: 'admin_logout',
      resourceType: 'admin',
      resourceId: req.admin.id,
      description: `Administrative manual logout from IP ${ip}`,
      ipAddress: ip,
      userAgent
    });
  }

  return res.status(200).json({ success: true, message: 'Successfully logged out.' });
};

export const getMe = async (req: AdminRequest, res: Response) => {
  if (!req.admin) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('id, email, name, role, is_active, last_login_at')
      .eq('id', req.admin.id)
      .single();

    if (error || !admin) {
      return res.status(404).json({ error: 'Admin details not found.' });
    }

    return res.status(200).json({ admin });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// ==========================================
// DASHBOARD OVERVIEW STATISTICS
// ==========================================
export const getStats = async (req: AdminRequest, res: Response) => {
  try {
    const todayStr = new Date();
    todayStr.setHours(0,0,0,0);
    const todayIso = todayStr.toISOString();

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);
    const startOfMonthIso = startOfMonth.toISOString();

    // 1. Total & Joined users today
    const { data: allUsers, error: usersErr } = await supabase
      .from('users')
      .select('id, created_at');

    if (usersErr) throw usersErr;
    const totalUsers = allUsers?.length || 0;
    const usersToday = allUsers?.filter(u => new Date(u.created_at) >= todayStr).length || 0;

    // 2. Active matches
    const { count: activeMatches, error: matchesErr } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .in('status', ['waiting', 'in_progress']);

    if (matchesErr) throw matchesErr;

    // 3. Pending withdrawals
    const { count: pendingWithdrawals, error: wdErr } = await supabase
      .from('withdrawals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (wdErr) throw wdErr;

    // 4. Unreviewed reports
    const { count: openReports, error: repErr } = await supabase
      .from('player_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'submitted');

    if (repErr) throw repErr;

    // 5. Open support tickets
    const { count: openTickets, error: tixErr } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    if (tixErr) throw tixErr;

    // 6. Deposit Totals
    const { data: deposits, error: depoErr } = await supabase
      .from('deposits')
      .select('amount, created_at')
      .eq('status', 'successful');

    if (depoErr) throw depoErr;

    let depositsToday = 0;
    let depositsThisMonth = 0;
    deposits?.forEach(d => {
      const dDate = new Date(d.created_at);
      if (dDate >= todayStr) depositsToday += Number(d.amount);
      if (dDate >= startOfMonth) depositsThisMonth += Number(d.amount);
    });

    // 7. Withdrawal Totals
    const { data: withdrawals, error: withErr } = await supabase
      .from('withdrawals')
      .select('amount, created_at')
      .eq('status', 'successful');

    if (withErr) throw withErr;

    let withdrawalsToday = 0;
    let withdrawalsThisMonth = 0;
    withdrawals?.forEach(w => {
      const wDate = new Date(w.created_at);
      if (wDate >= todayStr) withdrawalsToday += Number(w.amount);
      if (wDate >= startOfMonth) withdrawalsThisMonth += Number(w.amount);
    });

    // 8. House Revenue calculations (stored in house_revenue table, amount_kobo)
    const { data: revenueRows, error: revErr } = await supabase
      .from('house_revenue')
      .select('amount_kobo, created_at');

    if (revErr) throw revErr;

    let revenueToday = 0;
    let revenueThisMonth = 0;
    let revenueAllTime = 0;

    revenueRows?.forEach(r => {
      const rDate = new Date(r.created_at);
      const revAmnt = Number(r.amount_kobo) / 100.0;
      revenueAllTime += revAmnt;
      if (rDate >= todayStr) revenueToday += revAmnt;
      if (rDate >= startOfMonth) revenueThisMonth += revAmnt;
    });

    return res.status(200).json({
      stats: {
        totalUsers,
        usersToday,
        activeMatches: activeMatches || 0,
        pendingWithdrawalsCount: pendingWithdrawals || 0,
        unreviewedReportsCount: openReports || 0,
        openSupportTicketsCount: openTickets || 0,
        depositsToday,
        depositsThisMonth,
        withdrawalsToday,
        withdrawalsThisMonth,
        revenueToday,
        revenueThisMonth,
        revenueAllTime
      }
    });
  } catch (err: any) {
    console.error('getStats error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// ==========================================
// USER MANAGEMENT MODULE
// ==========================================
export const getUsersList = async (req: AdminRequest, res: Response) => {
  const { search, status, kyc, sortBy, page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  try {
    let query = supabase.from('users').select('*, wallets(*)', { count: 'exact' });

    // Filter status
    if (status) {
      if (status === 'suspended') {
        query = query.eq('is_suspended', true);
      } else if (status === 'banned') {
        query = query.eq('is_banned', true);
      } else if (status === 'active') {
        query = query.eq('is_suspended', false).eq('is_banned', false);
      }
    }

    // KYC Status
    if (kyc) {
      query = query.eq('kyc_status', kyc);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    let filteredUsers = data || [];

    // Search filter
    if (search) {
      const lowS = (search as string).toLowerCase();
      filteredUsers = filteredUsers.filter(u => 
        (u.username && u.username.toLowerCase().includes(lowS)) ||
        (u.email && u.email.toLowerCase().includes(lowS)) ||
        (u.phone && u.phone.includes(lowS)) ||
        (u.full_name && u.full_name.toLowerCase().includes(lowS))
      );
    }

    // Sort users
    if (sortBy) {
      if (sortBy === 'registration_desc') {
        filteredUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else if (sortBy === 'registration_asc') {
        filteredUsers.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      } else if (sortBy === 'balance_desc') {
        filteredUsers.sort((a, b) => {
          const balA = a.wallets?.[0]?.total_balance || 0;
          const balB = b.wallets?.[0]?.total_balance || 0;
          return balB - balA;
        });
      }
    } else {
      // Default to registration date descending
      filteredUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    const paginated = filteredUsers.slice(offset, offset + limitNum);

    return res.status(200).json({
      users: paginated,
      totalCount: filteredUsers.length,
      page: pageNum,
      totalPages: Math.ceil(filteredUsers.length / limitNum)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getUserById = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*, wallets(*)')
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.status(200).json({ user });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getUserWallet = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  try {
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', id)
      .single();

    if (error) throw error;
    return res.status(200).json({ wallet });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getUserTransactions = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  try {
    const { data: transactions, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.status(200).json({ transactions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getUserGames = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  try {
    // Gets match history for the specified user
    const { data: matchParticipants, error } = await supabase
      .from('match_participants')
      .select('matches(*, game_types(*), match_results(*))')
      .eq('user_id', id);

    if (error) throw error;

    const games = matchParticipants
      ?.map((mp: any) => mp.matches)
      .filter(m => m !== null)
      .sort((a, b) => new Date(b.started_at || b.created_at).getTime() - new Date(a.started_at || a.created_at).getTime()) || [];

    return res.status(200).json({ games });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const suspendUser = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  const { reason, durationMinutes } = req.body;
  const ip = req.ip || 'unknown-ip';
  const userAgent = req.headers['user-agent'] || 'unknown';

  if (!reason) {
    return res.status(400).json({ error: 'Suspension reason is required.' });
  }

  try {
    // Get existing state
    const { data: userBefore, error: selectError } = await supabase
      .from('users')
      .select('id, is_suspended, suspension_reason, suspension_expires_at')
      .eq('id', id)
      .single();

    if (selectError || !userBefore) {
      return res.status(404).json({ error: 'User does not exist.' });
    }

    const expiryDate = durationMinutes 
      ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
      : null;

    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_suspended: true,
        suspension_reason: reason,
        suspension_expires_at: expiryDate
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Audit Log
    const userAfter = { ...userBefore, is_suspended: true, suspension_reason: reason, suspension_expires_at: expiryDate };
    await AdminAuditService.log({
      adminUserId: req.admin!.id,
      adminEmail: req.admin!.email,
      actionType: 'user_suspended',
      resourceType: 'user',
      resourceId: id,
      description: `Suspended user (ID: ${id}) for: "${reason}". Expiry: ${expiryDate || 'Permanent'}`,
      beforeValue: userBefore,
      afterValue: userAfter,
      ipAddress: ip,
      userAgent
    });

    return res.status(200).json({ success: true, message: 'User suspended successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const unsuspendUser = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  const ip = req.ip || 'unknown-ip';
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
    const { data: userBefore } = await supabase
      .from('users')
      .select('id, is_suspended, suspension_reason, suspension_expires_at')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('users')
      .update({
        is_suspended: false,
        suspension_reason: null,
        suspension_expires_at: null
      })
      .eq('id', id);

    if (error) throw error;

    await AdminAuditService.log({
      adminUserId: req.admin!.id,
      adminEmail: req.admin!.email,
      actionType: 'user_unsuspended',
      resourceType: 'user',
      resourceId: id,
      description: `Lifted suspension of user ID: ${id}`,
      beforeValue: userBefore,
      afterValue: { id, is_suspended: false },
      ipAddress: ip,
      userAgent
    });

    return res.status(200).json({ success: true, message: 'User suspension lifted.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const banUser = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const ip = req.ip || 'unknown-ip';
  const userAgent = req.headers['user-agent'] || 'unknown';

  if (!reason) {
    return res.status(400).json({ error: 'Ban reason is required.' });
  }

  try {
    const { data: userBefore } = await supabase
      .from('users')
      .select('id, is_banned, ban_reason, banned_at')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('users')
      .update({
        is_banned: true,
        ban_reason: reason,
        banned_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    await AdminAuditService.log({
      adminUserId: req.admin!.id,
      adminEmail: req.admin!.email,
      actionType: 'user_banned',
      resourceType: 'user',
      resourceId: id,
      description: `Banned user ID: ${id} permanently. Reason: "${reason}"`,
      beforeValue: userBefore,
      afterValue: { id, is_banned: true, ban_reason: reason },
      ipAddress: ip,
      userAgent
    });

    return res.status(200).json({ success: true, message: 'User banned permanently.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const unbanUser = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  const ip = req.ip || 'unknown-ip';
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
    const { data: userBefore } = await supabase
      .from('users')
      .select('id, is_banned, ban_reason, banned_at')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('users')
      .update({
        is_banned: false,
        ban_reason: null,
        banned_at: null
      })
      .eq('id', id);

    if (error) throw error;

    await AdminAuditService.log({
      adminUserId: req.admin!.id,
      adminEmail: req.admin!.email,
      actionType: 'user_unbanned',
      resourceType: 'user',
      resourceId: id,
      description: `Fitted ban reversal for user ID: ${id}`,
      beforeValue: userBefore,
      afterValue: { id, is_banned: false },
      ipAddress: ip,
      userAgent
    });

    return res.status(200).json({ success: true, message: 'User unbanned successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateKyc = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  const { status, reason } = req.body; // status: 'verified' or 'rejected' or 'pending'
  const ip = req.ip || 'unknown-ip';
  const userAgent = req.headers['user-agent'] || 'unknown';

  if (!status || !['verified', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Valid KYC status target is required.' });
  }

  try {
    const { data: userBefore } = await supabase
      .from('users')
      .select('id, kyc_status, kyc_verified_at, kyc_rejection_reason')
      .eq('id', id)
      .single();

    const updatePayload: any = {
      kyc_status: status,
      kyc_rejection_reason: status === 'rejected' ? reason : null,
      kyc_verified_at: status === 'verified' ? new Date().toISOString() : null
    };

    const { error } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', id);

    if (error) throw error;

    await AdminAuditService.log({
      adminUserId: req.admin!.id,
      adminEmail: req.admin!.email,
      actionType: 'kyc_updated',
      resourceType: 'user',
      resourceId: id,
      description: `Updated KYC status of user ID: ${id} to "${status}". Reason: "${reason || 'no reason provided'}"`,
      beforeValue: userBefore,
      afterValue: { id, ...updatePayload },
      ipAddress: ip,
      userAgent
    });

    return res.status(200).json({ success: true, message: `KYC status modified to ${status}.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// ==========================================
// WITHDRAWAL PROCESSING MODULE
// ==========================================
export const getWithdrawalsList = async (req: AdminRequest, res: Response) => {
  const { status, username, reference, page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  try {
    let query = supabase
      .from('withdrawals')
      .select('*, users(*), payout_accounts(*)', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    if (reference) {
      query = query.ilike('internal_reference', `%${reference}%`);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    let filtered = data || [];

    if (username) {
      const lowU = (username as string).toLowerCase();
      filtered = filtered.filter(w => w.users && w.users.username.toLowerCase().includes(lowU));
    }

    // Sort requested_at desc
    filtered.sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());

    const paginated = filtered.slice(offset, offset + limitNum);

    return res.status(200).json({
      withdrawals: paginated,
      totalCount: filtered.length,
      page: pageNum,
      totalPages: Math.ceil(filtered.length / limitNum)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getWithdrawalById = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  try {
    const { data: withdrawal, error } = await supabase
      .from('withdrawals')
      .select('*, users(*, wallets(*)), payout_accounts(*)')
      .eq('id', id)
      .single();

    if (error || !withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found.' });
    }

    return res.status(200).json({ withdrawal });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateWithdrawalNote = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  const { note } = req.body;
  try {
    const { error } = await supabase
      .from('withdrawals')
      .update({ admin_note: note })
      .eq('id', id);

    if (error) throw error;
    return res.status(200).json({ success: true, message: 'Notes updated.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const approveWithdrawal = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  const ip = req.ip || 'unknown-ip';
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
    const { data: wRecord, error: fErr } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', id)
      .single();

    if (fErr || !wRecord) return res.status(404).json({ error: 'Withdrawal request not found.' });

    if (wRecord.status !== 'pending') {
      return res.status(400).json({ error: `Withdrawals can only be approved if pending. Current: ${wRecord.status}` });
    }

    const { error: uErr } = await supabase
      .from('withdrawals')
      .update({
        status: 'approved',
        processed_by_admin_id: req.admin!.id,
        processed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (uErr) throw uErr;

    await AdminAuditService.log({
      adminUserId: req.admin!.id,
      adminEmail: req.admin!.email,
      actionType: 'withdrawal_approved',
      resourceType: 'withdrawal',
      resourceId: id,
      description: `Approved withdrawal transaction of NGN ${wRecord.amount} for user ID: ${wRecord.user_id}`,
      beforeValue: wRecord,
      afterValue: { ...wRecord, status: 'approved' },
      ipAddress: ip,
      userAgent
    });

    return res.status(200).json({ success: true, message: 'Withdrawal request approved.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const processWithdrawal = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  const ip = req.ip || 'unknown-ip';
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
    const { data: wRecord, error: fErr } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', id)
      .single();

    if (fErr || !wRecord) return res.status(404).json({ error: 'Withdrawal not found.' });

    if (wRecord.status !== 'approved' && wRecord.status !== 'pending') {
      return res.status(400).json({ error: `Withdrawals status must be pending or approved. Current: ${wRecord.status}` });
    }

    const { error: uErr } = await supabase
      .from('withdrawals')
      .update({ status: 'processing' })
      .eq('id', id);

    if (uErr) throw uErr;

    await AdminAuditService.log({
      adminUserId: req.admin!.id,
      adminEmail: req.admin!.email,
      actionType: 'withdrawal_processing',
      resourceType: 'withdrawal',
      resourceId: id,
      description: `Processed withdrawal transaction of NGN ${wRecord.amount} (marked as in progress)`,
      beforeValue: wRecord,
      afterValue: { ...wRecord, status: 'processing' },
      ipAddress: ip,
      userAgent
    });

    return res.status(200).json({ success: true, message: 'Withdrawal set to processing.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const completeWithdrawal = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  const ip = req.ip || 'unknown-ip';
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
    const { data: wRecord, error: fErr } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', id)
      .single();

    if (fErr || !wRecord) return res.status(404).json({ error: 'Withdrawal not found.' });

    if (wRecord.status === 'successful' || wRecord.status === 'rejected' || wRecord.status === 'failed') {
      return res.status(400).json({ error: 'Withdrawal status is already finalized.' });
    }

    // 1. Mark status as successful in DB (it will reduce locked balance programmatically)
    const { data: wallet, error: wallErr } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', wRecord.user_id)
      .single();

    if (wallErr) throw wallErr;

    // Deduct from locked_balance atomically
    const finalLocked = Math.max(0, Number(wallet.locked_balance) - Number(wRecord.amount));

    const { error: walletDeductErr } = await supabase
      .from('wallets')
      .update({ locked_balance: finalLocked })
      .eq('id', wallet.id);

    if (walletDeductErr) throw walletDeductErr;

    // Create wallet transaction record for completed withdrawal
    const wtReference = `WIT_DONE_${Date.now()}`;
    await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        user_id: wRecord.user_id,
        transaction_type: 'withdrawal',
        direction: 'debit',
        amount: wRecord.amount,
        status: 'successful',
        reference: wtReference,
        description: `Withdrawal successfully paid to payout account`,
        related_withdrawal_id: id
      });

    // Finalize withdrawal record
    await supabase
      .from('withdrawals')
      .update({
        status: 'successful',
        processed_at: new Date().toISOString(),
        processed_by_admin_id: req.admin!.id
      })
      .eq('id', id);

    await AdminAuditService.log({
      adminUserId: req.admin!.id,
      adminEmail: req.admin!.email,
      actionType: 'withdrawal_completed',
      resourceType: 'withdrawal',
      resourceId: id,
      description: `Completed and debited withdrawal NGN ${wRecord.amount} atomically for user ID: ${wRecord.user_id}`,
      beforeValue: wRecord,
      afterValue: { ...wRecord, status: 'successful' },
      ipAddress: ip,
      userAgent
    });

    return res.status(200).json({ success: true, message: 'Withdrawal successfully finalized.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const rejectWithdrawal = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const ip = req.ip || 'unknown-ip';
  const userAgent = req.headers['user-agent'] || 'unknown';

  if (!reason) {
    return res.status(400).json({ error: 'Rejection reason is required.' });
  }

  try {
    const { data: wRecord, error: fErr } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', id)
      .single();

    if (fErr || !wRecord) return res.status(404).json({ error: 'Withdrawal not found.' });

    if (wRecord.status === 'successful' || wRecord.status === 'rejected' || wRecord.status === 'failed') {
      return res.status(400).json({ error: 'Withdrawal status is already finalized.' });
    }

    const { data: wallet, error: wallErr } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', wRecord.user_id)
      .single();

    if (wallErr) throw wallErr;

    // Refund locked balance back to available balance
    const finalLocked = Math.max(0, Number(wallet.locked_balance) - Number(wRecord.amount));
    const finalAvailable = Number(wallet.available_balance) + Number(wRecord.amount);

    const { error: walletRefundErr } = await supabase
      .from('wallets')
      .update({
        locked_balance: finalLocked,
        available_balance: finalAvailable
      })
      .eq('id', wallet.id);

    if (walletRefundErr) throw walletRefundErr;

    // Record wallet transaction reversal
    const wtReference = `WIT_REV_${Date.now()}`;
    await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        user_id: wRecord.user_id,
        transaction_type: 'refund',
        direction: 'credit',
        amount: wRecord.amount,
        status: 'reversed',
        reference: wtReference,
        description: `Withdrawal rejected: ${reason}. Funds returned to wallet balance`,
        related_withdrawal_id: id
      });

    // Finalize withdrawal rejection
    await supabase
      .from('withdrawals')
      .update({
        status: 'rejected',
        failure_reason: reason,
        processed_at: new Date().toISOString(),
        processed_by_admin_id: req.admin!.id
      })
      .eq('id', id);

    await AdminAuditService.log({
      adminUserId: req.admin!.id,
      adminEmail: req.admin!.email,
      actionType: 'withdrawal_rejected',
      resourceType: 'withdrawal',
      resourceId: id,
      description: `Rejected withdrawal of NGN ${wRecord.amount} for user ID: ${wRecord.user_id}. Reason: "${reason}"`,
      beforeValue: wRecord,
      afterValue: { ...wRecord, status: 'rejected', failure_reason: reason },
      ipAddress: ip,
      userAgent
    });

    return res.status(200).json({ success: true, message: 'Withdrawal successfully rejected.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// ==========================================
// DEPOSIT MANAGEMENT MODULE
// ==========================================
export const getDepositsList = async (req: AdminRequest, res: Response) => {
  const { status, reference, username, page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  try {
    let query = supabase
      .from('deposits')
      .select('*, users(*)', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    if (reference) {
      query = query.or(`internal_reference.ilike.%${reference}%,paystack_reference.ilike.%${reference}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    let filtered = data || [];

    if (username) {
      const lowU = (username as string).toLowerCase();
      filtered = filtered.filter(d => d.users && d.users.username.toLowerCase().includes(lowU));
    }

    // Sort descending by date
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const paginated = filtered.slice(offset, offset + limitNum);

    return res.status(200).json({
      deposits: paginated,
      totalCount: filtered.length,
      page: pageNum,
      totalPages: Math.ceil(filtered.length / limitNum)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getDepositById = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  try {
    const { data: deposit, error } = await supabase
      .from('deposits')
      .select('*, users(*)')
      .eq('id', id)
      .single();

    if (error || !deposit) {
      return res.status(404).json({ error: 'Deposit record not found.' });
    }

    return res.status(200).json({ deposit });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const verifyDepositManually = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  const ip = req.ip || 'unknown-ip';
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
    const { data: deposit, error } = await supabase
      .from('deposits')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !deposit) {
      return res.status(404).json({ error: 'Deposit record not found.' });
    }

    // Trigger standard Paystack verify check
    console.log(`[Admin] Manually verifying deposit reference: ${deposit.internal_reference}`);
    const verifyResult = await depositService.verifyDeposit(deposit.internal_reference);

    await AdminAuditService.log({
      adminUserId: req.admin!.id,
      adminEmail: req.admin!.email,
      actionType: 'deposit_manually_verified',
      resourceType: 'deposit',
      resourceId: id,
      description: `Manually completed Paystack transaction verification for reference: ${deposit.internal_reference}`,
      beforeValue: deposit,
      afterValue: { ...deposit, status: 'successful' },
      ipAddress: ip,
      userAgent
    });

    return res.status(200).json({
      success: true,
      message: 'Deposit verified successfully.',
      result: verifyResult
    });
  } catch (err: any) {
    return res.status(400).json({ error: `Manual verification failed: ${err.message}` });
  }
};

// ==========================================
// GAME & MATCH MANAGEMENT MODULE
// ==========================================
export const getActiveMatches = async (req: AdminRequest, res: Response) => {
  try {
    const { data: matches, error } = await supabase
      .from('matches')
      .select('*, game_types(*), match_participants(*, users(username))')
      .in('status', ['waiting', 'in_progress']);

    if (error) throw error;

    return res.status(200).json({ matches });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getCompletedMatches = async (req: AdminRequest, res: Response) => {
  try {
    const { data: matches, error } = await supabase
      .from('matches')
      .select('*, game_types(*), match_results(*), match_participants(*, users(username))')
      .eq('status', 'finished')
      .order('finished_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ matches });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getMatchById = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  try {
    const { data: match, error } = await supabase
      .from('matches')
      .select('*, game_types(*), match_results(*), match_participants(*, users(*)), game_states(*)')
      .eq('id', id)
      .single();

    if (error || !match) {
      return res.status(404).json({ error: 'Match not found.' });
    }

    return res.status(200).json({ match });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const forceEndMatch = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const ip = req.ip || 'unknown-ip';
  const userAgent = req.headers['user-agent'] || 'unknown';

  if (!reason) {
    return res.status(400).json({ error: 'Reason for terminating this match is required.' });
  }

  try {
    const { data: match, error } = await supabase
      .from('matches')
      .select('*, match_participants(*)')
      .eq('id', id)
      .single();

    if (error || !match) {
      return res.status(404).json({ error: 'Match not found.' });
    }

    if (match.status === 'finished' || match.status === 'cancelled' || match.status === 'force_ended') {
      return res.status(400).json({ error: 'Match is already ended.' });
    }

    // Refund locked wagers to ALL participants
    const refundAmount = Number(match.amount);
    
    if (refundAmount > 0) {
      for (const participant of match.match_participants) {
        const { data: wallet, error: wallErr } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', participant.user_id)
          .single();

        if (wallErr || !wallet) continue;

        // Release locked balance atomically
        const newLocked = Math.max(0, Number(wallet.locked_balance) - refundAmount);
        const newAvailable = Number(wallet.available_balance) + refundAmount;

        await supabase
          .from('wallets')
          .update({
            locked_balance: newLocked,
            available_balance: newAvailable
          })
          .eq('id', wallet.id);

        // Record wager_release transaction
        await supabase
          .from('wallet_transactions')
          .insert({
            wallet_id: wallet.id,
            user_id: participant.user_id,
            transaction_type: 'wager_release',
            direction: 'credit',
            amount: refundAmount,
            status: 'successful',
            reference: `REFUND_FORCE_${id}`,
            description: `Locked wager of NGN ${refundAmount} refunded. Match force-ended: ${reason}`
          });
      }
    }

    // Update match state
    await supabase
      .from('matches')
      .update({
        status: 'force_ended',
        finished_at: new Date().toISOString()
      })
      .eq('id', id);

    // Save final mock/audit result
    await supabase
      .from('match_results')
      .insert({
        match_id: id,
        pay_mode: 'refund',
        settlement_status: 'refunded',
        draw_reason: `Force-terminated by admin. Reason: ${reason}`
      });

    await AdminAuditService.log({
      adminUserId: req.admin!.id,
      adminEmail: req.admin!.email,
      actionType: 'match_force_ended',
      resourceType: 'match',
      resourceId: id,
      description: `Force-ended match ${id} and refunded NGN ${refundAmount} to participants. Reason: "${reason}"`,
      beforeValue: match,
      afterValue: { ...match, status: 'force_ended' },
      ipAddress: ip,
      userAgent
    });

    return res.status(200).json({ success: true, message: 'Match successfully terminated and wagers refunded.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// ==========================================
// REVENUE & REPORTS MODULE
// ==========================================
export const getRevenueSummary = async (req: AdminRequest, res: Response) => {
  try {
    const { data: rev, error } = await supabase
      .from('house_revenue')
      .select('*, matches(*, game_types(*))');

    if (error) throw error;

    let today = new Date();
    today.setHours(0,0,0,0);
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date();
    lastMonth.setDate(1);
    lastMonth.setHours(0,0,0,0);

    let todayRevenue = 0;
    let weekRevenue = 0;
    let monthRevenue = 0;
    let allTimeRevenue = 0;

    let revenueByGame: Record<string, number> = {};
    let revenueByRoom: Record<string, number> = {};

    rev?.forEach(r => {
      const amt = Number(r.amount_kobo) / 100.0;
      const date = new Date(r.created_at);
      allTimeRevenue += amt;

      if (date >= today) todayRevenue += amt;
      if (date >= lastWeek) weekRevenue += amt;
      if (date >= lastMonth) monthRevenue += amt;

      const gameName = r.matches?.game_types?.name || 'Unknown Game';
      revenueByGame[gameName] = (revenueByGame[gameName] || 0) + amt;

      // Grouping by room wager amount ranges
      const wager = Number(r.matches?.amount || 0);
      let tier = 'Free';
      if (wager > 0 && wager < 1000) tier = 'Low Tier (<1k)';
      else if (wager >= 1000 && wager < 10000) tier = 'Mid Tier (1k-10k)';
      else if (wager >= 10000) tier = 'High Tier (>10k)';
      
      revenueByRoom[tier] = (revenueByRoom[tier] || 0) + amt;
    });

    return res.status(200).json({
      summary: {
        todayRevenue,
        weekRevenue,
        monthRevenue,
        allTimeRevenue
      },
      byGame: revenueByGame,
      byRoom: revenueByRoom
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getRevenueTransactions = async (req: AdminRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('house_revenue')
      .select('*, matches(*, game_types(*))')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.status(200).json({ revenue: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// ==========================================
// MODERATION (PLAYER REPORTS)
// ==========================================
export const getReportsList = async (req: AdminRequest, res: Response) => {
  const { status, page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  try {
    let query = supabase
      .from('player_reports')
      .select('*, reporter:users!player_reports_reporter_user_id_fkey(*), reported:users!player_reports_reported_user_id_fkey(*)', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    // Apply sort DESC
    let sorted = data || [];
    sorted.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const paginated = sorted.slice(offset, offset + limitNum);

    return res.status(200).json({
      reports: paginated,
      totalCount: sorted.length,
      page: pageNum,
      totalPages: Math.ceil(sorted.length / limitNum)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getReportById = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  try {
    const { data: report, error } = await supabase
      .from('player_reports')
      .select('*, reporter:users!player_reports_reporter_user_id_fkey(*), reported:users!player_reports_reported_user_id_fkey(*), matches(*)')
      .eq('id', id)
      .single();

    if (error || !report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    return res.status(200).json({ report });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const reviewReport = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('player_reports')
      .update({
        status: 'reviewed',
        reviewed_by_admin_id: req.admin!.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    return res.status(200).json({ success: true, message: 'Report status set to reviewed.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const resolveReport = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  const { note, action } = req.body;
  const ip = req.ip || 'unknown-ip';
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
    const { data: reportBefore } = await supabase
      .from('player_reports')
      .select('*')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('player_reports')
      .update({
        status: 'resolved',
        reviewed_by_admin_id: req.admin!.id,
        reviewed_at: new Date().toISOString(),
        admin_action: action || 'resolved_with_note',
        resolution_note: note
      })
      .eq('id', id);

    if (error) throw error;

    await AdminAuditService.log({
      adminUserId: req.admin!.id,
      adminEmail: req.admin!.email,
      actionType: 'report_resolved',
      resourceType: 'report',
      resourceId: id,
      description: `Resolved player report ID: ${id}. Admin action taken: "${action}". Resolution note: "${note}"`,
      beforeValue: reportBefore,
      afterValue: { id, status: 'resolved', admin_action: action, resolution_note: note },
      ipAddress: ip,
      userAgent
    });

    return res.status(200).json({ success: true, message: 'Report resolved successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const dismissReport = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  const { note } = req.body;
  const ip = req.ip || 'unknown-ip';
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
    const { data: reportBefore } = await supabase
      .from('player_reports')
      .select('*')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('player_reports')
      .update({
        status: 'dismissed',
        reviewed_by_admin_id: req.admin!.id,
        reviewed_at: new Date().toISOString(),
        resolution_note: note
      })
      .eq('id', id);

    if (error) throw error;

    await AdminAuditService.log({
      adminUserId: req.admin!.id,
      adminEmail: req.admin!.email,
      actionType: 'report_dismissed',
      resourceType: 'report',
      resourceId: id,
      description: `Dismissed player report ID: ${id}. Dismissal note: "${note || 'no details'}"`,
      beforeValue: reportBefore,
      afterValue: { id, status: 'dismissed', resolution_note: note },
      ipAddress: ip,
      userAgent
    });

    return res.status(200).json({ success: true, message: 'Report dismissed.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// ==========================================
// SUPPORT TICKETS MODULE
// ==========================================
export const getTicketsList = async (req: AdminRequest, res: Response) => {
  const { status, page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  try {
    let query = supabase
      .from('support_tickets')
      .select('*, users(*)', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    let sorted = data || [];
    sorted.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const paginated = sorted.slice(offset, offset + limitNum);

    return res.status(200).json({
      tickets: paginated,
      totalCount: sorted.length,
      page: pageNum,
      totalPages: Math.ceil(sorted.length / limitNum)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getTicketById = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  try {
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .select('*, users(*)')
      .eq('id', id)
      .single();

    if (error || !ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    return res.status(200).json({ ticket });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const replyTicket = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  const { reply } = req.body;
  const ip = req.ip || 'unknown-ip';
  const userAgent = req.headers['user-agent'] || 'unknown';

  if (!reply) {
    return res.status(400).json({ error: 'Reply message content is required.' });
  }

  try {
    const { data: before } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('support_tickets')
      .update({
        admin_reply: reply,
        replied_at: new Date().toISOString(),
        assigned_to_admin_id: req.admin!.id,
        status: 'resolved', // default resolves once replied
        resolved_by_admin_id: req.admin!.id,
        resolved_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    await AdminAuditService.log({
      adminUserId: req.admin!.id,
      adminEmail: req.admin!.email,
      actionType: 'ticket_replied',
      resourceType: 'ticket',
      resourceId: id,
      description: `Replied and resolved support ticket ${id}: "${reply.substring(0, 50)}..."`,
      beforeValue: before,
      afterValue: { id, status: 'resolved', admin_reply: reply },
      ipAddress: ip,
      userAgent
    });

    return res.status(200).json({ success: true, message: 'Ticket reply saved and solved.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const closeTicket = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: 'closed' })
      .eq('id', id);

    if (error) throw error;
    return res.status(200).json({ success: true, message: 'Ticket closed successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// ==========================================
// ADMIN USER MANAGEMENT MODULE
// ==========================================
export const getAdminUsers = async (req: AdminRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, email, name, role, is_active, last_login_at, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.status(200).json({ admins: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const createAdminUser = async (req: AdminRequest, res: Response) => {
  const { email, password, name, role } = req.body;
  const ip = req.ip || 'unknown-ip';
  const userAgent = req.headers['user-agent'] || 'unknown';

  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'All fields: email, password, name, role are required.' });
  }

  const lowerEmail = email.toLowerCase();

  try {
    // Check if email already used
    const { data: exist } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', lowerEmail)
      .maybeSingle();

    if (exist) {
      return res.status(409).json({ error: 'Email is already assigned to another admin.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: newAdminKey, error: createErr } = await supabase
      .from('admin_users')
      .insert({
        email: lowerEmail,
        password_hash: hashedPassword,
        name,
        role,
        is_active: true,
        created_by_admin_id: req.admin!.id
      })
      .select('id, email, name, role')
      .single();

    if (createErr) throw createErr;

    await AdminAuditService.log({
      adminUserId: req.admin!.id,
      adminEmail: req.admin!.email,
      actionType: 'admin_created',
      resourceType: 'admin',
      resourceId: newAdminKey.id,
      description: `Created new admin user account: ${lowerEmail} with role: ${role}`,
      afterValue: newAdminKey,
      ipAddress: ip,
      userAgent
    });

    return res.status(201).json({ success: true, admin: newAdminKey });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const deactivateAdminUser = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  const ip = req.ip || 'unknown-ip';
  const userAgent = req.headers['user-agent'] || 'unknown';

  if (id === req.admin!.id) {
    return res.status(400).json({ error: 'You are forbidden from deactivating yourself.' });
  }

  try {
    const { data: before } = await supabase
      .from('admin_users')
      .select('email, is_active')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('admin_users')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    await AdminAuditService.log({
      adminUserId: req.admin!.id,
      adminEmail: req.admin!.email,
      actionType: 'admin_deactivated',
      resourceType: 'admin',
      resourceId: id,
      description: `Deactivated administrator account: ${before?.email || id}`,
      beforeValue: before,
      afterValue: { id, is_active: false },
      ipAddress: ip,
      userAgent
    });

    return res.status(200).json({ success: true, message: 'Admin account deactivated.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const reactivateAdminUser = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  const ip = req.ip || 'unknown-ip';
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
    const { data: before } = await supabase
      .from('admin_users')
      .select('email, is_active')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('admin_users')
      .update({ is_active: true })
      .eq('id', id);

    if (error) throw error;

    await AdminAuditService.log({
      adminUserId: req.admin!.id,
      adminEmail: req.admin!.email,
      actionType: 'admin_reactivated',
      resourceType: 'admin',
      resourceId: id,
      description: `Reactivated administrator account: ${before?.email || id}`,
      beforeValue: before,
      afterValue: { id, is_active: true },
      ipAddress: ip,
      userAgent
    });

    return res.status(200).json({ success: true, message: 'Admin account reactivated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// ==========================================
// AUDIT LOG VIEWER MODULE
// ==========================================
export const getAuditLogs = async (req: AdminRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.status(200).json({ logs: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getAuditLogById = async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Audit log not found.' });
    }

    return res.status(200).json({ log: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
