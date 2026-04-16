-- Phase 5A: Dice Game Engine and Settlement Schema

-- 1. Extend game_requests
ALTER TABLE public.game_requests ADD COLUMN IF NOT EXISTS game_variant text;

-- 2. Extend match_participants
ALTER TABLE public.match_participants ADD COLUMN IF NOT EXISTS disconnect_detected_at timestamptz;
ALTER TABLE public.match_participants ADD COLUMN IF NOT EXISTS reconnected_at timestamptz;
ALTER TABLE public.match_participants ADD COLUMN IF NOT EXISTS countdown_expires_at timestamptz;
ALTER TABLE public.match_participants ADD COLUMN IF NOT EXISTS defeat_reason text; -- 'left', 'disconnected', 'eliminated', 'loss'

-- 3. game_states table
CREATE TABLE IF NOT EXISTS public.game_states (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id uuid UNIQUE NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    game_type text NOT NULL, -- 'dice'
    game_variant text NOT NULL, -- 'sudden_drop', 'marathon'
    state jsonb NOT NULL DEFAULT '{}'::jsonb,
    current_round integer NOT NULL DEFAULT 1,
    total_rounds integer NOT NULL DEFAULT 1,
    status text NOT NULL DEFAULT 'active', -- 'active', 'completed', 'abandoned'
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 4. game_moves table
CREATE TABLE IF NOT EXISTS public.game_moves (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    game_state_id uuid NOT NULL REFERENCES public.game_states(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id),
    move_type text NOT NULL, -- 'roll', 'tie_reroll', 'sudden_death_roll'
    move_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    result_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    round_number integer NOT NULL,
    move_number integer NOT NULL,
    is_valid boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- 5. match_results table
CREATE TABLE IF NOT EXISTS public.match_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id uuid UNIQUE NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    pay_mode text NOT NULL, -- 'knockout', 'split', 'free'
    total_pool_kobo bigint NOT NULL DEFAULT 0,
    house_cut_kobo bigint NOT NULL DEFAULT 0,
    net_pool_kobo bigint NOT NULL DEFAULT 0,
    winners_count integer NOT NULL DEFAULT 0,
    losers_count integer NOT NULL DEFAULT 0,
    rankings jsonb NOT NULL DEFAULT '[]'::jsonb,
    settlement_status text NOT NULL DEFAULT 'pending', -- 'pending', 'settled', 'failed', 'refunded'
    settled_at timestamptz,
    failure_reason text,
    created_at timestamptz DEFAULT now()
);

-- 6. match_payouts table
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
    defeat_reason text, -- 'left', 'disconnected', 'eliminated', 'loss'
    wallet_transaction_id uuid, -- REFERENCES public.wallet_transactions(id)
    created_at timestamptz DEFAULT now()
);

-- 7. house_revenue table
CREATE TABLE IF NOT EXISTS public.house_revenue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id uuid NOT NULL REFERENCES public.matches(id),
    match_result_id uuid REFERENCES public.match_results(id),
    amount_kobo bigint NOT NULL DEFAULT 0,
    currency text DEFAULT 'NGN',
    created_at timestamptz DEFAULT now()
);

-- 8. match_heartbeats table
CREATE TABLE IF NOT EXISTS public.match_heartbeats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id),
    last_seen_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(match_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_game_moves_match_id ON public.game_moves(match_id);
CREATE INDEX IF NOT EXISTS idx_match_payouts_user_id ON public.match_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_match_heartbeats_match_id ON public.match_heartbeats(match_id);
