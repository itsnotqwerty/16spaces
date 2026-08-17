import type { Lobby, LobbyErrorCode } from "../../../lib/lobbies.ts";

export function lobbyJson(lobby: Lobby) {
  return {
    code: lobby.code,
    hostUserId: lobby.hostUserId,
    privacy: lobby.privacy,
    status: lobby.status,
    options: lobby.options,
    gameId: lobby.gameId,
    members: lobby.members.map((m) => ({
      userId: m.userId,
      username: m.username,
      isHost: m.isHost,
      ready: m.ready,
    })),
  };
}

export function lobbyError(code: LobbyErrorCode): Response {
  const status = code === "not_found"
    ? 404
    : code === "forbidden" || code === "not_host" ||
        code === "rated_requires_registered_user" ||
        code === "rated_requires_username"
    ? 403
    : 409;
  return Response.json({ error: code, code }, { status });
}
