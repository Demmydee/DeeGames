import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import adminClient from '../../api/adminClient';
import {
  Shield, Users, Wallet, CreditCard, Play, DollarSign, Flag, MessageSquare,
  List, LogOut, ChevronRight, AlertTriangle, CheckCircle, XCircle, Search,
  RefreshCw, Calendar, Clock, UserPlus, Info, FileText
} from 'lucide-react';

type SubTab =
  | 'overview'
  | 'users'
  | 'withdrawals'
  | 'deposits'
  | 'matches'
  | 'revenue'
  | 'moderation'
  | 'support'
  | 'admin-team'
  | 'audit-logs';

export default function AdminDashboard() {
  const { admin, adminLogout } = useAdminAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SubTab>('overview');

  // Generic Search / Page states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Stats State
  const [stats, setStats] = useState<any>(null);

  // Users State
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [suspensionDuration, setSuspensionDuration] = useState('60'); // Minutes
  const [kycRejectionReason, setKycRejectionReason] = useState('');
  const [banReason, setBanReason] = useState('');

  // Withdrawals State
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState('pending');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [withdrawalRejectionReason, setWithdrawalRejectionReason] = useState('');
  const [withdrawalNote, setWithdrawalNote] = useState('');

  // Deposits State
  const [deposits, setDeposits] = useState<any[]>([]);
  const [depositSearch, setDepositSearch] = useState('');

  // Matches State
  const [activeMatches, setActiveMatches] = useState<any[]>([]);
  const [finishedMatches, setFinishedMatches] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [matchCancelReason, setMatchCancelReason] = useState('');

  // Revenue State
  const [revenueSummary, setRevenueSummary] = useState<any>(null);
  const [revenueTxList, setRevenueTxList] = useState<any[]>([]);

  // Reports State
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reportResolution, setReportResolution] = useState('');
  const [reportAdminAction, setReportAdminAction] = useState('warned');

  // Tickets State
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketReplyText, setTicketReplyText] = useState('');

  // Staff State
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'finance_admin' | 'moderation_admin' | 'support_admin'>('moderation_admin');

  // Audit State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditSearch, setAuditSearch] = useState('');

  // Trigger Notifications clear helper
  const triggerNotification = (type: 'error' | 'success', msg: string) => {
    if (type === 'error') {
      setError(msg);
      setSuccess(null);
    } else {
      setSuccess(msg);
      setError(null);
    }
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 5000);
  };

  // ==========================================
  // DATA FETCHING TRIGGERS
  // ==========================================
  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await adminClient.get('/api/admin/dashboard/stats');
      setStats(res.data.stats);
    } catch (err: any) {
      triggerNotification('error', err.response?.data?.error || 'Failed to fetch overview stats.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminClient.get('/api/admin/users', {
        params: { search: userSearch, status: userStatusFilter }
      });
      setUsers(res.data.users || []);
    } catch (err: any) {
      triggerNotification('error', 'Failed to fetch registered users list.');
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const res = await adminClient.get('/api/admin/withdrawals', {
        params: { status: withdrawalStatusFilter }
      });
      setWithdrawals(res.data.withdrawals || []);
    } catch (err: any) {
      triggerNotification('error', 'Failed to load withdrawal requests queue.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      const res = await adminClient.get('/api/admin/deposits', {
        params: { reference: depositSearch }
      });
      setDeposits(res.data.deposits || []);
    } catch (err: any) {
      triggerNotification('error', 'Failed to fetch deposit transactions.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const activeRes = await adminClient.get('/api/admin/matches/active');
      setActiveMatches(activeRes.data.matches || []);
      const completedRes = await adminClient.get('/api/admin/matches/completed');
      setFinishedMatches(completedRes.data.matches || []);
    } catch (err: any) {
      triggerNotification('error', 'Failed to retrieve game matches logs.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenue = async () => {
    setLoading(true);
    try {
      const summaryRes = await adminClient.get('/api/admin/revenue/summary');
      setRevenueSummary(summaryRes.data);
      const listRes = await adminClient.get('/api/admin/revenue/transactions');
      setRevenueTxList(listRes.data.revenue || []);
    } catch (err: any) {
      triggerNotification('error', 'Failed to retrieve revenue analytics records.');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await adminClient.get('/api/admin/reports');
      setReports(res.data.reports || []);
    } catch (err: any) {
      triggerNotification('error', 'Failed to load reported players log.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await adminClient.get('/api/admin/support/tickets');
      setTickets(res.data.tickets || []);
    } catch (err: any) {
      triggerNotification('error', 'Failed to load open support tickets.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await adminClient.get('/api/admin/admins');
      setAdminsList(res.data.admins || []);
    } catch (err: any) {
      triggerNotification('error', 'Failed to fetch administrative staff details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await adminClient.get('/api/admin/audit-logs');
      setAuditLogs(res.data.logs || []);
    } catch (err: any) {
      triggerNotification('error', 'Failed to pull administrative audit trails.');
    } finally {
      setLoading(false);
    }
  };

  // Run initial loadings based on tabs
  useEffect(() => {
    if (!admin) {
      navigate('/admin/login');
      return;
    }
    setError(null);
    setSuccess(null);

    switch (activeTab) {
      case 'overview':
        fetchStats();
        break;
      case 'users':
        fetchUsers();
        setSelectedUser(null);
        break;
      case 'withdrawals':
        fetchWithdrawals();
        setSelectedWithdrawal(null);
        break;
      case 'deposits':
        fetchDeposits();
        break;
      case 'matches':
        fetchMatches();
        setSelectedMatch(null);
        break;
      case 'revenue':
        fetchRevenue();
        break;
      case 'moderation':
        fetchReports();
        setSelectedReport(null);
        break;
      case 'support':
        fetchTickets();
        setSelectedTicket(null);
        break;
      case 'admin-team':
        if (admin.role === 'super_admin') {
          fetchStaff();
        }
        break;
      case 'audit-logs':
        if (admin.role === 'super_admin') {
          fetchAuditLogs();
        }
        break;
    }
  }, [activeTab]);

  const handleManualLogout = () => {
    adminLogout();
    navigate('/admin/login');
  };

  // ==========================================
  // ACTION HANDLERS
  // ==========================================

  // A. USER ACTIONS
  const handleUserSuspend = async (userId: string) => {
    if (!suspensionReason) return alert('Kindly type down a clear suspension reason first.');
    try {
      await adminClient.post(`/api/admin/users/${userId}/suspend`, {
        reason: suspensionReason,
        durationMinutes: parseInt(suspensionDuration, 10)
      });
      triggerNotification('success', 'User suspended successfully.');
      fetchUsers();
      setSelectedUser(null);
      setSuspensionReason('');
    } catch (err: any) {
      triggerNotification('error', err.response?.data?.error || 'Failed to apply account suspension.');
    }
  };

  const handleUserUnsuspend = async (userId: string) => {
    try {
      await adminClient.post(`/api/admin/users/${userId}/unsuspend`);
      triggerNotification('success', 'Account suspension status revoked.');
      fetchUsers();
      setSelectedUser(null);
    } catch (err: any) {
      triggerNotification('error', 'Failed to resume account access.');
    }
  };

  const handleUserBan = async (userId: string) => {
    if (!banReason) return alert('Enter a reason for permanent deactivation.');
    if (!window.confirm('Are you absolutely certain you wish to permanently ban this player account?')) return;
    try {
      await adminClient.post(`/api/admin/users/${userId}/ban`, { reason: banReason });
      triggerNotification('success', 'User permanently banned.');
      fetchUsers();
      setSelectedUser(null);
      setBanReason('');
    } catch (err: any) {
      triggerNotification('error', 'Failed to apply permanent exclusion lock.');
    }
  };

  const handleUserUnban = async (userId: string) => {
    try {
      await adminClient.post(`/api/admin/users/${userId}/unban`);
      triggerNotification('success', 'Permanent ban flag successfully cleared.');
      fetchUsers();
      setSelectedUser(null);
    } catch (err: any) {
      triggerNotification('error', 'Failed to lift exclusion rule.');
    }
  };

  const handleKycStatus = async (userId: string, isApprove: boolean) => {
    const status = isApprove ? 'verified' : 'rejected';
    if (!isApprove && !kycRejectionReason) {
      return alert('Enter a KYC decline explanation reason.');
    }
    try {
      await adminClient.put(`/api/admin/users/${userId}/kyc`, {
        status,
        reason: isApprove ? null : kycRejectionReason
      });
      triggerNotification('success', `KYC submission successfully updated to: ${status}`);
      fetchUsers();
      setSelectedUser(null);
      setKycRejectionReason('');
    } catch (err: any) {
      triggerNotification('error', 'Failed to modify credentials review status.');
    }
  };

  // B. WITHDRAWAL ACTIONS
  const handleWithdrawalProcess = async (id: string, action: 'approve' | 'processing' | 'complete' | 'reject') => {
    try {
      const endpointMap = {
        approve: 'approve',
        processing: 'processing',
        complete: 'complete',
        reject: 'reject'
      };

      const payload = action === 'reject' ? { reason: withdrawalRejectionReason } : {};
      if (action === 'reject' && !withdrawalRejectionReason) {
        return alert('Please supply a rejection reason text.');
      }

      await adminClient.post(`/api/admin/withdrawals/${id}/${endpointMap[action]}`, payload);
      triggerNotification('success', `Withdrawal updated to: ${action}`);
      fetchWithdrawals();
      setSelectedWithdrawal(null);
      setWithdrawalRejectionReason('');
    } catch (err: any) {
      triggerNotification('error', err.response?.data?.error || 'Operation failed on this payout transaction.');
    }
  };

  const handleSaveWithdrawalNote = async (id: string) => {
    try {
      await adminClient.put(`/api/admin/withdrawals/${id}/note`, { note: withdrawalNote });
      triggerNotification('success', 'Administrative note saved to request index.');
    } catch (err: any) {
      triggerNotification('error', 'Failed to store changes.');
    }
  };

  // C. DEPOSIT ACTIONS
  const handleVerifyDeposit = async (id: string) => {
    try {
      await adminClient.post(`/api/admin/deposits/${id}/verify`);
      triggerNotification('success', 'Verified and compiled deposit transactions successfully.');
      fetchDeposits();
    } catch (err: any) {
      triggerNotification('error', err.response?.data?.error || 'Verification lookup failed on Paystack servers.');
    }
  };

  // D. ACTIVE MATCH FORCE TERMINATE
  const handleForceEndMatch = async (matchId: string) => {
    if (!matchCancelReason) return alert('Explain why we are force-canceling this match.');
    if (!window.confirm('Action will forcefully terminate this active duel and return ALL locked kobo wagers to players. Continue?')) return;
    try {
      await adminClient.post(`/api/admin/matches/${matchId}/force-end`, { reason: matchCancelReason });
      triggerNotification('success', 'Match terminated. Locked token wagers returned.');
      fetchMatches();
      setSelectedMatch(null);
      setMatchCancelReason('');
    } catch (err: any) {
      triggerNotification('error', 'Failed to execute structural match shutdown.');
    }
  };

  // E. PLAYER REPORT RESOLUTIONS
  const handleResolveReport = async (reportId: string, isDismiss: boolean) => {
    if (!reportResolution) return alert('Enter a resolution note.');
    try {
      if (isDismiss) {
        await adminClient.post(`/api/admin/reports/${reportId}/dismiss`, { note: reportResolution });
      } else {
        await adminClient.post(`/api/admin/reports/${reportId}/resolve`, {
          note: reportResolution,
          action: reportAdminAction
        });
      }
      triggerNotification('success', 'Incident ticket resolved.');
      fetchReports();
      setSelectedReport(null);
      setReportResolution('');
    } catch (err: any) {
      triggerNotification('error', 'Failed to settle report ticket state.');
    }
  };

  // F. HELP DESK REPLY
  const handleReplyTicket = async (ticketId: string) => {
    if (!ticketReplyText) return alert('Type down reply text before submitting.');
    try {
      await adminClient.post(`/api/admin/support/tickets/${ticketId}/reply`, { reply: ticketReplyText });
      triggerNotification('success', 'Support request replied and closed.');
      fetchTickets();
      setSelectedTicket(null);
      setTicketReplyText('');
    } catch (err: any) {
      triggerNotification('error', 'Failed to post ticket feedback.');
    }
  };

  // G. PROVISION ASSISTING ADMINS
  const handleCreateHelperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminClient.post('/api/admin/admins', {
        email: newAdminEmail,
        password: newAdminPassword,
        name: newAdminName,
        role: newAdminRole
      });
      triggerNotification('success', 'Assisting Administrator account successfully provisioned.');
      fetchStaff();
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminName('');
    } catch (err: any) {
      triggerNotification('error', err.response?.data?.error || 'Failed to register helper profile.');
    }
  };

  const handleToggleAdminStatus = async (staffId: string, isActive: boolean) => {
    try {
      const endpointAction = isActive ? 'deactivate' : 'reactivate';
      await adminClient.put(`/api/admin/admins/${staffId}/${endpointAction}`);
      triggerNotification('success', `Administrator status set to: ${isActive ? 'Deactivated' : 'Active'}`);
      fetchStaff();
    } catch (err: any) {
      triggerNotification('error', err.response?.data?.error || 'Role deactivation bypass error.');
    }
  };

  return (
    <div className="flex bg-neutral-950 text-neutral-100 min-h-screen">
      {/* 1. SIDEBAR NAVIGATION CONTROLS */}
      <aside className="w-68 border-r border-neutral-900 bg-neutral-900/50 flex flex-col justify-between" id="admin_sidebar">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8 select-none">
            <div className="p-2 bg-orange-600 rounded">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold tracking-wider text-sm text-neutral-200">DEEGAMES</h1>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest leading-none">Control Tower</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded font-medium text-xs tracking-wide transition ${
                activeTab === 'overview' ? 'bg-orange-600 text-white' : 'text-neutral-400 hover:bg-neutral-850 hover:text-neutral-200'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded font-medium text-xs tracking-wide transition ${
                activeTab === 'users' ? 'bg-orange-600 text-white' : 'text-neutral-400 hover:bg-neutral-850 hover:text-neutral-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Players & Access</span>
            </button>

            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded font-medium text-xs tracking-wide transition ${
                activeTab === 'withdrawals' ? 'bg-orange-600 text-white' : 'text-neutral-400 hover:bg-neutral-850 hover:text-neutral-200'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Payouts Queue</span>
            </button>

            <button
              onClick={() => setActiveTab('deposits')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded font-medium text-xs tracking-wide transition ${
                activeTab === 'deposits' ? 'bg-orange-600 text-white' : 'text-neutral-400 hover:bg-neutral-850 hover:text-neutral-200'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Deposits Logger</span>
            </button>

            <button
              onClick={() => setActiveTab('matches')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded font-medium text-xs tracking-wide transition ${
                activeTab === 'matches' ? 'bg-orange-600 text-white' : 'text-neutral-400 hover:bg-neutral-850 hover:text-neutral-200'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>Live Matches</span>
            </button>

            <button
              onClick={() => setActiveTab('revenue')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded font-medium text-xs tracking-wide transition ${
                activeTab === 'revenue' ? 'bg-orange-600 text-white' : 'text-neutral-400 hover:bg-neutral-850 hover:text-neutral-200'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>House Revenue</span>
            </button>

            <button
              onClick={() => setActiveTab('moderation')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded font-medium text-xs tracking-wide transition ${
                activeTab === 'moderation' ? 'bg-orange-600 text-white' : 'text-neutral-400 hover:bg-neutral-850 hover:text-neutral-200'
              }`}
            >
              <Flag className="w-4 h-4" />
              <span>Abuse Reports</span>
            </button>

            <button
              onClick={() => setActiveTab('support')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded font-medium text-xs tracking-wide transition ${
                activeTab === 'support' ? 'bg-orange-600 text-white' : 'text-neutral-400 hover:bg-neutral-850 hover:text-neutral-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Support Desk</span>
            </button>

            {admin?.role === 'super_admin' && (
              <>
                <div className="pt-4 pb-2 text-[10px] uppercase font-bold tracking-wider text-neutral-600 select-none">
                  Super Administrative
                </div>

                <button
                  onClick={() => setActiveTab('admin-team')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded font-medium text-xs tracking-wide transition ${
                    activeTab === 'admin-team' ? 'bg-orange-600 text-white' : 'text-neutral-400 hover:bg-neutral-850 hover:text-neutral-200'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Admin Team</span>
                </button>

                <button
                  onClick={() => setActiveTab('audit-logs')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded font-medium text-xs tracking-wide transition ${
                    activeTab === 'audit-logs' ? 'bg-orange-600 text-white' : 'text-neutral-400 hover:bg-neutral-850 hover:text-neutral-200'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Audit Logs</span>
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="p-6 border-t border-neutral-900">
          <div className="flex items-center gap-3 mb-4 select-none">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-neutral-800 border border-orange-500/30 flex items-center justify-center font-bold text-xs text-orange-500">
                {admin?.name?.charAt(0)}
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-neutral-900 rounded-full"></div>
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-neutral-200 leading-none truncate">{admin?.name}</p>
              <p className="text-[10px] text-neutral-500 uppercase mt-1 truncate">{admin?.role?.replace('_', ' ')}</p>
            </div>
          </div>

          <button
            onClick={handleManualLogout}
            className="w-full py-2 bg-neutral-900 hover:bg-neutral-850 rounded border border-neutral-800 text-xs text-red-400 hover:text-red-300 transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Power Down</span>
          </button>
        </div>
      </aside>

      {/* 2. BODY CONTENT */}
      <main className="flex-1 flex flex-col min-w-0" id="admin_main_stage">
        {/* TOP BAR / ALERTS HEADER */}
        <header className="px-8 py-4 border-b border-neutral-900 flex justify-between items-center bg-neutral-900/30">
          <div>
            <h2 className="text-lg font-bold tracking-tight uppercase text-neutral-250">
              {activeTab.replace('-', ' ')} PANEL
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">DeeGames Control Stage</p>
          </div>

          <div className="flex items-center gap-4">
            {loading && (
              <span className="text-xs text-orange-500 flex items-center gap-1.5 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Syncing Database...</span>
              </span>
            )}
          </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto">
          {/* TOASTER FEEDBACK BLOCKS */}
          {error && (
            <div className="mb-6 p-4 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 rounded bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium flex items-center gap-3">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* ==========================================
              SUB-TAB CONTENT DISPATCHER
          ========================================== */}

          {/* A. OVERVIEW STATS SUB-TAB */}
          {activeTab === 'overview' && stats && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg">
                  <p className="text-xs uppercase font-bold text-neutral-500 tracking-wider">Registered Players</p>
                  <p className="text-3xl font-extrabold text-neutral-100 mt-2">{stats.totalUsers}</p>
                  <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                    <span>+{stats.usersToday} joined today</span>
                  </p>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg">
                  <p className="text-xs uppercase font-bold text-neutral-500 tracking-wider">Deposited Today</p>
                  <p className="text-3xl font-extrabold text-neutral-100 mt-2">₦{Number(stats.depositsToday).toLocaleString()}</p>
                  <p className="text-xs text-neutral-500 mt-1">This Month: ₦{Number(stats.depositsThisMonth).toLocaleString()}</p>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg">
                  <p className="text-xs uppercase font-bold text-neutral-500 tracking-wider">Withdrawals Paid</p>
                  <p className="text-3xl font-extrabold text-neutral-100 mt-2">₦{Number(stats.withdrawalsToday).toLocaleString()}</p>
                  <p className="text-xs text-neutral-500 mt-1">Pending approval: {stats.pendingWithdrawalsCount} req</p>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg">
                  <p className="text-xs uppercase font-bold text-neutral-500 tracking-wider">House Revenue (all-time)</p>
                  <p className="text-3xl font-extrabold text-orange-500 mt-2">₦{Number(stats.revenueAllTime).toLocaleString()}</p>
                  <p className="text-xs text-neutral-500 mt-1">Today: ₦{Number(stats.revenueToday).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                  <h3 className="font-bold text-sm uppercase tracking-wider mb-4">Operations Queue Warnings</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3.5 bg-neutral-950 border border-neutral-850 rounded">
                      <div className="flex items-center gap-3 text-xs">
                        <Wallet className="w-4 h-4 text-orange-500" />
                        <span>Pending Withdrawal payout approvals</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${stats.pendingWithdrawalsCount > 0 ? 'bg-red-500/10 text-red-400' : 'bg-neutral-800 text-neutral-500'}`}>
                        {stats.pendingWithdrawalsCount} Pending
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-neutral-950 border border-neutral-850 rounded">
                      <div className="flex items-center gap-3 text-xs">
                        <Flag className="w-4 h-4 text-orange-500" />
                        <span>Abuse & cheating reports awaiting review</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${stats.unreviewedReportsCount > 0 ? 'bg-red-500/10 text-red-400' : 'bg-neutral-800 text-neutral-500'}`}>
                        {stats.unreviewedReportsCount} Open
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-neutral-950 border border-neutral-850 rounded">
                      <div className="flex items-center gap-3 text-xs">
                        <MessageSquare className="w-4 h-4 text-orange-500" />
                        <span>Support tickets open awaiting response</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${stats.openSupportTicketsCount > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-neutral-800 text-neutral-500'}`}>
                        {stats.openSupportTicketsCount} Unresolved
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm uppercase tracking-wider mb-4 font-sans text-neutral-350">Quick Match Index</h3>
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <div className="w-16 h-16 rounded-full bg-orange-600/10 border-2 border-orange-500/20 flex items-center justify-center mb-3">
                        <Play className="w-6 h-6 text-orange-500 fill-orange-500/10" />
                      </div>
                      <p className="text-2xl font-black">{stats.activeMatches}</p>
                      <p className="text-xs text-neutral-500 mt-1">Ongoing Battles in Rooms</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('matches')}
                    className="w-full py-2 bg-neutral-950 border border-neutral-850 hover:bg-neutral-850 hover:text-white transition rounded text-xs"
                  >
                    Watch Matches Room
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* B. PLAYERS & ACCESS MODULE */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center gap-4 bg-neutral-900 p-4 border border-neutral-800 rounded-lg">
                <div className="flex-1 max-w-sm relative">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search name, phone, email..."
                    className="w-full pl-9 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 text-xs rounded text-neutral-100 placeholder-neutral-500"
                  />
                  <Search className="absolute left-3 top-3 w-3.5 h-3.5 text-neutral-500" />
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="bg-neutral-950 border border-neutral-800 text-neutral-400 text-xs rounded px-3 py-2.5 focus:outline-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active Accounts</option>
                    <option value="suspended">Suspended Accounts</option>
                    <option value="banned">Permanently Banned</option>
                  </select>

                  <button
                    onClick={fetchUsers}
                    className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-xs transition rounded font-semibold"
                  >
                    Search
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-850 bg-neutral-950/20 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                        <th className="p-4">Profile</th>
                        <th className="p-4">Email / Phone</th>
                        <th className="p-4">KYC / Wallet</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900 text-xs">
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-neutral-500">
                            No registered player records matching filters found.
                          </td>
                        </tr>
                      ) : (
                        users.map((plr) => (
                          <tr key={plr.id} className="hover:bg-neutral-850/20 text-neutral-300">
                            <td className="p-4">
                              <div>
                                <p className="font-bold text-neutral-100">{plr.username || plr.full_name || 'No Name'}</p>
                                <p className="text-[10px] text-neutral-500 mt-1">Joined {new Date(plr.created_at).toLocaleDateString()}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="font-mono">{plr.email}</p>
                              <p className="text-[10px] text-neutral-500 mt-0.5">{plr.phone || 'no phone'}</p>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] block w-fit font-bold ${
                                plr.kyc_status === 'verified' ? 'bg-green-500/10 text-green-400' :
                                plr.kyc_status === 'rejected' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                KYC: {plr.kyc_status || 'pending'}
                              </span>
                              <p className="mt-1 font-bold">₦{Number(plr.wallets?.[0]?.total_balance || 0).toLocaleString()}</p>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => setSelectedUser(plr)}
                                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 hover:text-white rounded transition text-[11px]"
                              >
                                Manage Access
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* USER CONFIGURATION FLYOUT CARD */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                  {selectedUser ? (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-bold text-sm tracking-wide text-neutral-200">Manage: {selectedUser.username}</h4>
                        <p className="text-[10px] text-neutral-500 font-mono mt-1 break-all">ID: {selectedUser.id}</p>
                      </div>

                      {/* Active Exclusion States */}
                      <div className="space-y-1">
                        {selectedUser.is_banned ? (
                          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded text-xs flex gap-2">
                            <XCircle className="w-4 h-4 flex-shrink-0" />
                            <div>
                              <p className="font-bold">Permanently Banned</p>
                              <p className="text-[10px] mt-0.5">Reason: "{selectedUser.ban_reason}"</p>
                            </div>
                          </div>
                        ) : selectedUser.is_suspended ? (
                          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded text-xs flex gap-2">
                            <Clock className="w-4 h-4 flex-shrink-0" />
                            <div>
                              <p className="font-bold">Suspended</p>
                              <p className="text-[10px] mt-0.5">Reason: "{selectedUser.suspension_reason}"</p>
                              {selectedUser.suspension_expires_at && (
                                <p className="text-[9px] text-neutral-450 mt-0.5">Expires: {new Date(selectedUser.suspension_expires_at).toLocaleString()}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded text-xs flex gap-2">
                            <CheckCircle className="w-4 h-4" />
                            <span>This account holds all active privileges.</span>
                          </div>
                        )}
                      </div>

                      {/* Access Actions */}
                      <div className="space-y-4 pt-4 border-t border-neutral-850">
                        {/* SUSPEND */}
                        {!selectedUser.is_banned && !selectedUser.is_suspended && (
                          <div className="space-y-3">
                            <h5 className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Suspend Player Access</h5>
                            <input
                              type="text"
                              value={suspensionReason}
                              onChange={(e) => setSuspensionReason(e.target.value)}
                              placeholder="Explanation for suspension..."
                              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 text-xs rounded text-neutral-100 placeholder-neutral-500"
                            />
                            <div className="flex gap-2">
                              <select
                                value={suspensionDuration}
                                onChange={(e) => setSuspensionDuration(e.target.value)}
                                className="bg-neutral-950 border border-neutral-800 text-xs text-neutral-400 rounded px-2.5 py-1.5"
                              >
                                <option value="60">1 Hour</option>
                                <option value="1440">24 Hours</option>
                                <option value="10080">7 Days</option>
                                <option value="43200">30 Days</option>
                              </select>
                              <button
                                onClick={() => handleUserSuspend(selectedUser.id)}
                                className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-xs font-semibold text-white rounded transition"
                              >
                                Suspend Account
                              </button>
                            </div>
                          </div>
                        )}

                        {selectedUser.is_suspended && (
                          <button
                            onClick={() => handleUserUnsuspend(selectedUser.id)}
                            className="w-full py-2.5 bg-neutral-850 hover:bg-neutral-800 text-xs font-semibold text-green-400 border border-neutral-800 rounded transition"
                          >
                            Lift Account Suspension
                          </button>
                        )}

                        {/* BAN / UNBAN */}
                        {!selectedUser.is_banned ? (
                          <div className="space-y-3">
                            <h5 className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Permanent Platform Exclusion</h5>
                            <input
                              type="text"
                              value={banReason}
                              onChange={(e) => setBanReason(e.target.value)}
                              placeholder="Reason for permanent Ban..."
                              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 text-xs rounded text-neutral-100 placeholder-neutral-500"
                            />
                            <button
                              onClick={() => handleUserBan(selectedUser.id)}
                              className="w-full py-2 bg-red-600 hover:bg-red-700 text-xs font-semibold text-white rounded transition"
                            >
                              Ban Permanently
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleUserUnban(selectedUser.id)}
                            className="w-full py-2.5 bg-neutral-850 hover:bg-neutral-800 text-xs font-semibold text-orange-400 border border-neutral-800 rounded transition"
                          >
                            Revoke Permanent Ban
                          </button>
                        )}
                      </div>

                      {/* KYC MODIFICATION BOX */}
                      {selectedUser.kyc_status !== 'verified' && (
                        <div className="pt-4 border-t border-neutral-850 space-y-3">
                          <h5 className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Handle KYC Review</h5>
                          <input
                            type="text"
                            value={kycRejectionReason}
                            onChange={(e) => setKycRejectionReason(e.target.value)}
                            placeholder="Decline explanation note..."
                            className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 text-xs rounded text-neutral-100 placeholder-neutral-500"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleKycStatus(selectedUser.id, false)}
                              className="flex-1 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs rounded border border-red-500/10 transition"
                            >
                              Decline KYC
                            </button>
                            <button
                              onClick={() => handleKycStatus(selectedUser.id, true)}
                              className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-xs text-white rounded transition"
                            >
                              Verify KYC
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-16 text-neutral-500">
                      <Shield className="w-8 h-8 opacity-20 mb-3 text-orange-500" />
                      <p className="text-xs">Select any Player Profile card to manage accounts exclusion settings and KYC verification.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* C. PAYOUTS QUEUE PROCESS */}
          {activeTab === 'withdrawals' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between bg-neutral-900 p-4 border border-neutral-800 rounded-lg">
                <div className="flex gap-3">
                  {['pending', 'approved', 'processing', 'successful', 'rejected'].map((stat) => (
                    <button
                      key={stat}
                      onClick={() => setWithdrawalStatusFilter(stat)}
                      className={`px-3 py-1.5 rounded text-xs capitalize transition ${
                        withdrawalStatusFilter === stat ? 'bg-orange-600 text-white font-bold' : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {stat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-850 bg-neutral-950/20 text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-sans">
                        <th className="p-4">Reference / Player</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Requested At</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900 text-xs">
                      {withdrawals.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-neutral-500">
                            No matching payout records currently found.
                          </td>
                        </tr>
                      ) : (
                        withdrawals.map((w) => (
                          <tr key={w.id} className="hover:bg-neutral-850/20 text-neutral-300">
                            <td className="p-4">
                              <div>
                                <p className="font-bold text-neutral-100 uppercase tracking-wide font-mono">{w.internal_reference}</p>
                                <p className="text-[10px] text-neutral-500 mt-0.5">{w.users?.username || 'No user info'}</p>
                              </div>
                            </td>
                            <td className="p-4 font-bold text-white">
                              ₦{Number(w.amount).toLocaleString()}
                            </td>
                            <td className="p-4 text-neutral-400">
                              {new Date(w.requested_at).toLocaleString()}
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedWithdrawal(w);
                                  setWithdrawalNote(w.admin_note || '');
                                }}
                                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-[11px] rounded transition"
                              >
                                Process
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* WITHDRAWAL PROCESS CARD */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                  {selectedWithdrawal ? (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-bold text-sm text-neutral-200 uppercase tracking-wide font-mono">Process: {selectedWithdrawal.internal_reference}</h4>
                        <p className="text-xs text-neutral-400 mt-2 font-semibold">User: {selectedWithdrawal.users?.username}</p>
                      </div>

                      {/* Bank details check */}
                      <div className="p-3.5 bg-neutral-950 border border-neutral-850 rounded space-y-1.5">
                        <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Settlement Target Account</p>
                        {selectedWithdrawal.payout_accounts ? (
                          <div className="text-xs space-y-1">
                            <p className="font-bold text-neutral-300">{selectedWithdrawal.payout_accounts.bank_name}</p>
                            <p className="font-mono text-neutral-100">{selectedWithdrawal.payout_accounts.account_number}</p>
                            <p className="text-neutral-400">{selectedWithdrawal.payout_accounts.account_name}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-red-400">Missing payout account info.</p>
                        )}
                      </div>

                      {/* Note section */}
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-neutral-400">Admin Note</label>
                        <textarea
                          value={withdrawalNote}
                          onChange={(e) => setWithdrawalNote(e.target.value)}
                          placeholder="Internal admin reference codes..."
                          className="w-full h-15 p-2 bg-neutral-950 border border-neutral-800 rounded text-xs focus:outline-none placeholder-neutral-600"
                        />
                        <button
                          onClick={() => handleSaveWithdrawalNote(selectedWithdrawal.id)}
                          className="w-full py-1.5 bg-neutral-850 hover:bg-neutral-800 text-[10px] border border-neutral-800 rounded text-neutral-300 font-bold tracking-wide transition"
                        >
                          Save Internal Notes
                        </button>
                      </div>

                      {/* Stage management buttons */}
                      <div className="space-y-4 pt-4 border-t border-neutral-850">
                        {/* PENDING APPROVE FLOW */}
                        {selectedWithdrawal.status === 'pending' && (
                          <button
                            onClick={() => handleWithdrawalProcess(selectedWithdrawal.id, 'approve')}
                            className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-xs font-bold text-white rounded transition"
                          >
                            Approve Payout
                          </button>
                        )}

                        {/* APPROVED TO PROCESSING FLOW */}
                        {selectedWithdrawal.status === 'approved' && (
                          <button
                            onClick={() => handleWithdrawalProcess(selectedWithdrawal.id, 'processing')}
                            className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-xs font-bold text-white rounded transition"
                          >
                            Set to 'Processing' State
                          </button>
                        )}

                        {/* PROGRESS TO FINAL SUCCESS FLOW */}
                        {(selectedWithdrawal.status === 'processing' || selectedWithdrawal.status === 'approved' || selectedWithdrawal.status === 'pending') && (
                          <button
                            onClick={() => handleWithdrawalProcess(selectedWithdrawal.id, 'complete')}
                            className="w-full py-2 bg-green-600 hover:bg-green-700 text-xs font-bold text-white rounded transition"
                          >
                            Deduct & Complete Withdrawal
                          </button>
                        )}

                        {/* EXCLUSION REJECT FLOW */}
                        {selectedWithdrawal.status !== 'successful' && selectedWithdrawal.status !== 'rejected' && (
                          <div className="pt-4 border-t border-neutral-850 space-y-2">
                            <p className="text-[10px] uppercase font-bold text-neutral-400">Reject / Cancel Payout (Refund wallets)</p>
                            <input
                              type="text"
                              value={withdrawalRejectionReason}
                              onChange={(e) => setWithdrawalRejectionReason(e.target.value)}
                              placeholder="Type reason for decline..."
                              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 text-xs rounded text-neutral-100 placeholder-neutral-500"
                            />
                            <button
                              onClick={() => handleWithdrawalProcess(selectedWithdrawal.id, 'reject')}
                              className="w-full py-2 bg-red-600 hover:bg-red-700 text-xs text-white rounded font-bold transition"
                            >
                              Reject & Return Funds
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-20 text-neutral-500">
                      <Wallet className="w-8 h-8 opacity-20 mb-3 text-orange-500" />
                      <p className="text-xs">Select any payout request cards, type references, and approve settlements/reconciliations.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* D. DEPOSITS CHECK SUB-TAB */}
          {activeTab === 'deposits' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg flex gap-4 max-w-md">
                <input
                  type="text"
                  value={depositSearch}
                  onChange={(e) => setDepositSearch(e.target.value)}
                  placeholder="Enter Paystack/Internal reference..."
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs placeholder-neutral-600 focus:outline-none"
                />
                <button
                  onClick={fetchDeposits}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-xs text-white rounded transition"
                >
                  Lookup Tx
                </button>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-850 bg-neutral-950/20 text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-sans">
                      <th className="p-4">Reference (Internal)</th>
                      <th className="p-4">Player</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Paystack Status</th>
                      <th className="p-4 text-right font-bold">Manual Trigger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900 text-xs">
                    {deposits.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-neutral-500">
                          No deposit transactions logs captured matching index filters.
                        </td>
                      </tr>
                    ) : (
                      deposits.map((d) => (
                        <tr key={d.id} className="hover:bg-neutral-850/20 text-neutral-300">
                          <td className="p-4">
                            <span className="font-bold text-neutral-100 font-mono tracking-wider">{d.internal_reference}</span>
                          </td>
                          <td className="p-4">{d.users?.username || 'Guest/Unsaved'}</td>
                          <td className="p-4 font-bold">₦{Number(d.amount).toLocaleString()}</td>
                          <td className="p-4 text-neutral-401">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              d.status === 'successful' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-500'
                            }`}>
                              {d.status || 'pending'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {d.status !== 'successful' && (
                              <button
                                onClick={() => handleVerifyDeposit(d.id)}
                                className="px-3 py-1 bg-orange-600 hover:bg-orange-700 font-semibold text-[10px] rounded text-white transition inline-flex items-center gap-1"
                              >
                                <RefreshCw className="w-3 h-3 animate-spin duration-1500" />
                                <span>Verify paystack API</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* E. LIVE MATCHES DIVISION */}
          {activeTab === 'matches' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Active matches list */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                    <h3 className="font-bold text-sm uppercase tracking-wider mb-4 border-b border-neutral-850 pb-2 text-neutral-300">Active Game Arenas</h3>
                    <div className="divide-y divide-neutral-850">
                      {activeMatches.length === 0 ? (
                        <p className="text-neutral-500 text-xs py-4 text-center">No active matches rooms are running combat transactions in database.</p>
                      ) : (
                        activeMatches.map((m) => (
                          <div key={m.id} className="flex justify-between items-center py-4">
                            <div>
                              <p className="font-bold text-xs text-neutral-200">
                                {m.game_types?.name} Match (Wager: ₦{m.amount})
                              </p>
                              <p className="text-[10px] text-neutral-500 mt-1 font-mono">{m.id}</p>
                              <div className="flex gap-1.5 mt-2">
                                {m.match_participants?.map((p: any, idx: number) => (
                                  <span key={idx} className="px-1.5 py-0.5 bg-neutral-950 rounded text-[9px] text-neutral-400 border border-neutral-850">
                                    {p.users?.username}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <button
                              onClick={() => setSelectedMatch(m)}
                              className="px-3 py-1.5 bg-neutral-800 hover:bg-red-600 hover:text-white rounded text-xs font-semibold transition"
                            >
                              Intervene Match
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Completed matches logs */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                    <h3 className="font-bold text-sm uppercase tracking-wider mb-4 border-b border-neutral-850 pb-2 text-neutral-300">Finished Matches History</h3>
                    <div className="divide-y divide-neutral-850 max-h-96 overflow-y-auto">
                      {finishedMatches.length === 0 ? (
                        <p className="text-neutral-500 text-xs py-4 text-center">History queue is empty.</p>
                      ) : (
                        finishedMatches.map((m) => (
                          <div key={m.id} className="flex justify-between items-center py-4">
                            <div>
                              <p className="font-bold text-xs text-neutral-200">
                                {m.game_types?.name} (Wager: ₦{m.amount})
                              </p>
                              <p className="text-[10px] text-neutral-500 mt-1">Status: <span className="text-green-500 capitalize">{m.status}</span></p>
                            </div>
                            <div className="text-right text-[10px] text-neutral-500 font-mono">
                              <p>Ended: {new Date(m.finished_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Match override card */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                  {selectedMatch ? (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-bold text-sm text-neutral-200">Reconcile Arena Duel</h4>
                        <p className="text-xs font-mono text-neutral-500 mt-1 break-all">{selectedMatch.id}</p>
                      </div>

                      <div className="p-3 bg-neutral-950 border border-neutral-850 rounded text-xs space-y-1 text-neutral-400">
                        <p className="font-bold text-neutral-300 mb-1 leading-none uppercase text-[10px]">Wager Fee Detail</p>
                        <p>Total Locked Amount: <span className="font-bold text-white">₦{selectedMatch.amount}</span></p>
                        <p>Total Contenders enrolled: {selectedMatch.match_participants?.length || 0}</p>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-neutral-850">
                        <h5 className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Force Terminate & Refund Match</h5>
                        <input
                          type="text"
                          value={matchCancelReason}
                          onChange={(e) => setMatchCancelReason(e.target.value)}
                          placeholder="Explanatory cancellation reason..."
                          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 text-xs rounded text-neutral-100 placeholder-neutral-500 fill-neutral-900"
                        />
                        <button
                          onClick={() => handleForceEndMatch(selectedMatch.id)}
                          className="w-full py-2 bg-red-600 hover:bg-red-700 text-xs font-bold text-white rounded transition"
                        >
                          Force Quit & Refund Players
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-20 text-neutral-500">
                      <Play className="w-8 h-8 opacity-20 mb-3 text-orange-500" />
                      <p className="text-xs">Pick any actively listed match arena on the left side, audit active participants, or force refund in disputes.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* F. REVENUE MODULE */}
          {activeTab === 'revenue' && revenueSummary && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                  <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Deposited Platform Commissions Today</p>
                  <p className="text-3xl font-extrabold text-orange-500 mt-2">₦{Number(revenueSummary.summary?.todayRevenue || 0).toLocaleString()}</p>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                  <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Commissions This Month</p>
                  <p className="text-3xl font-extrabold text-white mt-2">₦{Number(revenueSummary.summary?.monthRevenue || 0).toLocaleString()}</p>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                  <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Total Accumulated Commissions Pool</p>
                  <p className="text-3xl font-extrabold text-green-400 mt-2">₦{Number(revenueSummary.summary?.allTimeRevenue || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* By Title Split and Transactions ledger list */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                  <h3 className="font-bold text-sm uppercase tracking-wider mb-4 border-b border-neutral-850 pb-2 text-neutral-300">Revenue share by Game category</h3>
                  <div className="space-y-3.5 text-xs text-neutral-300">
                    {Object.entries(revenueSummary.byGame || {}).map(([g, r]: any) => (
                      <div key={g} className="flex justify-between items-center bg-neutral-950 p-2.5 rounded border border-neutral-850">
                        <span>{g}</span>
                        <span className="font-bold text-orange-500">₦{Number(r).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <h3 className="font-bold text-sm uppercase tracking-wider mt-8 mb-4 border-b border-neutral-850 pb-2 text-neutral-300 font-sans">Revenue grouped by Room Class</h3>
                  <div className="space-y-3.5 text-xs text-neutral-300">
                    {Object.entries(revenueSummary.byRoom || {}).map(([tier, val]: any) => (
                      <div key={tier} className="flex justify-between items-center bg-neutral-950 p-2.5 rounded border border-neutral-800">
                        <span>{tier}</span>
                        <span className="font-bold text-white">₦{Number(val).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                  <h3 className="font-bold text-sm uppercase tracking-wider mb-4 border-b border-neutral-850 pb-2 text-neutral-300">Commissions Settlement Ledger</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs divide-y divide-neutral-900">
                      <thead>
                        <tr className="border-b border-neutral-850 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                          <th className="py-2.5">Related Match</th>
                          <th className="py-2.5">Commission Kobo Credit</th>
                          <th className="py-2.5 text-right">Settled Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-900 text-neutral-400">
                        {revenueTxList.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="p-4 text-center text-neutral-600">Commissions index logs empty.</td>
                          </tr>
                        ) : (
                          revenueTxList.map((tx) => (
                            <tr key={tx.id}>
                              <td className="py-3 font-mono text-[11px]">{tx.matches?.game_types?.name} ({tx.matches?.id?.substring(0, 8)}...)</td>
                              <td className="py-3 font-bold text-neutral-200">₦{(Number(tx.amount_kobo) / 100.0).toLocaleString()}</td>
                              <td className="py-3 text-right text-neutral-500">{new Date(tx.created_at).toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* G. MODERATION CONFLICTS */}
          {activeTab === 'moderation' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-850 bg-neutral-950/20 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                        <th className="p-4">Offense Reason</th>
                        <th className="p-4">Reporter / Reported</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Review</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900 text-xs text-neutral-300">
                      {reports.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-neutral-500">
                            Awaiting queue is dry. Clean record indicators.
                          </td>
                        </tr>
                      ) : (
                        reports.map((r) => (
                          <tr key={r.id} className="hover:bg-neutral-850/20">
                            <td className="p-4 font-bold text-neutral-200">{r.reason}</td>
                            <td className="p-4">
                              <p>By: {r.reporter?.username}</p>
                              <p className="text-[10px] text-red-400 font-bold mt-0.5">Target: {r.reported?.username}</p>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] capitalize font-bold ${
                                r.status === 'resolved' ? 'bg-green-500/10 text-green-400' :
                                r.status === 'dismissed' ? 'bg-neutral-800 text-neutral-500' : 'bg-red-500/10 text-red-500'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => setSelectedReport(r)}
                                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 rounded text-xs transition"
                              >
                                View File
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Conflict card details */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                  {selectedReport ? (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-bold text-sm text-neutral-200">Incident Code: {selectedReport.id.substring(0, 8)}...</h4>
                        <p className="text-xs text-neutral-400 mt-2 leading-relaxed">Description: "{selectedReport.description || 'No detailed elaboration provided.'}"</p>
                      </div>

                      <div className="pt-4 border-t border-neutral-850 space-y-4">
                        <label className="text-[10px] uppercase font-bold text-neutral-400">Resolution Action type</label>
                        <select
                          value={reportAdminAction}
                          onChange={(e) => setReportAdminAction(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs focus:outline-none"
                        >
                          <option value="warned">Issued official warn alert</option>
                          <option value="suspended">Suspended user</option>
                          <option value="banned">Excluded from platform permanently</option>
                          <option value="dismissed">No action (Dismissed report category)</option>
                        </select>

                        <label className="text-[10px] uppercase font-bold text-neutral-400 block pt-2">Settle Notes / Explanations</label>
                        <textarea
                          value={reportResolution}
                          onChange={(e) => setReportResolution(e.target.value)}
                          placeholder="Type incident closing summary..."
                          className="w-full h-18 p-2 bg-neutral-950 border border-neutral-800 text-xs rounded focus:outline-none placeholder-neutral-600"
                        />

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResolveReport(selectedReport.id, true)}
                            className="flex-1 py-2 bg-neutral-950 border border-neutral-800 hover:bg-neutral-850 rounded text-neutral-400 text-xs transition font-semibold"
                          >
                            Dismiss Report
                          </button>
                          <button
                            onClick={() => handleResolveReport(selectedReport.id, false)}
                            className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded transition font-bold"
                          >
                            Apply Settle
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-20 text-neutral-500">
                      <Flag className="w-8 h-8 opacity-20 mb-3 text-orange-500" />
                      <p className="text-xs">Select listed incident report folders, review abuse logs and warnings, and resolve conflicts.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* H. HELP DESK SUB-TAB */}
          {activeTab === 'support' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-850 bg-neutral-950/20 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                        <th className="p-4">Subject</th>
                        <th className="p-4">Player ID</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900 text-xs text-neutral-300">
                      {tickets.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-neutral-500">
                            No open user help desk cases are in the database.
                          </td>
                        </tr>
                      ) : (
                        tickets.map((t) => (
                          <tr key={t.id} className="hover:bg-neutral-850/20">
                            <td className="p-4">
                              <p className="font-bold text-neutral-100">{t.subject}</p>
                              <p className="text-[10px] text-neutral-500 truncate max-w-sm">{t.message}</p>
                            </td>
                            <td className="p-4 font-mono text-[10px] text-neutral-400">{t.user_id?.substring(0, 8)}...</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] capitalize font-bold ${
                                t.status === 'open' ? 'bg-amber-500/10 text-amber-400 animate-pulse' : 'bg-neutral-800 text-neutral-500'
                              }`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => setSelectedTicket(t)}
                                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 rounded text-xs transition font-semibold"
                              >
                                View Ticket
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Ticket reply details view */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                  {selectedTicket ? (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-bold text-sm text-neutral-200">Incident Theme: {selectedTicket.subject}</h4>
                        <p className="text-xs text-neutral-400 leading-relaxed mt-2 p-3 bg-neutral-950 border border-neutral-850 rounded">
                          Message from user: "{selectedTicket.message}"
                        </p>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-neutral-850">
                        <label className="text-[10px] uppercase font-bold text-neutral-400">Post Official Reply Message</label>
                        <textarea
                          value={ticketReplyText}
                          onChange={(e) => setTicketReplyText(e.target.value)}
                          placeholder="Type feedback message to the player..."
                          className="w-full h-24 p-2 bg-neutral-950 border border-neutral-800 text-xs rounded focus:outline-none placeholder-neutral-600"
                        />
                        <button
                          onClick={() => handleReplyTicket(selectedTicket.id)}
                          className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-xs font-bold text-white rounded transition"
                        >
                          Submit Resolution Reply
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-20 text-neutral-500">
                      <MessageSquare className="w-8 h-8 opacity-20 mb-3 text-orange-500" />
                      <p className="text-xs">Click listed cases on the left to write solutions and communicate resolutions to players.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* I. ADMIN TEAM SETTINGS (SUPER ADMINS ONLY) */}
          {activeTab === 'admin-team' && admin?.role === 'super_admin' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <form onSubmit={handleCreateHelperAdmin} className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 space-y-4">
                  <h3 className="font-bold text-sm uppercase tracking-wider mb-2 text-neutral-300">Create Staff Account</h3>
                  
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1.5">Official Name</label>
                    <input
                      type="text"
                      required
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-neutral-950 border border-neutral-850 rounded px-3 py-2 text-xs focus:outline-none placeholder-neutral-600 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1.5">Staff Email</label>
                    <input
                      type="email"
                      required
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="jane@deegames.com"
                      className="w-full bg-neutral-950 border border-neutral-850 rounded px-3 py-2 text-xs focus:outline-none placeholder-neutral-600 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1.5">Console Password</label>
                    <input
                      type="password"
                      required
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="w-full bg-neutral-950 border border-neutral-850 rounded px-3 py-2 text-xs focus:outline-none placeholder-neutral-600 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1.5">Access Role Type</label>
                    <select
                      value={newAdminRole}
                      onChange={(e: any) => setNewAdminRole(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded px-2.5 py-1.5 text-xs focus:outline-none"
                    >
                      <option value="finance_admin">Finance Admin (Payout processing)</option>
                      <option value="moderation_admin">Moderation Admin (Reports queue)</option>
                      <option value="support_admin">Support Admin (Replies help tickets)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-orange-600 hover:bg-orange-700 font-bold text-xs rounded text-white transition mt-4"
                  >
                    Provision Console Access
                  </button>
                </form>

                <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-850 bg-neutral-950/20 text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-sans">
                        <th className="p-4">Team Member</th>
                        <th className="p-4">Assigned Role</th>
                        <th className="p-4 text-right">Access Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900 text-xs text-neutral-300">
                      {adminsList.map((st) => (
                        <tr key={st.id}>
                          <td className="p-4">
                            <p className="font-bold text-neutral-100">{st.name}</p>
                            <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{st.email}</p>
                          </td>
                          <td className="p-4 font-semibold text-orange-500 capitalize">
                            {st.role.replace('_', ' ')}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleToggleAdminStatus(st.id, st.is_active)}
                              className={`px-3 py-1 rounded text-[10px] font-bold transition border ${
                                st.is_active 
                                  ? 'bg-red-500/10 border-red-500/10 text-red-500 hover:bg-red-500/20' 
                                  : 'bg-green-500/10 border-green-500/10 text-green-400 hover:bg-green-500/20'
                              }`}
                            >
                              {st.is_active ? 'Revoke Access' : 'Activate Access'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* J. SYSTEM AUDIT TRAILS (SUPER ADMINS ONLY) */}
          {activeTab === 'audit-logs' && admin?.role === 'super_admin' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-850 bg-neutral-950/20 text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-sans">
                      <th className="p-4">Action Item</th>
                      <th className="p-4">Desk Admin</th>
                      <th className="p-4">Description Text</th>
                      <th className="p-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900 text-xs text-neutral-400">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-neutral-600">No events logged under administrative trail indexes.</td>
                      </tr>
                    ) : (
                      auditLogs.map((lg) => (
                        <tr key={lg.id} className="hover:bg-neutral-850/20 text-neutral-300">
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-neutral-950 font-bold border border-neutral-850 text-orange-500 uppercase font-mono tracking-wide">
                              {lg.action_type || 'generic_action'}
                            </span>
                          </td>
                          <td className="p-4 font-mono">{lg.admin_email}</td>
                          <td className="p-4 leading-relaxed max-w-md">{lg.description}</td>
                          <td className="p-4 text-right text-neutral-500 font-mono text-[11px]">{new Date(lg.created_at).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
