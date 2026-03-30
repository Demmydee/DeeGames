import { supabase } from '../config/supabase';
import * as paystackService from './paystackService';
import * as walletService from './walletService';
import { config } from '../config';
import crypto from 'crypto';

export const initiateDeposit = async (userId: string, email: string, amount: number) => {
  if (amount < config.wallet.minDeposit || amount > config.wallet.maxDeposit) {
    throw new Error(`Deposit amount must be between ${config.wallet.minDeposit} and ${config.wallet.maxDeposit}`);
  }

  const internalReference = `DEP_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // Create pending deposit record
  const { data: deposit, error } = await supabase
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
  await supabase
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
    // 4. Update deposit status
    const { error: updateError } = await supabase
      .from('deposits')
      .update({
        status: 'successful',
        verified_at: new Date().toISOString(),
        paid_at: paystackData.data.paid_at,
        channel: paystackData.data.channel,
        metadata: paystackData.data
      })
      .eq('id', deposit.id);

    if (updateError) {
      console.error('Update Deposit Status Error:', updateError);
      throw new Error('Failed to update deposit status');
    }

    // 5. Credit wallet
    const wallet = await walletService.getWalletByUserId(deposit.user_id);
    await walletService.updateWalletBalance(deposit.user_id, deposit.amount, 'available', 'increase');

    // 6. Create transaction record
    await walletService.createTransaction({
      wallet_id: wallet.id,
      user_id: deposit.user_id,
      transaction_type: 'deposit',
      direction: 'credit',
      amount: deposit.amount,
      status: 'successful',
      reference: deposit.internal_reference,
      description: `Deposit via Paystack (${paystackData.data.channel})`,
      related_deposit_id: deposit.id
    });

    return { status: 'successful', message: 'Deposit successful' };
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

export const getUserDeposits = async (userId: string) => {
  const { data, error } = await supabase
    .from('deposits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Failed to fetch deposits');
  return data;
};
