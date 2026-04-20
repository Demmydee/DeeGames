import { supabase, createClientWithToken } from '../config/supabase';
import { getUserById } from './authService';

export const getWalletByUserId = async (userId: string, token?: string) => {
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const client = hasServiceKey ? supabase : (token ? createClientWithToken(token) : supabase);

  const { data, error } = await client
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // JSON object requested, but no rows were returned
      console.log(`Wallet not found for user ${userId}, ensuring user profile exists...`);

      // Use getUserById to self-heal the profile if it's missing
      await getUserById(userId);

      console.log(`User ${userId} profile is ready, creating missing wallet...`);
      const { data: newWallet, error: createError } = await client
        .from('wallets')
        .insert([{ user_id: userId }])
        .select()
        .single();

      if (createError) {
        console.error('Failed to create missing wallet:', createError);
        throw new Error(`Failed to initialize wallet: ${createError.message}`);
      }
      return newWallet;
    }
    console.error('Fetch Wallet Error:', error);
    throw new Error(`Failed to fetch wallet information: ${error.message}`);
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
