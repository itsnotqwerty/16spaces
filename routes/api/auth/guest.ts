import { Handlers } from "$fresh/server.ts";
import { setAuthCookies } from "../../../lib/auth_cookies.ts";
import {
  createGuest,
  createSession,
  SESSION_SECONDS,
} from "../../../lib/auth.ts";

export const handler: Handlers = {
  async POST() {
    const user = await createGuest();

    const headers = new Headers();
    setAuthCookies(
      headers,
      await createSession(user.id),
      "",
      SESSION_SECONDS,
    );

    return Response.json(
      {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
        },
      },
      { headers },
    );
  },
};
