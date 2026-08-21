import { Handlers } from "$fresh/server.ts";
import { flag } from "../../../lib/flags.ts";
import { getAccessTokenFromRequest } from "../../../lib/auth_cookies.ts";
import { supabaseAsUser } from "../../../lib/supabase.ts";

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
        { error: "Password must be at least 8 characters.", code: "weak_password" },
        { status: 400 },
      );
    }

    const { error } = await supabaseAsUser(accessToken).auth.updateUser({
      password,
    });

    if (error) {
      return Response.json(
        { error: error.message, code: "password_update_failed" },
        { status: 400 },
      );
    }

    return Response.json({ ok: true });
  },
};
