import {
  applyLocalMove,
  DEFAULT_BOARD_SIZE,
  emptyBoard,
  type GameSnapshot,
  type Move,
  type Player,
  resolveFlagFall,
  resolveTimeControl,
} from "./game/index.ts";
import {
  type MatchRecord,
  type MatchResult,
  registerMatchCreatedHook,
  settleMatchResult,
} from "./matchmaking.ts";
import { supabaseAdmin } from "./supabase.ts";

export type GameMoveRecord = {
  ply: number;
  player: Player;
  notation: string;
};

export type GameSession = {
  gameId: string;
  /** Matchmaking match id, or null for lobby games. */
  matchId: string | null;
  rated: boolean;
  timeControlId: string;
  /** X always maps to match.userAId, O to match.userBId. */
  playerXId: string;
  playerOId: string;
  snapshot: GameSnapshot;
  moves: GameMoveRecord[];
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  result: MatchResult | null;
};

export type SubmitMoveResult =
  | { ok: true; session: GameSession; notation: string }
  | {
    ok: false;
    code:
      | "not_found"
      | "forbidden"
      | "not_your_turn"
      | "illegal"
      | "game_over"
      | "flag_fell";
    session: GameSession | null;
  };

const sessions = new Map<string, GameSession>();
const activeGameByUser = new Map<string, string>();

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

function initialSnapshot(
  timeControlId: string,
  boardSize: number = DEFAULT_BOARD_SIZE,
): GameSnapshot {
  const control = resolveTimeControl(timeControlId, boardSize);

  return {
    board: emptyBoard(boardSize),
    size: boardSize,
    toMove: "X",
    ply: 0,
    clock: {
      remainingMsX: control.initialMs,
      remainingMsO: control.initialMs,
      incrementMs: control.incrementMs,
      turnStartedAt: new Date().toISOString(),
      clocksStartedAt: null,
    },
    terminal: null,
  };
}

function persistSession(session: GameSession) {
  try {
    supabaseAdmin()
      .from("games")
      .upsert({
        id: session.gameId,
        match_id: session.matchId,
        player_x_id: session.playerXId,
        player_o_id: session.playerOId,
        rated: session.rated,
        time_control_id: session.timeControlId,
        snapshot: session.snapshot,
        status: session.completedAt ? "completed" : "active",
        result: session.result,
        updated_at: new Date(session.updatedAt).toISOString(),
        completed_at: session.completedAt
          ? new Date(session.completedAt).toISOString()
          : null,
      }, { onConflict: "id" })
      .then(({ error }) => {
        if (error) console.error("game_persist_failed", error);
      });
  } catch (err) {
    console.error("game_persist_failed", err);
  }
}

function persistMove(session: GameSession, move: GameMoveRecord) {
  try {
    supabaseAdmin()
      .from("game_moves")
      .upsert({
        game_id: session.gameId,
        ply: move.ply,
        player: move.player,
        notation: move.notation,
      }, { onConflict: "game_id,ply" })
      .then(({ error }) => {
        if (error) console.error("game_move_persist_failed", error);
      });
  } catch (err) {
    console.error("game_move_persist_failed", err);
  }
}

function resultFromTerminal(session: GameSession): MatchResult | null {
  const terminal = session.snapshot.terminal;
  if (!terminal) {
    return null;
  }
  if (terminal.winner === null) {
    return "draw";
  }
  return terminal.winner === "X" ? "a_win" : "b_win";
}

function finalizeIfTerminal(session: GameSession) {
  if (session.completedAt !== null) {
    return;
  }

  const result = resultFromTerminal(session);
  if (!result) {
    return;
  }

  session.result = result;
  session.completedAt = Date.now();
  session.updatedAt = session.completedAt;
  activeGameByUser.delete(session.playerXId);
  activeGameByUser.delete(session.playerOId);

  if (session.matchId !== null) {
    const settled = settleMatchResult(session.matchId, result);
    if (!settled.ok && settled.code !== "already_completed") {
      console.error("match_settle_failed", settled.code, session.matchId);
    }
  }

  persistSession(session);
}

