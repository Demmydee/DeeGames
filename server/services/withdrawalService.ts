import { supabase } from '../config/supabase';
import * as walletService from './walletService';
import { config } from '../config';

export const requestWithdrawal = async (userId: string, amount: number, payoutAccountId: string) => {
  if (amount < config.wallet.minWithdrawal || amount > config.wallet.maxWithdrawal) {
    throw new Error(`Withdrawal amount must be between ${config.wallet.minWithdrawal} and ${config.wallet.maxWithdrawal}`);
  }

  // 1. Check KYC status if required
  if (config.wallet.requireKycForWithdrawal) {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('kyc_status')
      .eq('id', userId)
      .single();

    if (userError || user.kyc_status !== 'verified') {
      throw new Error('KYC verification is required for withdrawals');
    }
  }

  // 2. Check wallet balance
  const wallet = await walletService.getWalletByUserId(userId);
  if (wallet.available_balance < amount) {
    throw new Error('Insufficient available balance');
  }

  const internalReference = `WITH_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // 3. Reserve funds (atomic update)
  // Decrease available, increase locked
  await walletService.updateWalletBalance(userId, amount, 'available', 'decrease');
  await walletService.updateWalletBalance(userId, amount, 'locked', 'increase');

  // 4. Create withdrawal record
  const { data: withdrawal, error: withdrawalError } = await supabase
    .from('withdrawals')
    .insert([{
      user_id: userId,
      payout_account_id: payoutAccountId,
      amount,
      internal_reference: internalReference,
      status: 'pending'
    }])
    .select()
    .single();

  if (withdrawalError) {
    // Rollback balance changes if record creation fails
    await walletService.updateWalletBalance(userId, amount, 'available', 'increase');
    await walletService.updateWalletBalance(userId, amount, 'locked', 'decrease');
    console.error('Create Withdrawal Error:', withdrawalError);
    throw new Error('Failed to create withdrawal request');
  }

  // 5. Create transaction record (ledger)
  await walletService.createTransaction({
    wallet_id: wallet.id,
    user_id: userId,
    transaction_type: 'withdrawal',
    direction: 'debit',
    amount,
    status: 'pending',
    reference: internalReference,
    description: 'Withdrawal request initiated',
    related_withdrawal_id: withdrawal.id
  });

  return withdrawal;
};

export const getUserWithdrawals = async (userId: string) => {
  const { data, error } = await supabase
    .from('withdrawals')
    .select('*, payout_accounts(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Failed to fetch withdrawals');
  return data;
};

// Admin status updates (placeholders for future)
export const updateWithdrawalStatus = async (withdrawalId: string, status: 'approved' | 'processing' | 'successful' | 'failed' | 'rejected' | 'cancelled', failureReason?: string) => {
  const { data: withdrawal, error: fetchError } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('id', withdrawalId)
    .single();

  if (fetchError || !withdrawal) throw new Error('Withdrawal not found');

  if (withdrawal.status === 'successful' || withdrawal.status === 'failed' || withdrawal.status === 'rejected') {
    throw new Error('Withdrawal status is already finalized');
  }

  const { error: updateError } = await supabase
    .from('withdrawals')
    .update({
      status,
      processed_at: (status === 'successful' || status === 'failed' || status === 'rejected') ? new Date().toISOString() : null,
      failure_reason: failureReason || null
    })
    .eq('id', withdrawalId);

  if (updateError) throw new Error('Failed to update withdrawal status');

  // Handle balance finalization or restoration
  if (status === 'successful') {
    // Finalize: remove from locked balance
    await walletService.updateWalletBalance(withdrawal.user_id, withdrawal.amount, 'locked', 'decrease');
    
    // Update transaction status
    await supabase
      .from('wallet_transactions')
      .update({ status: 'successful', description: 'Withdrawal successful' })
      .eq('related_withdrawal_id', withdrawalId);
      
  } else if (status === 'failed' || status === 'rejected' || status === 'cancelled') {
    // Restore: move from locked back to available
    await walletService.updateWalletBalance(withdrawal.user_id, withdrawal.amount, 'locked', 'decrease');
    await walletService.updateWalletBalance(withdrawal.user_id, withdrawal.amount, 'available', 'increase');
    
    // Update transaction status
    await supabase
      .from('wallet_transactions')
      .update({ status: 'failed', description: `Withdrawal ${status}: ${failureReason || ''}` })
      .eq('related_withdrawal_id', withdrawalId);
  }

  return { success: true };
};
