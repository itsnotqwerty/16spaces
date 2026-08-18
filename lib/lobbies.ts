import { TIME_CONTROLS } from "./game/index.ts";
import { createGameSession, getGameById } from "./games.ts";
import { isPlaceholderUsername } from "./username.ts";
import { supabaseAdmin } from "./supabase.ts";

export type LobbyPrivacy = "public" | "private";
export type LobbyStatus = "open" | "started" | "cancelled" | "expired";
export type ColorAssignment = "random" | "host_x" | "host_o";

export type LobbyMember = {
  userId: string;
  username: string | null;
  isHost: boolean;
  ready: boolean;
  joinedAt: number;
  lastSeenAt: number;
};

export type LobbyOptions = {
  rated: boolean;
  timeControlId: string;
  colorAssignment: ColorAssignment;
  boardSize: number;
};

export type Lobby = {
  lobbyId: string;
  code: string;
  hostUserId: string;
  privacy: LobbyPrivacy;
  status: LobbyStatus;
  options: LobbyOptions;
  members: LobbyMember[];
  gameId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type LobbyUserContext = {
  id: string;
  username: string | null;
  isAnonymous: boolean;
};

export type CreateLobbyInput = {
  boardSize?: number;
  privacy?: LobbyPrivacy;
  rated?: boolean;
  timeControlId?: string;
  colorAssignment?: ColorAssignment;
};

export type LobbyErrorCode =
  | "not_found"
  | "forbidden"
  | "lobby_full"
  | "lobby_not_open"
  | "not_host"
  | "not_member"
  | "members_not_ready"
  | "rated_requires_registered_user"
  | "rated_requires_username"
  | "game_still_active";

type LobbyResult<T> = { ok: true; value: T } | {
  ok: false;
  code: LobbyErrorCode;
};

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const OPEN_IDLE_EXPIRY_MS = 15 * 60_000;
const CAPACITY = 2;

const lobbies = new Map<string, Lobby>();
const lobbyByCode = new Map<string, string>();
/** In-memory lobby engagement (active games are tracked by lib/games.ts). */
const lobbyIdByUser = new Map<string, string>();

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

function generateCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join(
    "",
  );
}

function now(): number {
  return Date.now();
}

function persistLobby(lobby: Lobby) {
  try {
    supabaseAdmin()
      .from("lobbies")
      .upsert({
        id: lobby.lobbyId,
        code: lobby.code,
        host_user_id: lobby.hostUserId,
        privacy: lobby.privacy,
        status: lobby.status,
        rated: lobby.options.rated,
        time_control_id: lobby.options.timeControlId,
        color_assignment: lobby.options.colorAssignment,
        game_id: lobby.gameId,
        updated_at: new Date(lobby.updatedAt).toISOString(),
      }, { onConflict: "id" })
      .then(({ error }) => {
        if (error) console.error("lobby_persist_failed", error);
      });
  } catch (err) {
    console.error("lobby_persist_failed", err);
  }

  try {
    supabaseAdmin()
      .from("lobby_members")
      .upsert(
        lobby.members.map((m) => ({
          lobby_id: lobby.lobbyId,
          user_id: m.userId,
          is_host: m.isHost,
          ready: m.ready,
          last_seen_at: new Date(m.lastSeenAt).toISOString(),
        })),
        { onConflict: "lobby_id,user_id" },
      )
      .then(({ error }) => {
        if (error) console.error("lobby_members_persist_failed", error);
      });
  } catch (err) {
    console.error("lobby_members_persist_failed", err);
  }
}

function touch(lobby: Lobby) {
  lobby.updatedAt = now();
  persistLobby(lobby);
}

function closeLobby(lobby: Lobby, status: "cancelled" | "expired") {
  lobby.status = status;
  for (const member of lobby.members) {
    lobbyIdByUser.delete(member.userId);
  }
  lobby.members = [];
  touch(lobby);
}

