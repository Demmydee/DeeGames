-- Fix for missing Chat Relationships

DO $$
BEGIN
    -- 1. Ensure foreign key from chat_messages to users exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'chat_messages_sender_user_id_fkey'
        AND table_name = 'chat_messages'
    ) THEN
        ALTER TABLE public.chat_messages
        ADD CONSTRAINT chat_messages_sender_user_id_fkey
        FOREIGN KEY (sender_user_id)
        REFERENCES public.users(id);
    END IF;

    -- 2. Ensure foreign key from chat_messages to chat_rooms exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'chat_messages_chat_room_id_fkey'
        AND table_name = 'chat_messages'
    ) THEN
        ALTER TABLE public.chat_messages
        ADD CONSTRAINT chat_messages_chat_room_id_fkey
        FOREIGN KEY (chat_room_id)
        REFERENCES public.chat_rooms(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Ensure RLS allows the join
-- Joins in PostgREST require the user to have SELECT permission on both tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
CREATE POLICY "Public profiles are viewable by everyone" ON public.users
    FOR SELECT
    USING (TRUE);

-- 4. Reload PostgREST schema cache (Supabase specific)
-- Usually happens automatically on DDL, but we can nudge it by changing a comment
COMMENT ON TABLE public.chat_messages IS 'Store for all match and room chat messages';
