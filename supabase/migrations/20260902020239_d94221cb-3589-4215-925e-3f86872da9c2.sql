ALTER TABLE public.games ADD COLUMN IF NOT EXISTS gag_history jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS thief_variant text NOT NULL DEFAULT 'centre';
CREATE UNIQUE INDEX IF NOT EXISTS games_code_key ON public.games (code);
CREATE UNIQUE INDEX IF NOT EXISTS seats_game_position_key ON public.seats (game_id, position);
CREATE INDEX IF NOT EXISTS reveals_game_idx ON public.reveals (game_id);