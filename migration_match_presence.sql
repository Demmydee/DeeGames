-- Migration: Add presence tracking to match participants
ALTER TABLE public.match_participants
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_away BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS away_since TIMESTAMPTZ;

-- Function to update match participant presence
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

-- Function to check for match timeouts (to be called by backend or cron)
-- For now, we'll just have the backend call it during match fetch
CREATE OR REPLACE FUNCTION public.check_match_timeouts(p_match_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Mark participants as away if not seen for 15 seconds
    UPDATE public.match_participants
    SET
        is_away = TRUE,
        away_since = COALESCE(away_since, NOW())
    WHERE match_id = p_match_id
    AND status = 'active'
    AND last_seen_at < NOW() - INTERVAL '15 seconds'
    AND is_away = FALSE;

    -- Reset away status if seen recently
    UPDATE public.match_participants
    SET
        is_away = FALSE,
        away_since = NULL
    WHERE match_id = p_match_id
    AND status = 'active'
    AND last_seen_at >= NOW() - INTERVAL '15 seconds'
    AND is_away = TRUE;

    -- Mark as defeated if away for more than 300 seconds
    UPDATE public.match_participants
    SET
        status = 'left',
        left_at = NOW()
    WHERE match_id = p_match_id
    AND status = 'active'
    AND is_away = TRUE
    AND away_since < NOW() - INTERVAL '300 seconds';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
