-- SQL Schema for DeeGames Phase 1
-- To be run in Supabase SQL Editor

-- Enable pgcrypto for gen_random_uuid() if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop existing table to ensure clean slate (WARNING: This deletes existing user data in public.users)
DROP TABLE IF EXISTS public.users CASCADE;

-- Create users table linked to Supabase Auth
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE,
    is_adult_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    terms_accepted_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    
    -- Future proofing fields
    wallet_balance DECIMAL(12, 2) DEFAULT 0.00,
    kyc_status TEXT DEFAULT 'pending',
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend game_requests
ALTER TABLE public.game_requests ADD COLUMN IF NOT EXISTS game_variant text;

-- Extend match_participants for Phase 5A
ALTER TABLE public.match_participants ADD COLUMN IF NOT EXISTS disconnect_detected_at timestamptz;
ALTER TABLE public.match_participants ADD COLUMN IF NOT EXISTS reconnected_at timestamptz;
ALTER TABLE public.match_participants ADD COLUMN IF NOT EXISTS countdown_expires_at timestamptz;
ALTER TABLE public.match_participants ADD COLUMN IF NOT EXISTS defeat_reason text;

-- Game States Table
CREATE TABLE IF NOT EXISTS public.game_states (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id uuid UNIQUE NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    game_type text NOT NULL,
    game_variant text NOT NULL,
    state jsonb NOT NULL DEFAULT '{}'::jsonb,
    current_round integer NOT NULL DEFAULT 1,
    total_rounds integer NOT NULL DEFAULT 1,
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Game Moves Table
CREATE TABLE IF NOT EXISTS public.game_moves (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    game_state_id uuid NOT NULL REFERENCES public.game_states(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id),
    move_type text NOT NULL,
    move_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    result_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    round_number integer NOT NULL,
    move_number integer NOT NULL,
    is_valid boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Match Results Table
CREATE TABLE IF NOT EXISTS public.match_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id uuid UNIQUE NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    pay_mode text NOT NULL,
    total_pool_kobo bigint NOT NULL DEFAULT 0,
    house_cut_kobo bigint NOT NULL DEFAULT 0,
    net_pool_kobo bigint NOT NULL DEFAULT 0,
    winners_count integer NOT NULL DEFAULT 0,
    losers_count integer NOT NULL DEFAULT 0,
    rankings jsonb NOT NULL DEFAULT '[]'::jsonb,
    settlement_status text NOT NULL DEFAULT 'pending',
    settled_at timestamptz,
    failure_reason text,
    created_at timestamptz DEFAULT now()
);

-- Match Payouts Table
CREATE TABLE IF NOT EXISTS public.match_payouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_result_id uuid NOT NULL REFERENCES public.match_results(id) ON DELETE CASCADE,
    match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id),
    rank integer NOT NULL,
    wager_kobo bigint NOT NULL DEFAULT 0,
    weight integer,
    payout_kobo bigint NOT NULL DEFAULT 0,
    is_winner boolean NOT NULL DEFAULT false,
    defeat_reason text,
    wallet_transaction_id uuid,
    created_at timestamptz DEFAULT now()
);

-- House Revenue Table
CREATE TABLE IF NOT EXISTS public.house_revenue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id uuid NOT NULL REFERENCES public.matches(id),
    match_result_id uuid REFERENCES public.match_results(id),
    amount_kobo bigint NOT NULL DEFAULT 0,
    currency text DEFAULT 'NGN',
    created_at timestamptz DEFAULT now()
);

-- Match Heartbeats Table
CREATE TABLE IF NOT EXISTS public.match_heartbeats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id),
    last_seen_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(match_id, user_id)
);

-- Settlement RPCs

CREATE OR REPLACE FUNCTION public.settle_match_atomic(
    p_match_id uuid,
    p_pay_mode text,
    p_total_pool_kobo bigint,
    p_house_cut_kobo bigint,
    p_net_pool_kobo bigint,
    p_winners_count integer,
    p_losers_count integer,
    p_rankings jsonb,
    p_payouts jsonb
) RETURNS jsonb AS $$
DECLARE
    v_result_id uuid;
    v_payout record;
    v_trans_id uuid;
    v_wallet_id uuid;
