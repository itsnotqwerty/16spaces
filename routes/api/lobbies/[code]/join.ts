import { Handlers } from "$fresh/server.ts";
import { joinLobby } from "../../../../lib/lobbies.ts";
import { flag } from "../../../../lib/flags.ts";
import type { AppState } from "../../../_middleware.ts";
import { lobbyError, lobbyJson } from "../_shared.ts";

export const handler: Handlers<unknown, AppState> = {
  POST(_req, ctx) {
    if (!flag("FEATURE_ONLINE")) {
      return Response.json(
        { error: "feature_disabled", code: "feature_online_disabled" },
        { status: 503 },
      );
    }

    const user = ctx.state.user;
    if (!user) {
      return Response.json(
        { error: "unauthorized", code: "auth_required" },
        { status: 401 },
      );
    }

    const result = joinLobby(user, ctx.params.code);
    if (!result.ok) {
      return lobbyError(result.code);
    }
    return Response.json({ ok: true, lobby: lobbyJson(result.value) });
  },
};
