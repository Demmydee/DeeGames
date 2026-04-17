-- Security Fixes for Supabase Linter Warnings

-- 1. Enable RLS on Phase 5A Tables
ALTER TABLE public.game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_heartbeats ENABLE ROW LEVEL SECURITY;

-- 2. Define RLS Policies

-- Game States: Participants can read
DROP POLICY IF EXISTS "Participants can view game state" ON public.game_states;
CREATE POLICY "Participants can view game state" ON public.game_states
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.match_participants
            WHERE match_id = public.game_states.match_id
            AND user_id = auth.uid()
        )
    );

-- Game Moves: Participants can read
DROP POLICY IF EXISTS "Participants can view game moves" ON public.game_moves;
CREATE POLICY "Participants can view game moves" ON public.game_moves
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.match_participants
            WHERE match_id = public.game_moves.match_id
            AND user_id = auth.uid()
        )
    );

-- Match Results: Participants can read
DROP POLICY IF EXISTS "Participants can view match results" ON public.match_results;
CREATE POLICY "Participants can view match results" ON public.match_results
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.match_participants
            WHERE match_id = public.match_results.match_id
            AND user_id = auth.uid()
        )
    );

-- Match Payouts: Participants can read
DROP POLICY IF EXISTS "Participants can view match payouts" ON public.match_payouts;
CREATE POLICY "Participants can view match payouts" ON public.match_payouts
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.match_participants
            WHERE match_id = public.match_payouts.match_id
            AND user_id = auth.uid()
        )
    );

-- Match Heartbeats:
-- Read: Participants can see who is active
DROP POLICY IF EXISTS "Participants can view match heartbeats" ON public.match_heartbeats;
CREATE POLICY "Participants can view match heartbeats" ON public.match_heartbeats
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.match_participants
            WHERE match_id = public.match_heartbeats.match_id
            AND user_id = auth.uid()
        )
    );

-- Insert/Update: Users can manage their own heartbeats
DROP POLICY IF EXISTS "Users can update own heartbeats" ON public.match_heartbeats;
CREATE POLICY "Users can update own heartbeats" ON public.match_heartbeats
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- House Revenue: Default Deny (no policy means only service role)
-- We already enabled RLS above.

-- 3. Fix Function Search Paths for Security

-- Function: settle_match_atomic
ALTER FUNCTION public.settle_match_atomic(uuid, text, bigint, bigint, bigint, integer, integer, jsonb, jsonb) SET search_path = public;

-- Function: refund_match_wagers_atomic
ALTER FUNCTION public.refund_match_wagers_atomic(uuid, bigint) SET search_path = public;

-- Function: update_wallet_balance_atomic
ALTER FUNCTION public.update_wallet_balance_atomic(uuid, numeric, text, text) SET search_path = public;

-- Function: check_user_uniqueness
ALTER FUNCTION public.check_user_uniqueness(text, text, text) SET search_path = public;

-- Function: get_user_email_by_username
ALTER FUNCTION public.get_user_email_by_username(text) SET search_path = public;