BEGIN
    INSERT INTO public.match_results (
        match_id, pay_mode, total_pool_kobo, house_cut_kobo, net_pool_kobo, 
        winners_count, losers_count, rankings, settlement_status, settled_at
    ) VALUES (
        p_match_id, p_pay_mode, p_total_pool_kobo, p_house_cut_kobo, p_net_pool_kobo,
        p_winners_count, p_losers_count, p_rankings, 'settled', now()
    ) RETURNING id INTO v_result_id;

    IF p_house_cut_kobo > 0 THEN
        INSERT INTO public.house_revenue (match_id, match_result_id, amount_kobo)
        VALUES (p_match_id, v_result_id, p_house_cut_kobo);
    END IF;

    FOR v_payout IN SELECT * FROM jsonb_to_recordset(p_payouts) AS x(
        "userId" uuid, "rank" integer, "wagerKobo" bigint, "payoutKobo" bigint, 
        "isWinner" boolean, "weight" integer, "defeatReason" text
    ) LOOP
        SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = v_payout."userId" FOR UPDATE;

        UPDATE public.wallets 
        SET locked_balance = locked_balance - (v_payout."wagerKobo"::numeric / 100.0),
            updated_at = now()
        WHERE id = v_wallet_id;

        IF NOT v_payout."isWinner" THEN
            INSERT INTO public.wallet_transactions (
                wallet_id, user_id, transaction_type, direction, amount, status, reference, description
            ) VALUES (
                v_wallet_id, v_payout."userId", 'wager_loss', 'debit', (v_payout."wagerKobo"::numeric / 100.0), 
                'completed', 'MATCH_LOSS_' || p_match_id, 'Wager loss for match ' || p_match_id
            ) RETURNING id INTO v_trans_id;
        ELSE
            UPDATE public.wallets 
            SET available_balance = available_balance + (v_payout."payoutKobo"::numeric / 100.0),
                updated_at = now()
            WHERE id = v_wallet_id;

            INSERT INTO public.wallet_transactions (
                wallet_id, user_id, transaction_type, direction, amount, status, reference, description
            ) VALUES (
                v_wallet_id, v_payout."userId", 'wager_payout', 'credit', (v_payout."payoutKobo"::numeric / 100.0), 
                'completed', 'MATCH_PAYOUT_' || p_match_id, 'Wager payout for match ' || p_match_id
            ) RETURNING id INTO v_trans_id;
        END IF;

        INSERT INTO public.match_payouts (
            match_result_id, match_id, user_id, rank, wager_kobo, weight, payout_kobo, 
            is_winner, defeat_reason, wallet_transaction_id
        ) VALUES (
            v_result_id, p_match_id, v_payout."userId", v_payout."rank", v_payout."wagerKobo", 
            v_payout."weight", v_payout."payoutKobo", v_payout."isWinner", v_payout."defeatReason", v_trans_id
        );
    END LOOP;

    UPDATE public.matches SET status = 'finished', finished_at = now() WHERE id = p_match_id;

    RETURN jsonb_build_object('success', true, 'result_id', v_result_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.refund_match_wagers_atomic(
    p_match_id uuid,
    p_wager_kobo bigint
) RETURNS jsonb AS $$
DECLARE
    v_participant record;
    v_wallet_id uuid;
BEGIN
    FOR v_participant IN SELECT user_id FROM public.match_participants WHERE match_id = p_match_id LOOP
        SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = v_participant.user_id FOR UPDATE;

        UPDATE public.wallets 
        SET locked_balance = locked_balance - (p_wager_kobo::numeric / 100.0),
            available_balance = available_balance + (p_wager_kobo::numeric / 100.0),
            updated_at = now()
        WHERE id = v_wallet_id;

        INSERT INTO public.wallet_transactions (
            wallet_id, user_id, transaction_type, direction, amount, status, reference, description
        ) VALUES (
            v_wallet_id, v_participant.user_id, 'wager_release', 'credit', (p_wager_kobo::numeric / 100.0), 
            'completed', 'MATCH_REFUND_' || p_match_id, 'Wager refund for match ' || p_match_id
        );
    END LOOP;

    UPDATE public.matches SET status = 'cancelled', finished_at = now() WHERE id = p_match_id;
    
    INSERT INTO public.match_results (
        match_id, pay_mode, settlement_status, settled_at
    ) VALUES (
        p_match_id, 'refund', 'refunded', now()
    );

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data" ON public.users
    FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE
    USING (auth.uid() = id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.users (
        id, 
        username, 
        email, 
        phone, 
        is_adult_confirmed, 
        terms_accepted, 
        terms_accepted_at
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
        COALESCE((NEW.raw_user_meta_data->>'isAdultConfirmed')::boolean, false),
        COALESCE((NEW.raw_user_meta_data->>'termsAccepted')::boolean, false),
        NOW()
    );
    RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RPC Function to check uniqueness (needed for anon key backend)
CREATE OR REPLACE FUNCTION public.check_user_uniqueness(p_username TEXT, p_email TEXT, p_phone TEXT)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'username_exists', EXISTS(SELECT 1 FROM public.users WHERE LOWER(username) = LOWER(p_username)),
        'email_exists', EXISTS(SELECT 1 FROM public.users WHERE LOWER(email) = LOWER(p_email)),
        'phone_exists', EXISTS(SELECT 1 FROM public.users WHERE phone = p_phone AND p_phone IS NOT NULL)
    ) INTO v_result;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC Function to get email by username (needed for login with username using anon key)
CREATE OR REPLACE FUNCTION public.get_user_email_by_username(p_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_email text;
BEGIN
    SELECT u.email
    INTO v_email
    FROM public.users u
    WHERE LOWER(u.username) = LOWER(p_username)
    LIMIT 1;

    RETURN v_email;
END;
$$;
