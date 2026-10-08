import { Handlers } from "$fresh/server.ts";
import {
  clearAuthCookies,
  getAccessTokenFromRequest,
} from "../../../lib/auth_cookies.ts";
import { revokeSession } from "../../../lib/auth.ts";

export const handler: Handlers = {
  async POST(req) {
    const token = getAccessTokenFromRequest(req);
    if (token) await revokeSession(token);
    const headers = new Headers();
    clearAuthCookies(headers);

    return Response.json({ ok: true }, { headers });
  },
};