/** Expire-on-read: idle open lobbies and started lobbies with no active game. */
function expireIfStale(lobby: Lobby, at: number) {
  if (lobby.status === "open") {
    const lastSeen = Math.max(0, ...lobby.members.map((m) => m.lastSeenAt));
    const idleMs = at - Math.max(lastSeen, lobby.updatedAt);
    if (lobby.members.length === 0 || idleMs > OPEN_IDLE_EXPIRY_MS) {
      closeLobby(lobby, "expired");
    }
    return;
  }

  if (lobby.status === "started") {
    const game = lobby.gameId ? getGameById(lobby.gameId) : null;
    const gameActive = game !== null && game.completedAt === null;
    if (!gameActive) {
      const idleMs = at - Math.max(
        ...lobby.members.map((m) => m.lastSeenAt),
        lobby.updatedAt,
      );
      if (lobby.members.length === 0 || idleMs > OPEN_IDLE_EXPIRY_MS) {
        closeLobby(lobby, "expired");
      }
    }
  }
}

function ratedEligible(user: LobbyUserContext): LobbyErrorCode | null {
  if (user.isAnonymous) return "rated_requires_registered_user";
  if (isPlaceholderUsername(user.username)) return "rated_requires_username";
  return null;
}

export function createLobby(
  user: LobbyUserContext,
  input: CreateLobbyInput,
): LobbyResult<Lobby> {
  const rated = input.rated === true;
  if (rated) {
    const code = ratedEligible(user);
    if (code) return { ok: false, code };
  }

  const timeControlId =
    input.timeControlId && TIME_CONTROLS[input.timeControlId]
      ? input.timeControlId
      : "classic";

  let code = generateCode();
  while (lobbyByCode.has(code)) {
    code = generateCode();
  }

  const ts = now();
  const lobby: Lobby = {
    lobbyId: createId("lobby"),
    code,
    hostUserId: user.id,
    privacy: input.privacy === "public" ? "public" : "private",
    status: "open",
    options: {
      boardSize: input.boardSize || 4,
      rated,
      timeControlId,
      colorAssignment: input.colorAssignment ?? "random",
    },
    members: [{
      userId: user.id,
      username: user.username,
      isHost: true,
      ready: false,
      joinedAt: ts,
      lastSeenAt: ts,
    }],
    gameId: null,
    createdAt: ts,
    updatedAt: ts,
  };

  lobbies.set(lobby.lobbyId, lobby);
  lobbyByCode.set(code, lobby.lobbyId);
  lobbyIdByUser.set(user.id, lobby.lobbyId);
  persistLobby(lobby);
  return { ok: true, value: lobby };
}

export function getLobbyByCode(code: string): Lobby | null {
  const lobbyId = lobbyByCode.get(code.toUpperCase());
  const lobby = lobbyId ? lobbies.get(lobbyId) ?? null : null;
  if (lobby) expireIfStale(lobby, now());
  return lobby;
}

export function joinLobby(
  user: LobbyUserContext,
  code: string,
): LobbyResult<Lobby> {
  const lobby = getLobbyByCode(code);
  if (!lobby || lobby.status === "cancelled" || lobby.status === "expired") {
    return { ok: false, code: "not_found" };
  }

  const existing = lobby.members.find((m) => m.userId === user.id);
  if (existing) {
    existing.lastSeenAt = now();
    return { ok: true, value: lobby };
  }

  if (lobby.status !== "open") {
    return { ok: false, code: "lobby_not_open" };
  }
  if (lobby.members.length >= CAPACITY) {
    return { ok: false, code: "lobby_full" };
  }
  if (lobby.options.rated) {
    const err = ratedEligible(user);
    if (err) return { ok: false, code: err };
  }

  lobby.members.push({
    userId: user.id,
    username: user.username,
    isHost: false,
    ready: false,
    joinedAt: now(),
    lastSeenAt: now(),
  });
  lobbyIdByUser.set(user.id, lobby.lobbyId);
  touch(lobby);
  return { ok: true, value: lobby };
}

