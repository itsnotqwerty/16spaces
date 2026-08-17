import { Handlers } from "$fresh/server.ts";
import { heartbeatLobby } from "../../../../lib/lobbies.ts";
import type { AppState } from "../../../_middleware.ts";
import { lobbyError } from "../_shared.ts";

export const handler: Handlers<unknown, AppState> = {
  POST(_req, ctx) {
    const user = ctx.state.user;
    if (!user) {
      return Response.json(
        { error: "unauthorized", code: "auth_required" },
        { status: 401 },
      );
    }

    const result = heartbeatLobby(user.id, ctx.params.code);
    if (!result.ok) {
      return lobbyError(result.code);
    }
    return Response.json({ ok: true });
  },
};
