import { Handlers } from "$fresh/server.ts";
import { setReady } from "../../../../lib/lobbies.ts";
import type { AppState } from "../../../_middleware.ts";
import { lobbyError, lobbyJson } from "../_shared.ts";

export const handler: Handlers<unknown, AppState> = {
  async POST(req, ctx) {
    const user = ctx.state.user;
    if (!user) {
      return Response.json(
        { error: "unauthorized", code: "auth_required" },
        { status: 401 },
      );
    }

    let body: { ready?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const result = setReady(user.id, ctx.params.code, body.ready === true);
    if (!result.ok) {
      return lobbyError(result.code);
    }
    return Response.json({ ok: true, lobby: lobbyJson(result.value) });
  },
};
