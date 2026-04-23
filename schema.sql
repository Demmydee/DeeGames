-- Unified Schema for DeeGames
-- This script contains all tables, functions, and policies needed for the application.

-- 1. Explicit cleanup of accidental tables/objects from previous failed runs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
DROP TABLE IF EXISTS public.v_wallet_id, public.v_user_wallet_id, public.v_result_id, public.v_trans_id CASCADE;
DROP TABLE IF EXISTS public._l_target_wallet_id, public._l_result_id, public._l_trans_id, public._l_payout CASCADE;

-- 2. Base Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    kyc_status TEXT DEFAULT 'pending', -- pending, verified, rejected
    kyc_verified_at TIMESTAMPTZ,
    transaction_pin_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration: Ensure KYC columns exist if table was created in an older version
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='kyc_status') THEN
        ALTER TABLE public.users ADD COLUMN kyc_status TEXT DEFAULT 'pending';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='kyc_verified_at') THEN
        ALTER TABLE public.users ADD COLUMN kyc_verified_at TIMESTAMPTZ;
    END IF;
END $$;

-- Case-insensitive uniqueness for critical fields
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON public.users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON public.users (LOWER(email));

-- 3. Wallets & Transactions
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

-- 4. Lobby & Matches
CREATE TABLE IF NOT EXISTS public.room_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    min_wager DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    max_wager DECIMAL(15, 2),
    is_free BOOLEAN NOT NULL DEFAULT FALSE,
    icon_name TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.game_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    min_players INTEGER NOT NULL DEFAULT 2,
    max_players INTEGER NOT NULL DEFAULT 5,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.game_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_category_id UUID NOT NULL REFERENCES public.room_categories(id),
    game_type_id UUID NOT NULL REFERENCES public.game_types(id),
    requester_user_id UUID NOT NULL REFERENCES public.users(id),
    category TEXT NOT NULL, -- duel, arena
    pay_mode TEXT NOT NULL, -- knockout, split
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    game_variant TEXT,
    required_players INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'awaiting_opponents', -- awaiting_opponents, ready_to_start, started, cancelled, expired
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.game_request_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_request_id UUID NOT NULL REFERENCES public.game_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    role TEXT NOT NULL DEFAULT 'player', -- requester, player
    status TEXT NOT NULL DEFAULT 'joined', -- joined, left, locked_in
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    UNIQUE(game_request_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_request_id UUID REFERENCES public.game_requests(id),
    room_category_id UUID NOT NULL REFERENCES public.room_categories(id),
    game_type_id UUID NOT NULL REFERENCES public.game_types(id),
    started_by_user_id UUID NOT NULL REFERENCES public.users(id),
    category TEXT NOT NULL,
    pay_mode TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'waiting', -- waiting, in_progress, finished, cancelled
    winner_user_id UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

-- Migration: Ensure missing columns exist in matches
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='matches' AND column_name='started_at') THEN
        ALTER TABLE public.matches ADD COLUMN started_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='matches' AND column_name='ended_at') THEN
        ALTER TABLE public.matches ADD COLUMN ended_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='matches' AND column_name='finished_at') THEN
        ALTER TABLE public.matches ADD COLUMN finished_at TIMESTAMPTZ;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.match_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    seat_no INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- active, left, defeated, winner, eliminated
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    reconnected_at TIMESTAMPTZ,
    countdown_expires_at TIMESTAMPTZ, 
    disconnect_detected_at TIMESTAMPTZ,
    is_away BOOLEAN DEFAULT FALSE,
    away_since TIMESTAMPTZ,
    UNIQUE(match_id, user_id)
);

-- Migration: Ensure missing columns exist in match_participants
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='match_participants' AND column_name='is_away') THEN
        ALTER TABLE public.match_participants ADD COLUMN is_away BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='match_participants' AND column_name='away_since') THEN
        ALTER TABLE public.match_participants ADD COLUMN away_since TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='match_participants' AND column_name='reconnected_at') THEN
        ALTER TABLE public.match_participants ADD COLUMN reconnected_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='match_participants' AND column_name='countdown_expires_at') THEN
        ALTER TABLE public.match_participants ADD COLUMN countdown_expires_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='match_participants' AND column_name='disconnect_detected_at') THEN
        ALTER TABLE public.match_participants ADD COLUMN disconnect_detected_at TIMESTAMPTZ;
    END IF;
END $$;

