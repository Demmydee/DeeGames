-- Fix RLS policies for dashboard and social features

-- 1. Users Table: Allow authenticated users to view public profiles of others
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.users;
CREATE POLICY "Public profiles are viewable by authenticated users" ON public.users
    FOR SELECT
    TO authenticated
    USING (true);

-- 2. Wallets Table: Allow users to create their own wallet (needed if backend uses user token)
DROP POLICY IF EXISTS "Users can create own wallet" ON public.wallets;
CREATE POLICY "Users can create own wallet" ON public.wallets
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 3. Match Participants Table: Ensure RLS is enabled and users can view their own matches and opponents
ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own match participations" ON public.match_participants;
CREATE POLICY "Users can view own match participations" ON public.match_participants
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id OR 
        match_id IN (
            SELECT match_id FROM public.match_participants WHERE user_id = auth.uid()
        )
    );

-- 4. Game Requests Table: Ensure RLS is enabled and users can view requests they are part of
ALTER TABLE public.game_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view relevant game requests" ON public.game_requests;
CREATE POLICY "Users can view relevant game requests" ON public.game_requests
    FOR SELECT
    TO authenticated
    USING (
        requester_user_id = auth.uid() OR
        id IN (
            SELECT game_request_id FROM public.game_request_participants WHERE user_id = auth.uid()
        )
    );

-- 5. Matches Table: Ensure RLS is enabled and users can view matches they are part of
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view relevant matches" ON public.matches;
CREATE POLICY "Users can view relevant matches" ON public.matches
    FOR SELECT
    TO authenticated
    USING (
        started_by_user_id = auth.uid() OR
        id IN (
            SELECT match_id FROM public.match_participants WHERE user_id = auth.uid()
        )
    );
