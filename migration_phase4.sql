-- SQL Migration for DeeGames Phase 4: Social, Communication, and Engagement

-- 1. Chat Rooms Table
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_type TEXT NOT NULL, -- 'room', 'match'
    context_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(context_type, context_id)
);

-- 2. Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    sender_user_id UUID NOT NULL REFERENCES public.users(id),
    message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'system'
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 3. Match Voice Rooms Table
CREATE TABLE IF NOT EXISTS public.match_voice_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL UNIQUE REFERENCES public.matches(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'daily',
    daily_room_name TEXT NOT NULL,
    daily_room_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'ended'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Friendships (Cliques) Table
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_user_id UUID NOT NULL REFERENCES public.users(id),
    addressee_user_id UUID NOT NULL REFERENCES public.users(id),
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'blocked', 'removed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (requester_user_id != addressee_user_id),
    UNIQUE(requester_user_id, addressee_user_id)
);

-- 5. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'friend_request_received', 'friend_request_accepted', 'request_joined', 'match_started', etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- 6. Player Reports Table
CREATE TABLE IF NOT EXISTS public.player_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_user_id UUID NOT NULL REFERENCES public.users(id),
    reported_user_id UUID NOT NULL REFERENCES public.users(id),
    match_id UUID REFERENCES public.matches(id),
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'submitted', -- 'submitted', 'reviewed', 'resolved', 'dismissed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'closed', 'resolved'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Extend Users Table for Presence
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- 9. RLS Policies

-- Chat Rooms
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view chat rooms" ON public.chat_rooms FOR SELECT USING (TRUE);

-- Chat Messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view chat messages" ON public.chat_messages FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can send messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_user_id);

-- Match Voice Rooms
ALTER TABLE public.match_voice_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Match participants can view voice room" ON public.match_voice_rooms FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.match_participants 
        WHERE match_id = public.match_voice_rooms.match_id 
        AND user_id = auth.uid()
    )
);

-- Friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own friendships" ON public.friendships FOR SELECT USING (
    auth.uid() = requester_user_id OR auth.uid() = addressee_user_id
);
CREATE POLICY "Users can create friend requests" ON public.friendships FOR INSERT WITH CHECK (
    auth.uid() = requester_user_id
);
CREATE POLICY "Users can update their own friendships" ON public.friendships FOR UPDATE USING (
    auth.uid() = requester_user_id OR auth.uid() = addressee_user_id
);

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (
    auth.uid() = user_id
);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (
    auth.uid() = user_id
);

-- Player Reports
ALTER TABLE public.player_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own reports" ON public.player_reports FOR SELECT USING (
    auth.uid() = reporter_user_id
);
CREATE POLICY "Users can submit reports" ON public.player_reports FOR INSERT WITH CHECK (
    auth.uid() = reporter_user_id
);

-- Support Tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own tickets" ON public.support_tickets FOR SELECT USING (
    auth.uid() = user_id
);
CREATE POLICY "Users can submit tickets" ON public.support_tickets FOR INSERT WITH CHECK (
    auth.uid() = user_id
);

-- 10. Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON public.chat_messages(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships(addressee_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_player_reports_reported ON public.player_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
