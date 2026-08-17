import { Handlers } from "$fresh/server.ts";
import { setAuthCookies } from "../../../lib/auth_cookies.ts";
import { flag } from "../../../lib/flags.ts";
import { supabaseAnon } from "../../../lib/supabase.ts";

export const handler: Handlers = {
  async POST(req) {
    if (!flag("FEATURE_AUTH")) {
      return Response.json(
        { error: "feature_disabled", code: "feature_auth_disabled" },
        { status: 503 },
      );
    }

    const { email, password } = await req.json();
    if (!email || !password) {
      return Response.json(
        { error: "invalid_request", code: "missing_credentials" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAnon().auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return Response.json(
        {
          error: error?.message ?? "auth_failed",
          code: "login_failed",
        },
        { status: 401 },
      );
    }

    const headers = new Headers();
    setAuthCookies(
      headers,
      data.session.access_token,
      data.session.refresh_token,
      data.session.expires_in,
    );

    return Response.json(
      {
        ok: true,
        user: {
          id: data.user.id,
          email: data.user.email ?? null,
        },
      },
      { headers },
    );
  },
};