-- 5. Game Gameplay Models
CREATE TABLE IF NOT EXISTS public.game_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID UNIQUE NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    game_variant TEXT NOT NULL,
    current_round INTEGER NOT NULL DEFAULT 1,
    total_rounds INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- active, paused, completed
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.game_moves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    game_state_id UUID NOT NULL REFERENCES public.game_states(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    move_type TEXT NOT NULL,
    move_data JSONB NOT NULL,
    result_data JSONB,
    round_number INTEGER NOT NULL,
    move_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.match_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID UNIQUE NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    pay_mode TEXT NOT NULL,
    total_pool_kobo BIGINT,
    house_cut_kobo BIGINT,
    net_pool_kobo BIGINT,
    winners_count INTEGER,
    losers_count INTEGER,
    rankings JSONB,
    history JSONB DEFAULT '[]'::jsonb,
    settlement_status TEXT NOT NULL DEFAULT 'pending', -- pending, settled, refunded, failed
    failure_reason TEXT,
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration: Ensure missing columns exist in match_results
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='match_results' AND column_name='history') THEN
        ALTER TABLE public.match_results ADD COLUMN history JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='match_results' AND column_name='rank_mode') THEN
        ALTER TABLE public.match_results ADD COLUMN rank_mode TEXT;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.match_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_result_id UUID NOT NULL REFERENCES public.match_results(id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    rank INTEGER NOT NULL,
    wager_kobo BIGINT NOT NULL,
    weight INTEGER,
    payout_kobo BIGINT NOT NULL,
    is_winner BOOLEAN NOT NULL DEFAULT FALSE,
    defeat_reason TEXT,
    wallet_transaction_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.house_revenue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id),
    match_result_id UUID NOT NULL REFERENCES public.match_results(id),
    amount_kobo BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.match_heartbeats (
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (match_id, user_id)
);

