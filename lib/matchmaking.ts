import { applyRatedOutcome, type RatingUpdateResult } from "./ratings.ts";

export type QueueStatus = "idle" | "queued" | "matched";

export type QueueTicket = {
  ticketId: string;
  userId: string;
  rated: boolean;
  timeControlId: string;
  boardSize: number;
  status: QueueStatus;
  matchId: string | null;
  createdAt: number;
  updatedAt: number;
};

type QueueKey = `${0 | 1}:${string}:${number}`;

export type MatchResult = "a_win" | "b_win" | "draw";

export type MatchRecord = {
  matchId: string;
  userAId: string;
  userBId: string;
  rated: boolean;
  timeControlId: string;
  boardSize: number;
  gameId: string | null;
  createdAt: number;
  completedAt: number | null;
  result: MatchResult | null;
  ratingUpdate: RatingUpdateResult | null;
};

export type SettleMatchResult =
  | { ok: false; code: "not_found" | "already_completed" }
  | { ok: true; match: MatchRecord };

/**
 * Hook invoked synchronously when a match is created, used by lib/games.ts to
 * spin up a server-authoritative game session. Returns the new game id.
 */
export type MatchCreatedHook = (match: MatchRecord) => string | null;

let matchCreatedHook: MatchCreatedHook | null = null;

export function registerMatchCreatedHook(hook: MatchCreatedHook) {
  matchCreatedHook = hook;
}

type QueueState = {
  byUser: Map<string, QueueTicket>;
  waitingByKey: Map<QueueKey, string[]>;
  matches: Map<string, MatchRecord>;
};

const state: QueueState = {
  byUser: new Map(),
  waitingByKey: new Map(),
  matches: new Map(),
};

function queueKey(
  rated: boolean,
  timeControlId: string,
  boardSize: number,
): QueueKey {
  return `${rated ? 1 : 0}:${timeControlId}:${boardSize}`;
}

function now(): number {
  return Date.now();
}

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

function upsertWaiting(key: QueueKey, userIds: string[]) {
  if (userIds.length === 0) {
    state.waitingByKey.delete(key);
    return;
  }
  state.waitingByKey.set(key, userIds);
}

function removeFromAllWaiting(userId: string) {
  for (const [key, users] of state.waitingByKey.entries()) {
    upsertWaiting(key, users.filter((id) => id !== userId));
  }
}

function maybeMatch(key: QueueKey) {
  const waiting = state.waitingByKey.get(key) ?? [];
  if (waiting.length < 2) {
    return;
  }

  const firstUser = waiting[0];
  const secondUser = waiting[1];
  const first = state.byUser.get(firstUser);
  const second = state.byUser.get(secondUser);
  if (
    !first || !second || first.status !== "queued" || second.status !== "queued"
  ) {
    upsertWaiting(key, waiting.slice(2));
    return;
  }

  const matchId = createId("match");
  const ts = now();

  state.matches.set(matchId, {
    matchId,
    userAId: firstUser,
    userBId: secondUser,
    rated: first.rated,
    timeControlId: first.timeControlId,
    boardSize: first.boardSize,
    gameId: null,
    createdAt: ts,
    completedAt: null,
    result: null,
    ratingUpdate: null,
  });

  const match = state.matches.get(matchId)!;
  if (matchCreatedHook) {
    try {
      match.gameId = matchCreatedHook({ ...match });
    } catch (err) {
      console.error("match_created_hook_failed", err);
    }
  }

  first.status = "matched";
  first.matchId = matchId;
  first.updatedAt = ts;
  second.status = "matched";
  second.matchId = matchId;
  second.updatedAt = ts;

  upsertWaiting(key, waiting.slice(2));
}

export function enqueueUser(
  userId: string,
  rated: boolean,
  timeControlId: string,
  boardSize: number = 4,
): QueueTicket {
  const existing = state.byUser.get(userId);
  if (existing) {
    // If the existing ticket already matches the requested queue, return it.
    if (
      existing.status === "queued" &&
      existing.rated === rated &&
      existing.timeControlId === timeControlId &&
      existing.boardSize === boardSize
    ) {
      return { ...existing };
    }

    removeFromAllWaiting(userId);
    state.byUser.delete(userId);
  }

  const ticket: QueueTicket = {
    ticketId: createId("ticket"),
    userId,
    rated,
    timeControlId,
    boardSize,
    status: "queued",
    matchId: null,
    createdAt: now(),
    updatedAt: now(),
  };

  state.byUser.set(userId, ticket);

  const key = queueKey(rated, timeControlId, boardSize);
  const waiting = state.waitingByKey.get(key) ?? [];
  upsertWaiting(key, [...waiting, userId]);
  maybeMatch(key);

  return { ...state.byUser.get(userId)! };
}

export function getUserTicket(userId: string): QueueTicket | null {
  const ticket = state.byUser.get(userId);
  if (!ticket) {
    return null;
  }
  return { ...ticket };
}

export function getMatchById(matchId: string): MatchRecord | null {
  const match = state.matches.get(matchId);
  if (!match) {
    return null;
  }
  return { ...match };
}

/**
 * Server-authoritative settlement of a match. Called by the game session
 * layer (lib/games.ts) once the game reaches a terminal state — never from
 * client-reported outcomes.
 */
export function settleMatchResult(
  matchId: string,
  result: MatchResult,
): SettleMatchResult {
  const match = state.matches.get(matchId);
  if (!match) {
    return { ok: false, code: "not_found" };
  }

  if (match.completedAt !== null) {
    return { ok: false, code: "already_completed" };
  }

  let ratingUpdate: RatingUpdateResult | null = null;
  if (match.rated) {
    const outcomeForA = result === "draw"
      ? "draw"
      : (result === "a_win" ? "win" : "loss");
    ratingUpdate = applyRatedOutcome(match.userAId, match.userBId, outcomeForA);
  }

  match.result = result;
  match.completedAt = now();
  match.ratingUpdate = ratingUpdate;

  const ticketA = state.byUser.get(match.userAId);
  const ticketB = state.byUser.get(match.userBId);
  if (ticketA?.matchId === match.matchId) {
    state.byUser.delete(match.userAId);
  }
  if (ticketB?.matchId === match.matchId) {
    state.byUser.delete(match.userBId);
  }

  return { ok: true, match: { ...match } };
}

export function cancelUserTicket(userId: string): boolean {
  const existing = state.byUser.get(userId);
  if (!existing) {
    return false;
  }

  removeFromAllWaiting(userId);
  state.byUser.delete(userId);
  return true;
}
