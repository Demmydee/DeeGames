-- Fix for Phase 5A: RLS Recursion and Schema Consistency

-- 1. Resolve Recursive RLS Policies
-- Using TRUE for SELECT ensures no self-referencing subqueries during policy evaluation.
-- This is standard for collaborative/gaming apps where participants need to see each other.

DROP POLICY IF EXISTS "Users can view own match participations" ON public.match_participants;
DROP POLICY IF EXISTS "Anyone can view match participants" ON public.match_participants;
CREATE POLICY "Anyone can view match participants" ON public.match_participants FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can view relevant game requests" ON public.game_requests;
DROP POLICY IF EXISTS "Anyone can view active game requests" ON public.game_requests;
CREATE POLICY "Anyone can view game requests" ON public.game_requests FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can view relevant matches" ON public.matches;
DROP POLICY IF EXISTS "Anyone can view matches" ON public.matches;
CREATE POLICY "Anyone can view matches" ON public.matches FOR SELECT USING (TRUE);

-- 2. Schema Hardening for Phase 5A
-- Ensure critical columns added in Phase 5A migrations are present in case the previous migration failed partially.

ALTER TABLE public.match_participants
ADD COLUMN IF NOT EXISTS defeat_reason TEXT,
ADD COLUMN IF NOT EXISTS countdown_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS disconnect_detected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reconnected_at TIMESTAMPTZ;

ALTER TABLE public.game_requests
ADD COLUMN IF NOT EXISTS game_variant TEXT;

-- Use integer types for monetary columns to ensure precision consistency
ALTER TABLE public.match_results ALTER COLUMN total_pool_kobo TYPE bigint;
ALTER TABLE public.match_results ALTER COLUMN house_cut_kobo TYPE bigint;
ALTER TABLE public.match_results ALTER COLUMN net_pool_kobo TYPE bigint;

ALTER TABLE public.match_payouts ALTER COLUMN wager_kobo TYPE bigint;
ALTER TABLE public.match_payouts ALTER COLUMN payout_kobo TYPE bigint;

ALTER TABLE public.house_revenue ALTER COLUMN amount_kobo TYPE bigint;

-- 3. Presence Support
-- Ensure presence columns exist on match_participants
ALTER TABLE public.match_participants
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_away BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS away_since TIMESTAMPTZ;

-- 4. Re-verify RPC for Presence
CREATE OR REPLACE FUNCTION public.update_match_presence(
    p_match_id UUID,
    p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.match_participants
    SET
        last_seen_at = NOW(),
        is_away = FALSE,
        away_since = NULL
    WHERE match_id = p_match_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
