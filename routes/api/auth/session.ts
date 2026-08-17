import { Handlers } from "$fresh/server.ts";
import type { AppState } from "../../_middleware.ts";

export const handler: Handlers<unknown, AppState> = {
  GET(_req, ctx) {
    const response = Response.json({
      user: ctx.state.user,
      accessToken: ctx.state.accessToken,
      expiresAt: null,
      authEnabled: ctx.state.flags.FEATURE_AUTH,
      isAuthenticated: Boolean(ctx.state.user),
      requestId: ctx.state.requestId,
    });

    response.headers.set("Cache-Control", "no-store");
    return response;
  },
};