import { Handlers } from "$fresh/server.ts";
import { clearAuthCookies } from "../../../lib/auth_cookies.ts";

export const handler: Handlers = {
  POST() {
    const headers = new Headers();
    clearAuthCookies(headers);

    return Response.json({ ok: true }, { headers });
  },
};
