CREATE TABLE public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  host_token text NOT NULL,
  status text NOT NULL DEFAULT 'lobby',
  player_count int NOT NULL DEFAULT 8,
  selection jsonb NOT NULL DEFAULT '{}'::jsonb,
  center_cards jsonb NOT NULL DEFAULT '[]'::jsonb,
  night int NOT NULL DEFAULT 0,
  phase text NOT NULL DEFAULT 'nuit',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  position int NOT NULL,
  name text NOT NULL DEFAULT '',
  role_id text,
  alive boolean NOT NULL DEFAULT true,
  death_cause text,
  death_order int,
  is_captain boolean NOT NULL DEFAULT false,
  lover_group int,
  statuses text[] NOT NULL DEFAULT '{}',
  public_role boolean NOT NULL DEFAULT false,
  device_token text,
  seen boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, position)
);

CREATE TABLE public.reveals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  target_position int NOT NULL,
  to_position int NOT NULL,
  note text,
  acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX games_code_idx ON public.games (code);
CREATE INDEX seats_game_idx ON public.seats (game_id);
CREATE INDEX reveals_game_idx ON public.reveals (game_id);

GRANT ALL ON public.games TO service_role;
GRANT ALL ON public.seats TO service_role;
GRANT ALL ON public.reveals TO service_role;

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reveals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_games_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER games_touch_updated_at
BEFORE UPDATE ON public.games
FOR EACH ROW EXECUTE FUNCTION public.touch_games_updated_at();