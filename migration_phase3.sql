-- SQL Migration for DeeGames Phase 3: Lobby, Rooms, Game Requests, Matches, and Wager Locking

-- 1. Room Categories Table
CREATE TABLE IF NOT EXISTS public.room_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    min_wager DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    max_wager DECIMAL(15, 2), -- NULL means no upper limit
    is_free BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Game Types Table
CREATE TABLE IF NOT EXISTS public.game_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    min_players INTEGER NOT NULL DEFAULT 2,
    max_players INTEGER NOT NULL DEFAULT 2,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Game Requests Table
CREATE TABLE IF NOT EXISTS public.game_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_category_id UUID NOT NULL REFERENCES public.room_categories(id),
    game_type_id UUID NOT NULL REFERENCES public.game_types(id),
    requester_user_id UUID NOT NULL REFERENCES public.users(id),
    category TEXT NOT NULL, -- duel, arena
    pay_mode TEXT NOT NULL, -- knockout, split
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    required_players INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'awaiting_opponents', -- awaiting_opponents, ready_to_start, started, cancelled, expired
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

-- 4. Game Request Participants Table
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

-- 5. Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_request_id UUID REFERENCES public.game_requests(id),
    room_category_id UUID NOT NULL REFERENCES public.room_categories(id),
    game_type_id UUID NOT NULL REFERENCES public.game_types(id),
    started_by_user_id UUID NOT NULL REFERENCES public.users(id),
    category TEXT NOT NULL,
    pay_mode TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'waiting', -- waiting, in_progress, completed, cancelled
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ
);

-- 6. Match Participants Table
CREATE TABLE IF NOT EXISTS public.match_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    seat_no INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- active, left, defeated, winner, eliminated
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    UNIQUE(match_id, user_id)
);

-- 7. Seed Data
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

-- 8. RLS Policies
ALTER TABLE public.room_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active room categories" ON public.room_categories FOR SELECT USING (is_active = TRUE);

ALTER TABLE public.game_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active game types" ON public.game_types FOR SELECT USING (is_active = TRUE);

ALTER TABLE public.game_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active game requests" ON public.game_requests FOR SELECT USING (status IN ('awaiting_opponents', 'ready_to_start', 'started'));
CREATE POLICY "Users can create game requests" ON public.game_requests FOR INSERT WITH CHECK (auth.uid() = requester_user_id);
CREATE POLICY "Requesters can update their own requests" ON public.game_requests FOR UPDATE USING (auth.uid() = requester_user_id);

ALTER TABLE public.game_request_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view request participants" ON public.game_request_participants FOR SELECT USING (TRUE);
CREATE POLICY "Users can join requests" ON public.game_request_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave requests" ON public.game_request_participants FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view matches" ON public.matches FOR SELECT USING (TRUE);

ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view match participants" ON public.match_participants FOR SELECT USING (TRUE);

