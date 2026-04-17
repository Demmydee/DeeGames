-- Fix for Chat and Social Features

-- 1. Ensure Table Existence (Re-run migration parts if needed)
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_type TEXT NOT NULL,
    context_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(context_type, context_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    sender_user_id UUID NOT NULL REFERENCES public.users(id),
    message_type TEXT NOT NULL DEFAULT 'text',
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 2. Update RLS Policies for Users (Allow seeing other usernames)
-- This is critical for joins and social features
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
CREATE POLICY "Public profiles are viewable by everyone" ON public.users
    FOR SELECT
    USING (TRUE);

-- 3. Update RLS Policies for Chat
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view chat rooms" ON public.chat_rooms;
CREATE POLICY "Anyone can view chat rooms" ON public.chat_rooms FOR SELECT USING (TRUE);
-- Add INSERT policy just in case backend falls back to anon key
DROP POLICY IF EXISTS "System can create chat rooms" ON public.chat_rooms;
CREATE POLICY "System can create chat rooms" ON public.chat_rooms FOR INSERT WITH CHECK (TRUE);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view chat messages" ON public.chat_messages;
CREATE POLICY "Anyone can view chat messages" ON public.chat_messages FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.chat_messages;
CREATE POLICY "Authenticated users can send messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_user_id);

-- 4. Fix Friendships (Cliques)
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friendships;
CREATE POLICY "Users can view their own friendships" ON public.friendships FOR SELECT USING (
    auth.uid() = requester_user_id OR auth.uid() = addressee_user_id
);

-- 5. Fix for Recent Opponents join failure
-- If socialController.ts uses the anon key, it needs to see other participants
ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view match participants" ON public.match_participants;
CREATE POLICY "Anyone can view match participants" ON public.match_participants FOR SELECT USING (TRUE);