export type CreateGameInput = {
  matchId: string | null;
  rated: boolean;
  timeControlId: string;
  boardSize?: number;
  playerXId: string;
  playerOId: string;
};

export function createGameSession(input: CreateGameInput): string {
  const ts = Date.now();
  const session: GameSession = {
    gameId: createId("game"),
    matchId: input.matchId,
    rated: input.rated,
    timeControlId: input.timeControlId,
    playerXId: input.playerXId,
    playerOId: input.playerOId,
    snapshot: initialSnapshot(input.timeControlId, input.boardSize),
    moves: [],
    createdAt: ts,
    updatedAt: ts,
    completedAt: null,
    result: null,
  };

  sessions.set(session.gameId, session);
  activeGameByUser.set(session.playerXId, session.gameId);
  activeGameByUser.set(session.playerOId, session.gameId);
  persistSession(session);
  return session.gameId;
}

export function createGameForMatch(match: MatchRecord): string {
  return createGameSession({
    matchId: match.matchId,
    rated: match.rated,
    timeControlId: match.timeControlId,
    boardSize: match.boardSize,
    playerXId: match.userAId,
    playerOId: match.userBId,
  });
}

registerMatchCreatedHook((match) => createGameForMatch(match));

export function getGameById(gameId: string): GameSession | null {
  return sessions.get(gameId) ?? null;
}

export function getActiveGameForUser(userId: string): GameSession | null {
  const gameId = activeGameByUser.get(userId);
  return gameId ? sessions.get(gameId) ?? null : null;
}

export function playerForUser(
  session: GameSession,
  userId: string,
): Player | null {
  if (session.playerXId === userId) return "X";
  if (session.playerOId === userId) return "O";
  return null;
}

/**
 * Resolves any pending flag fall and settles the match if the game ended.
 * Call before reading state or accepting moves.
 */
export function refreshSession(session: GameSession, now: Date): GameSession {
  if (session.completedAt === null) {
    const resolved = resolveFlagFall(session.snapshot, now);
    if (resolved.terminal && !session.snapshot.terminal) {
      session.snapshot = resolved;
      session.updatedAt = Date.now();
      finalizeIfTerminal(session);
    }
  }
  return session;
}

export function submitMove(
  gameId: string,
  userId: string,
  move: Move,
  now: Date = new Date(),
): SubmitMoveResult {
  const session = sessions.get(gameId);
  if (!session) {
    return { ok: false, code: "not_found", session: null };
  }

  const player = playerForUser(session, userId);
  if (!player) {
    return { ok: false, code: "forbidden", session };
  }

  refreshSession(session, now);
  if (session.completedAt !== null) {
    return { ok: false, code: "game_over", session };
  }

  if (session.snapshot.toMove !== player) {
    return { ok: false, code: "not_your_turn", session };
  }

  const result = applyLocalMove(session.snapshot, move, now);
  if (!result.ok) {
    return { ok: false, code: result.error, session };
  }

  session.snapshot = result.snapshot;
  session.updatedAt = Date.now();

  const record: GameMoveRecord = {
    ply: result.snapshot.ply,
    player,
    notation: result.notation,
  };
  session.moves.push(record);
  persistMove(session, record);

  finalizeIfTerminal(session);
  if (session.completedAt === null) {
    persistSession(session);
  }

  return { ok: true, session, notation: result.notation };
}

export function resignGame(
  gameId: string,
  userId: string,
): { ok: boolean; code?: "not_found" | "forbidden" | "game_over" } {
  const session = sessions.get(gameId);
  if (!session) {
    return { ok: false, code: "not_found" };
  }

  const player = playerForUser(session, userId);
  if (!player) {
    return { ok: false, code: "forbidden" };
  }

  if (session.completedAt !== null) {
    return { ok: false, code: "game_over" };
  }

  session.snapshot = {
    ...session.snapshot,
    terminal: { winner: player === "X" ? "O" : "X", reason: "resign" },
  };
  session.updatedAt = Date.now();
  finalizeIfTerminal(session);
  return { ok: true };
}
