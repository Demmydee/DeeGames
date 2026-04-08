-- SQL Migration for DeeGames: Room Presence Tracking
CREATE TABLE IF NOT EXISTS public.room_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.room_categories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_room_presence_room_id ON public.room_presence(room_id);
CREATE INDEX IF NOT EXISTS idx_room_presence_last_seen_at ON public.room_presence(last_seen_at);

-- Enable RLS
ALTER TABLE public.room_presence ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated users to read room presence"
ON public.room_presence FOR SELECT
TO authenticated
USING (true);

-- Function to update presence
CREATE OR REPLACE FUNCTION public.update_room_presence(p_room_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.room_presence (room_id, user_id, last_seen_at)
    VALUES (p_room_id, p_user_id, NOW())
    ON CONFLICT (room_id, user_id)
    DO UPDATE SET last_seen_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to prune old presence (e.g., older than 30 seconds)
CREATE OR REPLACE FUNCTION public.prune_room_presence()
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.room_presence WHERE last_seen_at < NOW() - INTERVAL '30 seconds';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
