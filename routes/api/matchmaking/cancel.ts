import { Handlers } from "$fresh/server.ts";
import { cancelUserTicket } from "../../../lib/matchmaking.ts";
import type { AppState } from "../../_middleware.ts";

export const handler: Handlers<unknown, AppState> = {
  POST(_req, ctx) {
    const user = ctx.state.user;
    if (!user) {
      return Response.json(
        { error: "unauthorized", code: "auth_required" },
        { status: 401 },
      );
    }

    const cancelled = cancelUserTicket(user.id);
    return Response.json({
      ok: true,
      cancelled,
      status: "idle",
    });
  },
};
