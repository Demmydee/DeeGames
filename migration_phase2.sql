-- SQL Migration for DeeGames Phase 2: Wallets, Deposits, Withdrawals, Payout Accounts

-- 1. Wallets Table
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    available_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    locked_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'NGN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Payout Accounts Table
CREATE TABLE IF NOT EXISTS public.payout_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    account_name TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    bank_code TEXT NOT NULL,
    account_number TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Deposits Table
CREATE TABLE IF NOT EXISTS public.deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'NGN',
    provider TEXT NOT NULL DEFAULT 'paystack',
    internal_reference TEXT UNIQUE NOT NULL,
    paystack_reference TEXT UNIQUE,
    paystack_access_code TEXT,
    authorization_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, successful, failed, abandoned, cancelled
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    channel TEXT,
    paid_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Withdrawals Table
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    payout_account_id UUID NOT NULL REFERENCES public.payout_accounts(id),
    amount DECIMAL(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'NGN',
    internal_reference TEXT UNIQUE NOT NULL,
    provider TEXT NOT NULL DEFAULT 'manual',
    provider_reference TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, processing, successful, failed, rejected, cancelled
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    failure_reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Wallet Transactions Table (Ledger)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL, -- deposit, withdrawal, wager_lock, wager_release, wager_payout, wager_loss, refund, bonus, fee, adjustment
    direction TEXT NOT NULL, -- credit, debit
    amount DECIMAL(15, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'successful', -- pending, successful, failed, cancelled, reversed
    reference TEXT NOT NULL,
    description TEXT,
    metadata JSONB,
    related_deposit_id UUID REFERENCES public.deposits(id),
    related_withdrawal_id UUID REFERENCES public.withdrawals(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. User Table Extensions (KYC & Security)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transaction_pin_hash TEXT;

-- 7. RLS Policies
-- Wallets
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);

-- Payout Accounts
ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own payout accounts" ON public.payout_accounts;
CREATE POLICY "Users can view own payout accounts" ON public.payout_accounts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own payout accounts" ON public.payout_accounts;
CREATE POLICY "Users can insert own payout accounts" ON public.payout_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own payout accounts" ON public.payout_accounts;
CREATE POLICY "Users can update own payout accounts" ON public.payout_accounts FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own payout accounts" ON public.payout_accounts;
CREATE POLICY "Users can delete own payout accounts" ON public.payout_accounts FOR DELETE USING (auth.uid() = user_id);

-- Deposits
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own deposits" ON public.deposits;
CREATE POLICY "Users can view own deposits" ON public.deposits FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own deposits" ON public.deposits;
CREATE POLICY "Users can insert own deposits" ON public.deposits FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Withdrawals
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.withdrawals;
CREATE POLICY "Users can view own withdrawals" ON public.withdrawals FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own withdrawals" ON public.withdrawals;
CREATE POLICY "Users can insert own withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Wallet Transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can insert own transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. Functions & Triggers

-- Function to update total_balance automatically
CREATE OR REPLACE FUNCTION public.update_wallet_total_balance()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_balance := NEW.available_balance + NEW.locked_balance;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_wallet_balance_change ON public.wallets;
CREATE TRIGGER on_wallet_balance_change
BEFORE INSERT OR UPDATE ON public.wallets
FOR EACH ROW EXECUTE PROCEDURE public.update_wallet_total_balance();

-- Function to create wallet for new user
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.wallets (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_user_created_wallet ON public.users;
CREATE TRIGGER on_user_created_wallet
AFTER INSERT ON public.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_wallet();

-- 9. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON public.deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_accounts_user_id ON public.payout_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_internal_reference ON public.deposits(internal_reference);
CREATE INDEX IF NOT EXISTS idx_deposits_paystack_reference ON public.deposits(paystack_reference);

-- 10. Atomic Balance Update Function
CREATE OR REPLACE FUNCTION public.update_wallet_balance_atomic(
    p_user_id UUID,
    p_amount DECIMAL,
    p_type TEXT, -- 'available', 'locked'
    p_direction TEXT -- 'increase', 'decrease'
)
RETURNS JSONB AS $$
DECLARE
    v_wallet RECORD;
    v_result JSONB;
BEGIN
    -- Lock the wallet row for update to prevent concurrent modifications
    SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
    END IF;

    IF p_type = 'available' THEN
        IF p_direction = 'increase' THEN
            UPDATE public.wallets SET available_balance = available_balance + p_amount WHERE user_id = p_user_id;
        ELSIF p_direction = 'decrease' THEN
            IF v_wallet.available_balance < p_amount THEN
                RAISE EXCEPTION 'Insufficient available balance';
            END IF;
            UPDATE public.wallets SET available_balance = available_balance - p_amount WHERE user_id = p_user_id;
        END IF;
    ELSIF p_type = 'locked' THEN
        IF p_direction = 'increase' THEN
            UPDATE public.wallets SET locked_balance = locked_balance + p_amount WHERE user_id = p_user_id;
        ELSIF p_direction = 'decrease' THEN
            IF v_wallet.locked_balance < p_amount THEN
                RAISE EXCEPTION 'Insufficient locked balance';
            END IF;
            UPDATE public.wallets SET locked_balance = locked_balance - p_amount WHERE user_id = p_user_id;
        END IF;
    ELSE
        RAISE EXCEPTION 'Invalid balance type: %', p_type;
    END IF;

    SELECT jsonb_build_object('success', true) INTO v_result;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Process Deposit Success (Atomic)
CREATE OR REPLACE FUNCTION public.process_deposit_success(
    p_deposit_id UUID,
    p_user_id UUID,
    p_amount DECIMAL,
    p_reference TEXT,
    p_metadata JSONB,
    p_paid_at TIMESTAMPTZ,
    p_channel TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_wallet_id UUID;
    v_result JSONB;
    v_deposit_status TEXT;
BEGIN
    -- Lock both deposit and wallet to prevent race conditions
    SELECT status INTO v_deposit_status FROM public.deposits WHERE id = p_deposit_id FOR UPDATE;
    SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;

    IF v_deposit_status = 'successful' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already processed');
    END IF;

    -- 1. Update deposit status
    UPDATE public.deposits SET
        status = 'successful',
        verified_at = NOW(),
        paid_at = p_paid_at,
        channel = p_channel,
        metadata = p_metadata,
        updated_at = NOW()
    WHERE id = p_deposit_id;

    -- 2. Credit wallet
    UPDATE public.wallets SET
        available_balance = available_balance + p_amount,
        updated_at = NOW()
    WHERE id = v_wallet_id;

    -- 3. Create transaction record
    INSERT INTO public.wallet_transactions (
        wallet_id,
        user_id,
        transaction_type,
        direction,
        amount,
        status,
        reference,
        description,
        related_deposit_id
    ) VALUES (
        v_wallet_id,
        p_user_id,
        'deposit',
        'credit',
        p_amount,
        'successful',
        p_reference,
        'Deposit via Paystack (' || p_channel || ')',
        p_deposit_id
    );

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to process deposit: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Request Withdrawal (Atomic)
CREATE OR REPLACE FUNCTION public.request_withdrawal_atomic(
    p_user_id UUID,
    p_amount DECIMAL,
    p_payout_account_id UUID,
    p_reference TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_wallet_id UUID;
    v_available_balance DECIMAL;
    v_withdrawal_id UUID;
    v_result JSONB;
BEGIN
    -- Lock wallet for update
    SELECT id, available_balance INTO v_wallet_id, v_available_balance 
    FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;

    IF v_available_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient available balance';
    END IF;

    -- 1. Update wallet balance
    UPDATE public.wallets SET
        available_balance = available_balance - p_amount,
        locked_balance = locked_balance + p_amount,
        updated_at = NOW()
    WHERE id = v_wallet_id;

    -- 2. Create withdrawal record
    INSERT INTO public.withdrawals (
        user_id,
        payout_account_id,
        amount,
        internal_reference,
        status
    ) VALUES (
        p_user_id,
        p_payout_account_id,
        p_amount,
        p_reference,
        'pending'
    ) RETURNING id INTO v_withdrawal_id;

    -- 3. Create transaction record
    INSERT INTO public.wallet_transactions (
        wallet_id,
        user_id,
        transaction_type,
        direction,
        amount,
        status,
        reference,
        description,
        related_withdrawal_id
    ) VALUES (
        v_wallet_id,
        p_user_id,
        'withdrawal',
        'debit',
        p_amount,
        'pending',
        p_reference,
        'Withdrawal request initiated',
        v_withdrawal_id
    );

    RETURN jsonb_build_object('success', true, 'withdrawal_id', v_withdrawal_id);
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to request withdrawal: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
