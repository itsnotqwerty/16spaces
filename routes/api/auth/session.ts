import { Handlers } from "$fresh/server.ts";
import { isPlaceholderUsername } from "../../../lib/username.ts";
import type { AppState } from "../../_middleware.ts";

export const handler: Handlers<unknown, AppState> = {
  GET(_req, ctx) {
    const user = ctx.state.user;
    const ratedEligible = Boolean(
      user && !user.isAnonymous && !isPlaceholderUsername(user.username),
    );

    const response = Response.json({
      user,
      accessToken: ctx.state.accessToken,
      expiresAt: null,
      authEnabled: ctx.state.flags.FEATURE_AUTH,
      isAuthenticated: Boolean(user),
      ratedEligible,
      requestId: ctx.state.requestId,
    });

    response.headers.set("Cache-Control", "no-store");
    return response;
  },
};