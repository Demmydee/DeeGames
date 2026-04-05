import { supabase, createClientWithToken } from '../config/supabase';

export const createPayoutAccount = async (userId: string, accountData: {
  account_name: string;
  bank_name: string;
  bank_code: string;
  account_number: string;
  is_default?: boolean;
}, token?: string) => {
  const client = token ? createClientWithToken(token) : supabase;

  // If setting as default, unset other defaults first
  if (accountData.is_default) {
    await client
      .from('payout_accounts')
      .update({ is_default: false })
      .eq('user_id', userId);
  }

  const { data, error } = await client
    .from('payout_accounts')
    .insert([{ ...accountData, user_id: userId }])
    .select()
    .single();

  if (error) {
    console.error('Create Payout Account Error:', error);
    throw new Error('Failed to save payout account');
  }
  return data;
};

export const getPayoutAccounts = async (userId: string, token?: string) => {
  const client = token ? createClientWithToken(token) : supabase;
  const { data, error } = await client
    .from('payout_accounts')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error('Failed to fetch payout accounts');
  return data;
};

export const updatePayoutAccount = async (userId: string, accountId: string, accountData: any, token?: string) => {
  const client = token ? createClientWithToken(token) : supabase;
  if (accountData.is_default) {
    await client
      .from('payout_accounts')
      .update({ is_default: false })
      .eq('user_id', userId);
  }

  const { data, error } = await client
    .from('payout_accounts')
    .update(accountData)
    .eq('id', accountId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error('Failed to update payout account');
  return data;
};

export const deletePayoutAccount = async (userId: string, accountId: string, token?: string) => {
  const client = token ? createClientWithToken(token) : supabase;
  const { error } = await client
    .from('payout_accounts')
    .delete()
    .eq('id', accountId)
    .eq('user_id', userId);

  if (error) throw new Error('Failed to delete payout account');
  return { success: true };
};
