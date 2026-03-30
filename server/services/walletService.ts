import { supabase } from '../config/supabase';

export const getWalletByUserId = async (userId: string) => {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Fetch Wallet Error:', error);
    throw new Error('Failed to fetch wallet information');
  }
  return data;
};

export const getTransactions = async (userId: string, limit: number = 20, offset: number = 0) => {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Fetch Transactions Error:', error);
    throw new Error('Failed to fetch transaction history');
  }
  return data;
};

export const getRecentTransactions = async (userId: string, limit: number = 5) => {
  return getTransactions(userId, limit);
};

export const createTransaction = async (transactionData: {
  wallet_id: string;
  user_id: string;
  transaction_type: string;
  direction: 'credit' | 'debit';
  amount: number;
  status: string;
  reference: string;
  description: string;
  metadata?: any;
  related_deposit_id?: string;
  related_withdrawal_id?: string;
}) => {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .insert([transactionData])
    .select()
    .single();

  if (error) {
    console.error('Create Transaction Error:', error);
    throw new Error('Failed to record transaction');
  }
  return data;
};

export const updateWalletBalance = async (userId: string, amount: number, type: 'available' | 'locked', direction: 'increase' | 'decrease') => {
  // We use RPC for atomic updates to prevent race conditions
  const { data, error } = await supabase.rpc('update_wallet_balance_atomic', {
    p_user_id: userId,
    p_amount: amount,
    p_type: type,
    p_direction: direction
  });

  if (error) {
    console.error('Update Balance Error:', error);
    throw new Error(error.message || 'Failed to update wallet balance');
  }
  return data;
};
