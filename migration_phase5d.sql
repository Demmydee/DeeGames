-- Ensure description column exists (it might be missing if table was created in early phase)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_types' AND column_name='description') THEN
        ALTER TABLE public.game_types ADD COLUMN description TEXT;
    END IF;
END $$;

-- Add Whot Game Type
INSERT INTO game_types (name, code, description, min_players, max_players)
VALUES (
  'Whot',
  'whot',
  'Popular Nigerian card game with special effects and stacking rules. Classic and Scored variants.',
  2,
  4
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  min_players = EXCLUDED.min_players,
  max_players = EXCLUDED.max_players;
