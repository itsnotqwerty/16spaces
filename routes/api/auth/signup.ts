import { Handlers } from "$fresh/server.ts";
import { setAuthCookies } from "../../../lib/auth_cookies.ts";
import { flag } from "../../../lib/flags.ts";
import {
  createAccount,
  createSession,
  SESSION_SECONDS,
  type SessionUser,
} from "../../../lib/auth.ts";
import { normalizeUsername, validateUsername } from "../../../lib/username.ts";

export const handler: Handlers = {
  async POST(req) {
    if (!flag("FEATURE_AUTH")) {
      return Response.json(
        { error: "feature_disabled", code: "feature_auth_disabled" },
        { status: 503 },
      );
    }

    const { email, password, username } = await req.json();
    if (
      typeof email !== "string" || typeof password !== "string" ||
      typeof username !== "string" || !email || !username || password.length < 8
    ) {
      return Response.json(
        { error: "invalid_request", code: "invalid_signup_payload" },
        { status: 400 },
      );
    }

    const usernameError = validateUsername(String(username));
    if (usernameError) {
      return Response.json(
        { error: usernameError, code: "invalid_username" },
        { status: 400 },
      );
    }

    const normalizedUsername = normalizeUsername(String(username));

    let user: SessionUser;
    try {
      user = await createAccount(email, password, normalizedUsername);
    } catch {
      return Response.json(
        {
          error:
            "Unable to create account. Check your details or try signing in.",
          code: "signup_failed",
        },
        { status: 400 },
      );
    }

    const headers = new Headers();
    setAuthCookies(headers, await createSession(user.id), "", SESSION_SECONDS);

    return Response.json(
      {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          username: normalizedUsername,
        },
        sessionStarted: true,
      },
      { headers },
    );
  },
};
