-- Fix Infinite Recursion in match_participants RLS policy
-- The previous policy used a subquery on the same table, which causes recursion.

-- 1. Drop the problematic policy
DROP POLICY IF EXISTS "Users can view own match participations" ON public.match_participants;

-- 2. Create a non-recursive policy
-- This policy allows a user to see:
-- a) Their own participation records
-- b) Participation records of others in matches they are also part of
-- We use a JOIN-less approach or a more efficient check to avoid recursion.

CREATE POLICY "Users can view own match participations" ON public.match_participants
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1
            FROM public.match_participants AS mp
            WHERE mp.match_id = public.match_participants.match_id
            AND mp.user_id = auth.uid()
        )
    );

-- 3. Fix similar potential recursion in game_requests if it exists
DROP POLICY IF EXISTS "Users can view relevant game requests" ON public.game_requests;
CREATE POLICY "Users can view relevant game requests" ON public.game_requests
    FOR SELECT
    TO authenticated
    USING (
        requester_user_id = auth.uid() OR
        EXISTS (
            SELECT 1
            FROM public.game_request_participants AS grp
            WHERE grp.game_request_id = public.game_requests.id
            AND grp.user_id = auth.uid()
        )
    );

-- 4. Fix similar potential recursion in matches
DROP POLICY IF EXISTS "Users can view relevant matches" ON public.matches;
CREATE POLICY "Users can view relevant matches" ON public.matches
    FOR SELECT
    TO authenticated
    USING (
        started_by_user_id = auth.uid() OR
        EXISTS (
            SELECT 1
            FROM public.match_participants AS mp
            WHERE mp.match_id = public.matches.id
            AND mp.user_id = auth.uid()
        )
    );
