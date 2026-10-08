import { Handlers } from "$fresh/server.ts";
import { setAuthCookies } from "../../../lib/auth_cookies.ts";
import { flag } from "../../../lib/flags.ts";
import {
  authenticate,
  createSession,
  SESSION_SECONDS,
} from "../../../lib/auth.ts";

export const handler: Handlers = {
  async POST(req) {
    if (!flag("FEATURE_AUTH")) {
      return Response.json(
        { error: "feature_disabled", code: "feature_auth_disabled" },
        { status: 503 },
      );
    }

    const { identifier, password } = await req.json();
    if (
      typeof identifier !== "string" || typeof password !== "string" ||
      !identifier || !password
    ) {
      return Response.json(
        { error: "invalid_request", code: "missing_credentials" },
        { status: 400 },
      );
    }

    const user = await authenticate(identifier, password);
    if (!user) {
      // Same response as a bad password so identifiers cannot be probed.
      return Response.json(
        { error: "Invalid login credentials", code: "login_failed" },
        { status: 401 },
      );
    }

    const headers = new Headers();
    const token = await createSession(user.id);
    setAuthCookies(
      headers,
      token,
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