-- 6. Social & Communication
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    sender_user_id UUID NOT NULL REFERENCES public.users(id),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    addressee_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, blocked, declined
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(requester_user_id, addressee_user_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    data JSONB,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- 7. Helper Functions & Triggers

-- Single robust trigger to sync auth.users to public.users AND create wallet
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Sync to public.users
    -- Using internal BEGIN/EXCEPTION to ensure Auth registration doesn't fail 
    -- if there's a constraint violation in public.users (e.g. duplicate username from deleted account)
    BEGIN
        INSERT INTO public.users (id, username, email, phone, full_name, avatar_url)
        VALUES (
            NEW.id,
            COALESCE(LOWER(NULLIF(NEW.raw_user_meta_data->>'username', '')), SPLIT_PART(LOWER(NEW.email), '@', 1)),
            LOWER(COALESCE(NEW.email, '')),
            NULLIF(NEW.raw_user_meta_data->>'phone', ''),
            NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
            NULLIF(NEW.raw_user_meta_data->>'avatar_url', '')
        )
        ON CONFLICT (id) DO UPDATE SET
            username = EXCLUDED.username,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            full_name = EXCLUDED.full_name,
            avatar_url = EXCLUDED.avatar_url,
            updated_at = NOW();
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Registration Trigger Failure (Users Sync): %, Err: %', NEW.id, SQLERRM;
    END;

    -- 2. Create Wallet
    BEGIN
        INSERT INTO public.wallets (user_id) 
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Registration Trigger Failure (Wallet Creation): %, Err: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Wallet triggers
CREATE OR REPLACE FUNCTION public.update_wallet_total_balance()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_balance := NEW.available_balance + NEW.locked_balance;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_wallet_balance_change ON public.wallets;
CREATE TRIGGER on_wallet_balance_change
BEFORE INSERT OR UPDATE ON public.wallets
FOR EACH ROW EXECUTE PROCEDURE public.update_wallet_total_balance();

-- Cleanup orphaned triggers/functions
DROP TRIGGER IF EXISTS on_user_created_wallet ON public.users;
DROP FUNCTION IF EXISTS public.handle_new_user_wallet() CASCADE;

-- Uniqueness tracker for registration
DROP FUNCTION IF EXISTS public.check_user_uniqueness(text, text, text);
CREATE OR REPLACE FUNCTION public.check_user_uniqueness(p_username text, p_email text, p_phone text)
RETURNS jsonb AS $$
DECLARE
    v_username_exists boolean;
    v_email_exists_public boolean;
    v_email_exists_auth boolean;
    v_phone_exists boolean;
BEGIN
    -- Check local public.users
    SELECT EXISTS (SELECT 1 FROM public.users WHERE LOWER(username) = LOWER(p_username)) INTO v_username_exists;
    SELECT EXISTS (SELECT 1 FROM public.users WHERE LOWER(email) = LOWER(p_email)) INTO v_email_exists_public;
    SELECT EXISTS (SELECT 1 FROM public.users WHERE phone = p_phone) INTO v_phone_exists;
    
    -- Also check auth.users directly to catch users who exist but whose sync failed
    -- This helps prevent the "Database error" by failing early with a clean message
    SELECT EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = LOWER(p_email)) INTO v_email_exists_auth;
    
    RETURN jsonb_build_object(
        'username_exists', v_username_exists,
        'email_exists', v_email_exists_public OR v_email_exists_auth,
        'phone_exists', v_phone_exists
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 8. Atomic RPCs

-- Settlement
DROP FUNCTION IF EXISTS public.settle_match_atomic(uuid, text, bigint, bigint, bigint, integer, integer, jsonb, jsonb, jsonb) CASCADE;
CREATE OR REPLACE FUNCTION public.settle_match_atomic(
    p_match_id uuid,
    p_pay_mode text,
    p_total_pool_kobo bigint,
    p_house_cut_kobo bigint,
    p_net_pool_kobo bigint,
    p_winners_count integer,
    p_losers_count integer,
    p_rankings jsonb,
    p_payouts jsonb, -- array of {userId, rank, wagerKobo, payoutKobo, isWinner, weight, defeatReason}
    p_history jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_res_id uuid;
    v_p_rec record;
    v_t_id uuid;
    v_target_w_id uuid;
    v_final_status text;
BEGIN
    INSERT INTO public.match_results (
        match_id, pay_mode, total_pool_kobo, house_cut_kobo, net_pool_kobo, 
        winners_count, losers_count, rankings, history, settlement_status, settled_at
    ) VALUES (
        p_match_id, p_pay_mode, p_total_pool_kobo, p_house_cut_kobo, p_net_pool_kobo,
        p_winners_count, p_losers_count, p_rankings, p_history, 'settled', now()
    ) RETURNING id INTO v_res_id;

    IF p_house_cut_kobo > 0 THEN
        INSERT INTO public.house_revenue (match_id, match_result_id, amount_kobo)
        VALUES (p_match_id, v_res_id, p_house_cut_kobo);
    END IF;

    FOR v_p_rec IN SELECT * FROM jsonb_to_recordset(p_payouts) AS x(
        "userId" uuid, "rank" integer, "wagerKobo" bigint, "payoutKobo" bigint, 
        "isWinner" boolean, "weight" integer, "defeatReason" text
    ) LOOP
        -- Lock and select the wallet ID
        SELECT id INTO v_target_w_id FROM public.wallets WHERE user_id = v_p_rec."userId" FOR UPDATE;

        -- Update Wallet Balances
        UPDATE public.wallets 
        SET locked_balance = locked_balance - (v_p_rec."wagerKobo"::numeric / 100.0),
            updated_at = now()
        WHERE id = v_target_w_id;

        IF NOT v_p_rec."isWinner" THEN
            INSERT INTO public.wallet_transactions (
                wallet_id, user_id, transaction_type, direction, amount, status, reference, description
            ) VALUES (
                v_target_w_id, v_p_rec."userId", 'wager_loss', 'debit', (v_p_rec."wagerKobo"::numeric / 100.0), 
                'completed', 'MATCH_LOSS_' || p_match_id::text, 'Wager loss for match ' || p_match_id::text
            ) RETURNING id INTO v_t_id;
            
            v_final_status := 'defeated';
        ELSE
            UPDATE public.wallets 
            SET available_balance = available_balance + (v_p_rec."payoutKobo"::numeric / 100.0),
                updated_at = now()
            WHERE id = v_target_w_id;

            INSERT INTO public.wallet_transactions (
                wallet_id, user_id, transaction_type, direction, amount, status, reference, description
            ) VALUES (
                v_target_w_id, v_p_rec."userId", 'wager_payout', 'credit', (v_p_rec."payoutKobo"::numeric / 100.0), 
                'completed', 'MATCH_PAYOUT_' || p_match_id::text, 'Wager payout for match ' || p_match_id::text
            ) RETURNING id INTO v_t_id;
            
            v_final_status := 'winner';
        END IF;
        
        -- Override status if they left early (but still managed to rank/win?)
        IF v_p_rec."defeatReason" = 'left' THEN
            v_final_status := 'left';
        END IF;

        -- Update match_participants status ATOMICALLY
        UPDATE public.match_participants 
        SET status = v_final_status 
        WHERE match_id = p_match_id AND user_id = v_p_rec."userId";

        -- Record individual payout
        INSERT INTO public.match_payouts (
            match_result_id, match_id, user_id, rank, wager_kobo, weight, payout_kobo, 
            is_winner, defeat_reason, wallet_transaction_id
        ) VALUES (
            v_res_id, p_match_id, v_p_rec."userId", v_p_rec."rank", v_p_rec."wagerKobo", 
            v_p_rec."weight", v_p_rec."payoutKobo", v_p_rec."isWinner", v_p_rec."defeatReason", v_t_id
        );
    END LOOP;

    UPDATE public.matches SET status = 'finished', finished_at = now() WHERE id = p_match_id;

    RETURN jsonb_build_object('success', true, 'result_id', v_res_id);
END;
$$;

-- Refund
DROP FUNCTION IF EXISTS public.refund_match_wagers_atomic(uuid, bigint) CASCADE;
CREATE OR REPLACE FUNCTION public.refund_match_wagers_atomic(
    p_match_id uuid,
    p_wager_kobo bigint
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_part record;
    v_target_w_id uuid;
BEGIN
    FOR v_part IN SELECT user_id FROM public.match_participants WHERE match_id = p_match_id LOOP
        SELECT id INTO v_target_w_id FROM public.wallets WHERE user_id = v_part.user_id FOR UPDATE;

        UPDATE public.wallets 
        SET locked_balance = locked_balance - (p_wager_kobo::numeric / 100.0),
            available_balance = available_balance + (p_wager_kobo::numeric / 100.0),
            updated_at = now()
        WHERE id = v_target_w_id;

        INSERT INTO public.wallet_transactions (
            wallet_id, user_id, transaction_type, direction, amount, status, reference, description
        ) VALUES (
            v_target_w_id, v_part.user_id, 'wager_release', 'credit', (p_wager_kobo::numeric / 100.0), 
            'completed', 'MATCH_REFUND_' || p_match_id::text, 'Wager refund for match ' || p_match_id::text
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
$$;

-- Start Game Request
DROP FUNCTION IF EXISTS public.start_game_request_atomic(uuid, uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.start_game_request_atomic(
    p_request_id UUID,
    p_started_by_user_id UUID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_req RECORD;
    v_part RECORD;
    v_match_id UUID;
    v_target_w_id UUID;
BEGIN
    SELECT * INTO v_req FROM public.game_requests WHERE id = p_request_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Game request not found';
    END IF;
    
    IF v_req.status != 'awaiting_opponents' AND v_req.status != 'ready_to_start' THEN
        RAISE EXCEPTION 'Game request is not in a startable state: %', v_req.status;
    END IF;
    
    IF v_req.requester_user_id != p_started_by_user_id THEN
        RAISE EXCEPTION 'Only the requester can start the game';
    END IF;
    
    INSERT INTO public.matches (
        game_request_id,
        room_category_id,
        game_type_id,
        started_by_user_id,
        category,
        pay_mode,
        amount,
        status,
        started_at
    ) VALUES (
        v_req.id,
        v_req.room_category_id,
        v_req.game_type_id,
        v_req.requester_user_id,
        v_req.category,
        v_req.pay_mode,
        v_req.amount,
        'in_progress',
        NOW()
    ) RETURNING id INTO v_match_id;
    
    FOR v_part IN (SELECT * FROM public.game_request_participants WHERE game_request_id = p_request_id AND status = 'joined' ORDER BY joined_at ASC) LOOP
        INSERT INTO public.match_participants (
            match_id,
            user_id,
            seat_no,
            status
        ) VALUES (
            v_match_id,
            v_part.user_id,
            (SELECT count(*) + 1 FROM public.match_participants WHERE match_id = v_match_id),
            'active'
        );
        
        IF v_req.amount > 0 THEN
            SELECT id INTO v_target_w_id FROM public.wallets WHERE user_id = v_part.user_id FOR UPDATE;
            
            IF (SELECT available_balance FROM public.wallets WHERE id = v_target_w_id) < v_req.amount THEN
                RAISE EXCEPTION 'User % has insufficient balance', v_part.user_id;
            END IF;
            
            UPDATE public.wallets SET
                available_balance = available_balance - v_req.amount,
                locked_balance = locked_balance + v_req.amount,
                updated_at = NOW()
            WHERE id = v_target_w_id;
            
            INSERT INTO public.wallet_transactions (
                wallet_id,
                user_id,
                transaction_type,
                direction,
                amount,
                status,
                reference,
                description,
                metadata
            ) VALUES (
                v_target_w_id,
                v_part.user_id,
                'wager_lock',
                'debit',
                v_req.amount,
                'successful',
                v_match_id::text,
                'Wager locked for match ' || v_match_id::text,
                jsonb_build_object('match_id', v_match_id, 'request_id', p_request_id)
            );
        END IF;
        
        UPDATE public.game_request_participants SET status = 'locked_in' WHERE id = v_part.id;
    END LOOP;
    
    UPDATE public.game_requests SET status = 'started', started_at = NOW() WHERE id = p_request_id;
    
    RETURN jsonb_build_object('success', true, 'match_id', v_match_id);
END;
$$;

-- 9. Cancel Game Request Function
DROP FUNCTION IF EXISTS public.cancel_game_request(UUID, UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.cancel_game_request(
    p_request_id UUID,
    p_user_id UUID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_req RECORD;
BEGIN
    SELECT * INTO v_req FROM public.game_requests WHERE id = p_request_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Game request not found';
    END IF;
    
    IF v_req.requester_user_id != p_user_id THEN
        RAISE EXCEPTION 'Only the requester can cancel the request';
    END IF;
    
    IF v_req.status = 'started' THEN
        RAISE EXCEPTION 'Cannot cancel a game that has already started';
    END IF;
    
    UPDATE public.game_requests SET 
        status = 'cancelled', 
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id;
    
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to cancel game request: %', SQLERRM;
END;
$$;

-- 10. Leave Game Request Function
DROP FUNCTION IF EXISTS public.leave_game_request(UUID, UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.leave_game_request(
    p_request_id UUID,
    p_user_id UUID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_part RECORD;
BEGIN
    SELECT * INTO v_part FROM public.game_request_participants 
    WHERE game_request_id = p_request_id AND user_id = p_user_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Participation not found';
    END IF;
    
    IF v_part.role = 'requester' THEN
        RAISE EXCEPTION 'Requester should cancel the request instead of leaving';
    END IF;
    
    DELETE FROM public.game_request_participants WHERE id = v_part.id;
    
    -- Update request status back to awaiting_opponents if it was ready_to_start
    UPDATE public.game_requests SET 
        status = 'awaiting_opponents',
        updated_at = NOW()
    WHERE id = p_request_id AND status = 'ready_to_start';
    
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to leave game request: %', SQLERRM;
END;
$$;

-- 11. Check Active Participation Function
DROP FUNCTION IF EXISTS public.check_user_active_participation(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.check_user_active_participation(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_a_request_id UUID;
    v_a_match_id UUID;
BEGIN
    -- Check for active pending request (as requester or joined participant)
    SELECT grp.game_request_id INTO v_a_request_id
    FROM public.game_request_participants grp
    JOIN public.game_requests gr ON gr.id = grp.game_request_id
    WHERE grp.user_id = p_user_id 
    AND grp.status = 'joined'
    AND gr.status IN ('awaiting_opponents', 'ready_to_start')
    LIMIT 1;
    
    IF v_a_request_id IS NOT NULL THEN
        RETURN jsonb_build_object('active', true, 'type', 'request', 'id', v_a_request_id);
    END IF;
    
    -- Check for active match
    SELECT mp.match_id INTO v_a_match_id
    FROM public.match_participants mp
    JOIN public.matches m ON m.id = mp.match_id
    WHERE mp.user_id = p_user_id
    AND mp.status = 'active'
    AND m.status IN ('waiting', 'in_progress')
    LIMIT 1;
    
    IF v_a_match_id IS NOT NULL THEN
        RETURN jsonb_build_object('active', true, 'type', 'match', 'id', v_a_match_id);
    END IF;
    
    RETURN jsonb_build_object('active', false);
END;
$$;

-- 12. Presence Helper Functions
DROP FUNCTION IF EXISTS public.update_match_presence(uuid, uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.update_match_presence(
    p_match_id uuid,
    p_user_id uuid
) RETURNS jsonb LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.match_participants
    SET reconnected_at = NOW(),
        disconnect_detected_at = NULL,
        countdown_expires_at = NULL
    WHERE match_id = p_match_id AND user_id = p_user_id;

    INSERT INTO public.match_heartbeats (match_id, user_id, last_seen_at, updated_at)
    VALUES (p_match_id, p_user_id, NOW(), NOW())
    ON CONFLICT (match_id, user_id) DO UPDATE SET
        last_seen_at = EXCLUDED.last_seen_at,
        updated_at = EXCLUDED.updated_at;

    RETURN jsonb_build_object('success', true);
END;
$$;

DROP FUNCTION IF EXISTS public.check_match_timeouts(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.check_match_timeouts(p_match_id uuid)
RETURNS jsonb LANGUAGE plpgsql AS $$
BEGIN
    -- No logic needed directly here as the Node server handles the timeouts via HeartbeatService
    RETURN jsonb_build_object('success', true);
END;
$$;

-- 13. Seed Data Initialization
INSERT INTO public.room_categories (name, code, min_wager, max_wager, is_free, sort_order) VALUES
('Ghetto Yard', 'ghetto_yard', 0.00, 0.00, TRUE, 1),
('Hustlers Hub', 'hustlers_hub', 100.00, 999.00, FALSE, 2),
('Pro League', 'pro_league', 1000.00, 9999.00, FALSE, 3),
('Odogwu Circle', 'odogwu_circle', 10000.00, 99999.00, FALSE, 4),
('Grandmasters Lounge', 'grandmasters_lounge', 100000.00, NULL, FALSE, 5)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.game_types (name, code, min_players, max_players) VALUES
('Chess', 'chess', 2, 2),
('Ludo', 'ludo', 2, 4),
('Dice', 'dice', 2, 5),
('Whot', 'whot', 2, 4)
ON CONFLICT (code) DO NOTHING;

-- 14. RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data" ON public.users FOR SELECT USING (auth.uid() = id);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.room_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active room categories" ON public.room_categories;
CREATE POLICY "Anyone can view active room categories" ON public.room_categories FOR SELECT USING (is_active = TRUE);

ALTER TABLE public.game_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active game types" ON public.game_types;
CREATE POLICY "Anyone can view active game types" ON public.game_types FOR SELECT USING (is_active = TRUE);

ALTER TABLE public.game_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view open game requests" ON public.game_requests;
CREATE POLICY "Anyone can view open game requests" ON public.game_requests FOR SELECT USING (status IN ('awaiting_opponents', 'ready_to_start'));
DROP POLICY IF EXISTS "Users can create game requests" ON public.game_requests;
CREATE POLICY "Users can create game requests" ON public.game_requests FOR INSERT WITH CHECK (auth.uid() = requester_user_id);

ALTER TABLE public.game_request_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view request participants" ON public.game_request_participants;
CREATE POLICY "Anyone can view request participants" ON public.game_request_participants FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Users can join requests" ON public.game_request_participants;
CREATE POLICY "Users can join requests" ON public.game_request_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view matches" ON public.matches;
CREATE POLICY "Anyone can view matches" ON public.matches FOR SELECT USING (TRUE);

ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view match participants" ON public.match_participants;
CREATE POLICY "Anyone can view match participants" ON public.match_participants FOR SELECT USING (TRUE);

ALTER TABLE public.game_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view game states" ON public.game_states;
CREATE POLICY "Anyone can view game states" ON public.game_states FOR SELECT USING (TRUE);

ALTER TABLE public.game_moves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view game moves" ON public.game_moves;
CREATE POLICY "Anyone can view game moves" ON public.game_moves FOR SELECT USING (TRUE);

ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view match results" ON public.match_results;
CREATE POLICY "Anyone can view match results" ON public.match_results FOR SELECT USING (TRUE);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view chat rooms" ON public.chat_rooms;
CREATE POLICY "Anyone can view chat rooms" ON public.chat_rooms FOR SELECT USING (TRUE);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view chat messages" ON public.chat_messages;
CREATE POLICY "Anyone can view chat messages" ON public.chat_messages FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Users can insert own messages" ON public.chat_messages;
CREATE POLICY "Users can insert own messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_user_id);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own friendships" ON public.friendships;
CREATE POLICY "Users can view own friendships" ON public.friendships FOR SELECT USING (auth.uid() = requester_user_id OR auth.uid() = addressee_user_id);

-- 15. Indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_requests_status ON public.game_requests(status);
CREATE INDEX IF NOT EXISTS idx_match_participants_match_id ON public.match_participants(match_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_user_id ON public.match_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_game_states_match_id ON public.game_states(match_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_match_id ON public.game_moves(match_id);
