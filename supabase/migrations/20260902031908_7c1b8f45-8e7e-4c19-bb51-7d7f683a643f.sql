ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS single_device boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS host_state jsonb NOT NULL DEFAULT '{}'::jsonb;