-- 9. Atomic Start Game Request Function
CREATE OR REPLACE FUNCTION public.start_game_request_atomic(
    p_request_id UUID,
    p_started_by_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_request RECORD;
    v_participant RECORD;
    v_match_id UUID;
    v_wallet_id UUID;
    v_result JSONB;
BEGIN
    -- 1. Lock request for update
    SELECT * INTO v_request FROM public.game_requests WHERE id = p_request_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Game request not found';
    END IF;
    
    IF v_request.status != 'awaiting_opponents' AND v_request.status != 'ready_to_start' THEN
        RAISE EXCEPTION 'Game request is not in a startable state: %', v_request.status;
    END IF;
    
    IF v_request.requester_user_id != p_started_by_user_id THEN
        RAISE EXCEPTION 'Only the requester can start the game';
    END IF;
    
    -- 2. Verify participant count
    IF (SELECT count(*) FROM public.game_request_participants WHERE game_request_id = p_request_id AND status = 'joined') < v_request.required_players THEN
        RAISE EXCEPTION 'Not enough players to start the game';
    END IF;
    
    -- 3. Create Match
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
        v_request.id,
        v_request.room_category_id,
        v_request.game_type_id,
        v_request.requester_user_id,
        v_request.category,
        v_request.pay_mode,
        v_request.amount,
        'in_progress',
        NOW()
    ) RETURNING id INTO v_match_id;
    
    -- 4. Process each participant
    FOR v_participant IN (SELECT * FROM public.game_request_participants WHERE game_request_id = p_request_id AND status = 'joined' ORDER BY joined_at ASC) LOOP
        -- Add to match_participants
        INSERT INTO public.match_participants (
            match_id,
            user_id,
            seat_no,
            status
        ) VALUES (
            v_match_id,
            v_participant.user_id,
            (SELECT count(*) + 1 FROM public.match_participants WHERE match_id = v_match_id),
            'active'
        );
        
        -- Wager Locking (if amount > 0)
        IF v_request.amount > 0 THEN
            -- Lock wallet row
            SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = v_participant.user_id FOR UPDATE;
            
            -- Check balance and update
            IF (SELECT available_balance FROM public.wallets WHERE id = v_wallet_id) < v_request.amount THEN
                RAISE EXCEPTION 'User % has insufficient balance', v_participant.user_id;
            END IF;
            
            UPDATE public.wallets SET
                available_balance = available_balance - v_request.amount,
                locked_balance = locked_balance + v_request.amount,
                updated_at = NOW()
            WHERE id = v_wallet_id;
            
            -- Create transaction record
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
                v_wallet_id,
                v_participant.user_id,
                'wager_lock',
                'debit',
                v_request.amount,
                'successful',
                v_match_id::text,
                'Wager locked for match ' || v_match_id,
                jsonb_build_object('match_id', v_match_id, 'request_id', p_request_id)
            );
        END IF;
        
        -- Update participant status in request
        UPDATE public.game_request_participants SET status = 'locked_in' WHERE id = v_participant.id;
    END LOOP;
    
    -- 5. Update request status
    UPDATE public.game_requests SET status = 'started', started_at = NOW() WHERE id = p_request_id;
    
    RETURN jsonb_build_object('success', true, 'match_id', v_match_id);
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to start game: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Check Active Participation Function
CREATE OR REPLACE FUNCTION public.check_user_active_participation(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_active_request_id UUID;
    v_active_match_id UUID;
BEGIN
    -- Check for active pending request (as requester or joined participant)
    SELECT grp.game_request_id INTO v_active_request_id
    FROM public.game_request_participants grp
    JOIN public.game_requests gr ON gr.id = grp.game_request_id
    WHERE grp.user_id = p_user_id 
    AND grp.status = 'joined'
    AND gr.status IN ('awaiting_opponents', 'ready_to_start')
    LIMIT 1;
    
    IF v_active_request_id IS NOT NULL THEN
        RETURN jsonb_build_object('active', true, 'type', 'request', 'id', v_active_request_id);
    END IF;
    
    -- Check for active match
    SELECT mp.match_id INTO v_active_match_id
    FROM public.match_participants mp
    JOIN public.matches m ON m.id = mp.match_id
    WHERE mp.user_id = p_user_id
    AND mp.status = 'active'
    AND m.status IN ('waiting', 'in_progress')
    LIMIT 1;
    
    IF v_active_match_id IS NOT NULL THEN
        RETURN jsonb_build_object('active', true, 'type', 'match', 'id', v_active_match_id);
    END IF;
    
    RETURN jsonb_build_object('active', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Indexes
CREATE INDEX IF NOT EXISTS idx_game_requests_room_category_id ON public.game_requests(room_category_id);
CREATE INDEX IF NOT EXISTS idx_game_requests_status ON public.game_requests(status);
CREATE INDEX IF NOT EXISTS idx_game_request_participants_request_id ON public.game_request_participants(game_request_id);
CREATE INDEX IF NOT EXISTS idx_game_request_participants_user_id ON public.game_request_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_match_participants_match_id ON public.match_participants(match_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_user_id ON public.match_participants(user_id);
