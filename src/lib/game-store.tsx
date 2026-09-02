import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ROLES_BY_ID } from "@/data/roles";

export interface Player {
  id: string;
  name: string;
  roleId: string;
  revealed: boolean;
  alive: boolean;
  /** Cartes du centre proposées au Voleur */
  stolenFrom?: string;
}

export interface GameState {
  playerCount: number;
  names: string[];
  /** roleId -> quantité */
  selection: Record<string, number>;
  players: Player[];
  centerCards: string[];
  /** index du joueur en cours de distribution */
  cursor: number;
  started: boolean;
  createdAt: number;
}

const STORAGE_KEY = "loup-garou-state-v1";

const EMPTY: GameState = {
  playerCount: 8,
  names: [],
  selection: {},
  players: [],
  centerCards: [],
  cursor: 0,
  started: false,
  createdAt: 0,
};

interface Ctx {
  state: GameState;
  hydrated: boolean;
  setPlayerCount: (n: number) => void;
  setName: (index: number, name: string) => void;
  setSelection: (selection: Record<string, number>) => void;
  addRole: (roleId: string) => void;
  removeRole: (roleId: string) => void;
  totalSelected: number;
  deal: () => void;
  revealCurrent: () => void;
  nextPlayer: () => void;
  toggleAlive: (playerId: string) => void;
  swapRoles: (aId: string, bId: string) => void;
  takeCenterCard: (playerId: string, roleId: string) => void;
  reset: () => void;
}

const GameContext = createContext<Ctx | null>(null);

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...EMPTY, ...(JSON.parse(raw) as GameState) });
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  const setPlayerCount = useCallback((n: number) => {
    setState((s) => ({ ...s, playerCount: Math.max(4, Math.min(24, n)) }));
  }, []);

  const setName = useCallback((index: number, name: string) => {
    setState((s) => {
      const names = [...s.names];
      while (names.length <= index) names.push("");
      names[index] = name;
      return { ...s, names };
    });
  }, []);

  const setSelection = useCallback((selection: Record<string, number>) => {
    setState((s) => ({ ...s, selection }));
  }, []);

  const addRole = useCallback((roleId: string) => {
    setState((s) => {
      const role = ROLES_BY_ID[roleId];
      const current = s.selection[roleId] ?? 0;
      if (role?.max && current >= role.max) return s;
      return { ...s, selection: { ...s.selection, [roleId]: current + 1 } };
    });
  }, []);

  const removeRole = useCallback((roleId: string) => {
    setState((s) => {
      const current = s.selection[roleId] ?? 0;
      if (current <= 1) {
        const next = { ...s.selection };
        delete next[roleId];
        return { ...s, selection: next };
      }
      return { ...s, selection: { ...s.selection, [roleId]: current - 1 } };
    });
  }, []);

  const totalSelected = useMemo(
    () => Object.values(state.selection).reduce((a, b) => a + b, 0),
    [state.selection],
  );

  const deal = useCallback(() => {
    setState((s) => {
      const pool: string[] = [];
      Object.entries(s.selection).forEach(([roleId, count]) => {
        for (let i = 0; i < count; i++) pool.push(roleId);
      });
      const hasThief = pool.includes("voleur");
      const shuffled = shuffle(pool);
      const dealt = shuffled.slice(0, s.playerCount);
      const center = hasThief ? shuffled.slice(s.playerCount, s.playerCount + 2) : [];

      const players: Player[] = dealt.map((roleId, i) => ({
        id: `p${i}`,
        name: s.names[i]?.trim() || `Joueur ${i + 1}`,
        roleId,
        revealed: false,
        alive: true,
      }));

      return { ...s, players, centerCards: center, cursor: 0, started: true, createdAt: Date.now() };
    });
  }, []);

  const revealCurrent = useCallback(() => {
    setState((s) => {
      const players = s.players.map((p, i) =>
        i === s.cursor ? { ...p, revealed: true } : p,
      );
      return { ...s, players };
    });
  }, []);

  const nextPlayer = useCallback(() => {
    setState((s) => ({ ...s, cursor: Math.min(s.cursor + 1, s.players.length) }));
  }, []);

  const toggleAlive = useCallback((playerId: string) => {
    setState((s) => ({
      ...s,
      players: s.players.map((p) => (p.id === playerId ? { ...p, alive: !p.alive } : p)),
    }));
  }, []);

  const swapRoles = useCallback((aId: string, bId: string) => {
    setState((s) => {
      const a = s.players.find((p) => p.id === aId);
      const b = s.players.find((p) => p.id === bId);
      if (!a || !b) return s;
      return {
        ...s,
        players: s.players.map((p) =>
          p.id === aId
            ? { ...p, roleId: b.roleId, stolenFrom: b.name }
            : p.id === bId
              ? { ...p, roleId: a.roleId, stolenFrom: a.name }
              : p,
        ),
      };
    });
  }, []);

  const takeCenterCard = useCallback((playerId: string, roleId: string) => {
    setState((s) => {
      const player = s.players.find((p) => p.id === playerId);
      if (!player) return s;
      const remaining = s.centerCards.filter((c) => c !== roleId);
      // la carte du voleur retourne au centre
      const centerCards = [...remaining, player.roleId].slice(0, 2);
      return {
        ...s,
        centerCards,
        players: s.players.map((p) =>
          p.id === playerId ? { ...p, roleId, stolenFrom: "le centre" } : p,
        ),
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState((s) => ({
      ...EMPTY,
      playerCount: s.playerCount,
      names: s.names,
      selection: s.selection,
    }));
  }, []);

  const value: Ctx = {
    state,
    hydrated,
    setPlayerCount,
    setName,
    setSelection,
    addRole,
    removeRole,
    totalSelected,
    deal,
    revealCurrent,
    nextPlayer,
    toggleAlive,
    swapRoles,
    takeCenterCard,
    reset,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame doit être utilisé dans GameProvider");
  return ctx;
}
