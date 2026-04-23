-- Fix game_states total_rounds NOT NULL constraint
ALTER TABLE public.game_states ALTER COLUMN total_rounds DROP NOT NULL;
ALTER TABLE public.game_states ALTER COLUMN current_round DROP NOT NULL;
ALTER TABLE public.game_states ALTER COLUMN current_round SET DEFAULT 1;
