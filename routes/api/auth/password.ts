import { Handlers } from "$fresh/server.ts";
import { flag } from "../../../lib/flags.ts";
import {
  clearAuthCookies,
  getAccessTokenFromRequest,
} from "../../../lib/auth_cookies.ts";
import { updatePassword } from "../../../lib/auth.ts";

export const handler: Handlers = {
  async POST(req) {
    if (!flag("FEATURE_AUTH")) {
      return Response.json(
        { error: "feature_disabled", code: "feature_auth_disabled" },
        { status: 503 },
      );
    }

    const accessToken = getAccessTokenFromRequest(req);
    if (!accessToken) {
      return Response.json(
        { error: "not_authenticated", code: "missing_session" },
        { status: 401 },
      );
    }

    const { password } = await req.json();
    if (!password || typeof password !== "string" || password.length < 8) {
      return Response.json(
        {
          error: "Password must be at least 8 characters.",
          code: "weak_password",
        },
        { status: 400 },
      );
    }

    if (!await updatePassword(accessToken, password)) {
      return Response.json(
        {
          error:
            "Invalid session or password (8 characters minimum, 72 bytes maximum).",
          code: "password_update_failed",
        },
        { status: 400 },
      );
    }

    const headers = new Headers();
    clearAuthCookies(headers);
    return Response.json({ ok: true }, { headers });
  },
};
