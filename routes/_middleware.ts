import { FreshContext } from "$fresh/server.ts";
import { resolveUserFromAccessToken, type SessionUser } from "../lib/auth.ts";
import { getAccessTokenFromRequest } from "../lib/auth_cookies.ts";
import { allFlags } from "../lib/flags.ts";

export type AppState = {
  requestId: string;
  flags: ReturnType<typeof allFlags>;
  user: SessionUser | null;
  accessToken: string | null;
};

export async function handler(req: Request, ctx: FreshContext<AppState>) {
  if (ctx.destination === "static" || ctx.destination === "internal") {
    return await ctx.next();
  }

  const requestId = crypto.randomUUID();
  ctx.state.requestId = requestId;
  ctx.state.flags = allFlags();
  ctx.state.accessToken = getAccessTokenFromRequest(req);
  ctx.state.user = null;

  if (ctx.state.accessToken) {
    try {
      ctx.state.user = await resolveUserFromAccessToken(ctx.state.accessToken);
    } catch {
      ctx.state.user = null;
    }
  }

  const response = await ctx.next();
  response.headers.set("X-Request-Id", requestId);

  return response;
}