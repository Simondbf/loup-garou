import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { fetchGame, type GameDTO } from "@/lib/party.functions";

/**
 * Session locale : un jeton d'appareil (anonyme), le code de partie rejoint
 * et le rôle (MJ ou joueur). Tout le reste vit côté serveur.
 */
const TOKEN_KEY = "lg.device-token";
const SESSION_KEY = "lg.session";

export interface Session {
  code: string;
  host: boolean;
}

function readToken() {
  if (typeof window === "undefined") return "";
  let t = window.localStorage.getItem(TOKEN_KEY);
  if (!t) {
    t = crypto.randomUUID();
    window.localStorage.setItem(TOKEN_KEY, t);
  }
  return t;
}

function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

interface PartyContext {
  hydrated: boolean;
  token: string;
  session: Session | null;
  game: GameDTO | null;
  error: string | null;
  saveSession: (s: Session | null) => void;
  apply: (dto: GameDTO) => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<PartyContext | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [token, setToken] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [game, setGame] = useState<GameDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    setToken(readToken());
    setSession(readSession());
    setHydrated(true);
  }, []);

  const saveSession = useCallback((s: Session | null) => {
    setSession(s);
    if (typeof window === "undefined") return;
    if (s) window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(SESSION_KEY);
    if (!s) setGame(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!session?.code || !token || busy.current) return;
    busy.current = true;
    try {
      const dto = await fetchGame({ data: { code: session.code, token } });
      setGame(dto);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      busy.current = false;
    }
  }, [session?.code, token]);

  // Synchronisation légère : toutes les 3 s tant qu'une partie est active.
  useEffect(() => {
    if (!hydrated || !session?.code) return;
    void refresh();
    const id = window.setInterval(() => void refresh(), 3000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [hydrated, session?.code, refresh]);

  const value = useMemo<PartyContext>(
    () => ({
      hydrated,
      token,
      session,
      game,
      error,
      saveSession,
      apply: setGame,
      refresh,
    }),
    [hydrated, token, session, game, error, saveSession, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGame doit être utilisé dans <GameProvider>");
  return ctx;
}
