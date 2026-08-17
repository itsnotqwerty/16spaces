import { Handlers } from "$fresh/server.ts";
import { cancelLobby, getLobbyByCode } from "../../../../lib/lobbies.ts";
import type { AppState } from "../../../_middleware.ts";
import { lobbyError, lobbyJson } from "../_shared.ts";

export const handler: Handlers<unknown, AppState> = {
  GET(_req, ctx) {
    const lobby = getLobbyByCode(ctx.params.code);
    if (!lobby || lobby.status === "cancelled" || lobby.status === "expired") {
      return lobbyError("not_found");
    }

    const user = ctx.state.user;
    const isMember = user !== null &&
      lobby.members.some((m) => m.userId === user.id);

    if (isMember) {
      return Response.json({ ok: true, lobby: lobbyJson(lobby) });
    }

    // Non-member peek: no member list, no board data.
    return Response.json({
      ok: true,
      lobby: {
        code: lobby.code,
        privacy: lobby.privacy,
        status: lobby.status,
        options: lobby.options,
        memberCount: lobby.members.length,
        full: lobby.members.length >= 2,
        gameId: lobby.gameId,
      },
    });
  },

  DELETE(_req, ctx) {
    const user = ctx.state.user;
    if (!user) {
      return Response.json(
        { error: "unauthorized", code: "auth_required" },
        { status: 401 },
      );
    }

    const result = cancelLobby(user.id, ctx.params.code);
    if (!result.ok) {
      return lobbyError(result.code);
    }
    return Response.json({ ok: true, lobby: lobbyJson(result.value) });
  },
};
