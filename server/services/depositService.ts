import { supabase, createClientWithToken } from '../config/supabase';
import * as paystackService from './paystackService';
import * as walletService from './walletService';
import { config } from '../config';
import crypto from 'crypto';

export const initiateDeposit = async (userId: string, email: string, amount: number, token?: string) => {
  if (amount < config.wallet.minDeposit || amount > config.wallet.maxDeposit) {
    throw new Error(`Deposit amount must be between ${config.wallet.minDeposit} and ${config.wallet.maxDeposit}`);
  }

  const internalReference = `DEP_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // Use user client if token provided, otherwise fallback to admin client
  const client = token ? createClientWithToken(token) : supabase;

  // Create pending deposit record
  const { data: deposit, error } = await client
    .from('deposits')
    .insert([{
      user_id: userId,
      amount,
      internal_reference: internalReference,
      status: 'pending'
    }])
    .select()
    .single();

  if (error) {
    console.error('Create Deposit Error:', error);
    throw new Error(`Failed to initiate deposit: ${error.message || 'Database error'}`);
  }

  // Initialize Paystack transaction
  const paystackResponse = await paystackService.initializeTransaction(
    email,
    amount,
    internalReference,
    { user_id: userId, internal_reference: internalReference }
  );

  // Update deposit record with Paystack details
  await client
    .from('deposits')
    .update({
      paystack_reference: paystackResponse.data.reference,
      paystack_access_code: paystackResponse.data.access_code,
      authorization_url: paystackResponse.data.authorization_url
    })
    .eq('id', deposit.id);

  return {
    authorization_url: paystackResponse.data.authorization_url,
    reference: internalReference
  };
};

export const verifyDeposit = async (reference: string) => {
  // 1. Fetch deposit from DB
  const { data: deposit, error: fetchError } = await supabase
    .from('deposits')
    .select('*')
    .eq('internal_reference', reference)
    .single();

  if (fetchError || !deposit) {
    throw new Error('Deposit record not found');
  }

  // 2. If already successful, return early (idempotency)
  if (deposit.status === 'successful') {
    return { status: 'successful', message: 'Deposit already verified' };
  }

  // 3. Verify with Paystack
  const paystackData = await paystackService.verifyTransaction(deposit.paystack_reference || reference);

  if (paystackData.data.status === 'success') {
    // 4. Process success atomically via RPC
    const { data: result, error: rpcError } = await supabase.rpc('process_deposit_success', {
      p_deposit_id: deposit.id,
      p_user_id: deposit.user_id,
      p_amount: deposit.amount,
      p_reference: deposit.internal_reference,
      p_metadata: paystackData.data,
      p_paid_at: paystackData.data.paid_at,
      p_channel: paystackData.data.channel
    });

    if (rpcError) {
      console.error('Process Deposit RPC Error:', rpcError);
      throw new Error(rpcError.message || 'Failed to record transaction');
    }

    return { status: 'successful', message: result.message || 'Deposit successful' };
  } else {
    // Update status to failed if Paystack says so
    await supabase
      .from('deposits')
      .update({ status: 'failed', metadata: paystackData.data })
      .eq('id', deposit.id);

    return { status: 'failed', message: 'Payment failed' };
  }
};

export const handleWebhook = async (signature: string, payload: any) => {
  // Verify signature
  const hash = crypto.createHmac('sha512', config.paystack.webhookSecret)
    .update(JSON.stringify(payload))
    .digest('hex');

  if (hash !== signature) {
    throw new Error('Invalid signature');
  }

  if (payload.event === 'charge.success') {
    const reference = payload.data.reference;
    // We can use the same verifyDeposit logic or a more direct one
    // verifyDeposit handles idempotency internally
    await verifyDeposit(reference);
  }

  return { success: true };
};

export const getUserDeposits = async (userId: string, token?: string) => {
  const client = token ? createClientWithToken(token) : supabase;
  const { data, error } = await client
    .from('deposits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Failed to fetch deposits');
  return data;
};