export function leaveLobby(userId: string, code: string): LobbyResult<Lobby> {
  const lobby = getLobbyByCode(code);
  if (!lobby) return { ok: false, code: "not_found" };

  const member = lobby.members.find((m) => m.userId === userId);
  if (!member) return { ok: false, code: "not_member" };

  lobby.members = lobby.members.filter((m) => m.userId !== userId);
  lobbyIdByUser.delete(userId);

  if (lobby.members.length === 0) {
    closeLobby(lobby, "expired");
    return { ok: true, value: lobby };
  }

  if (member.isHost) {
    lobby.members[0].isHost = true;
    lobby.hostUserId = lobby.members[0].userId;
  }

  touch(lobby);
  return { ok: true, value: lobby };
}

export function setReady(
  userId: string,
  code: string,
  ready: boolean,
): LobbyResult<Lobby> {
  const lobby = getLobbyByCode(code);
  if (!lobby) return { ok: false, code: "not_found" };
  if (lobby.status !== "open") return { ok: false, code: "lobby_not_open" };

  const member = lobby.members.find((m) => m.userId === userId);
  if (!member) return { ok: false, code: "not_member" };

  member.ready = ready;
  touch(lobby);
  return { ok: true, value: lobby };
}

export function startLobby(
  user: LobbyUserContext,
  code: string,
): LobbyResult<Lobby> {
  const lobby = getLobbyByCode(code);
  if (!lobby || lobby.status === "cancelled" || lobby.status === "expired") {
    return { ok: false, code: "not_found" };
  }
  if (lobby.hostUserId !== user.id) {
    return { ok: false, code: "not_host" };
  }

  // Play-again: allowed when the current game is finished and both still in.
  const currentGame = lobby.gameId ? getGameById(lobby.gameId) : null;
  if (currentGame && currentGame.completedAt === null) {
    return { ok: false, code: "game_still_active" };
  }
  if (lobby.status === "open") {
    if (lobby.members.length < CAPACITY) {
      return { ok: false, code: "members_not_ready" };
    }
    if (!lobby.members.every((m) => m.ready || m.isHost)) {
      return { ok: false, code: "members_not_ready" };
    }
  }

  if (lobby.options.rated) {
    for (const member of lobby.members) {
      if (member.isHost) {
        const err = ratedEligible(user);
        if (err) return { ok: false, code: err };
      } else if (isPlaceholderUsername(member.username)) {
        return { ok: false, code: "rated_requires_username" };
      }
    }
  }

  const host = lobby.members.find((m) => m.isHost)!;
  const guest = lobby.members.find((m) => !m.isHost)!;
  const hostIsX = lobby.options.colorAssignment === "host_x" ||
    (lobby.options.colorAssignment === "random" &&
      crypto.getRandomValues(new Uint8Array(1))[0] % 2 === 0);

  const gameId = createGameSession({
    matchId: null,
    rated: lobby.options.rated,
    timeControlId: lobby.options.timeControlId,
    boardSize: lobby.options.boardSize,
    playerXId: hostIsX ? host.userId : guest.userId,
    playerOId: hostIsX ? guest.userId : host.userId,
  });

  lobby.status = "started";
  lobby.gameId = gameId;
  for (const member of lobby.members) {
    member.ready = false;
  }
  touch(lobby);
  return { ok: true, value: lobby };
}

export function cancelLobby(userId: string, code: string): LobbyResult<Lobby> {
  const lobby = getLobbyByCode(code);
  if (!lobby || lobby.status === "cancelled" || lobby.status === "expired") {
    return { ok: false, code: "not_found" };
  }
  if (lobby.hostUserId !== userId) {
    return { ok: false, code: "not_host" };
  }

  closeLobby(lobby, "cancelled");
  return { ok: true, value: lobby };
}

export function heartbeatLobby(
  userId: string,
  code: string,
): LobbyResult<Lobby> {
  const lobby = getLobbyByCode(code);
  if (!lobby) return { ok: false, code: "not_found" };

  const member = lobby.members.find((m) => m.userId === userId);
  if (!member) return { ok: false, code: "not_member" };

  member.lastSeenAt = now();
  return { ok: true, value: lobby };
}

export function listPublicLobbies(): Lobby[] {
  const at = now();
  const result: Lobby[] = [];
  for (const lobby of lobbies.values()) {
    expireIfStale(lobby, at);
    if (lobby.privacy === "public" && lobby.status === "open") {
      result.push(lobby);
    }
  }
  return result;
}
