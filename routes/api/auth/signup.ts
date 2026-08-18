import { Handlers } from "$fresh/server.ts";
import { setAuthCookies } from "../../../lib/auth_cookies.ts";
import { flag } from "../../../lib/flags.ts";
import { supabaseAdmin, supabaseAnon } from "../../../lib/supabase.ts";
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
    if (!email || !password || !username || String(password).length < 8) {
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

    const { data, error } = await supabaseAnon().auth.signUp({
      email,
      password,
      options: {
        data: {
          username: normalizedUsername,
        },
      },
    });

    if (error || !data.user) {
      return Response.json(
        {
          error: error?.message ?? "signup_failed",
          code: "signup_failed",
        },
        { status: 400 },
      );
    }

    // Record the username on the profiles table so login-by-username can
    // resolve it. (The on_auth_user_created trigger is a later migration.)
    const { error: profileError } = await supabaseAdmin()
      .from("profiles")
      .upsert(
        { id: data.user.id, username: normalizedUsername },
        { onConflict: "id" },
      );

    if (profileError) {
      return Response.json(
        { error: "That username is taken.", code: "username_taken" },
        { status: 409 },
      );
    }

    const headers = new Headers();
    if (data.session) {
      setAuthCookies(
        headers,
        data.session.access_token,
        data.session.refresh_token,
        data.session.expires_in,
      );
    }

    return Response.json(
      {
        ok: true,
        user: {
          id: data.user.id,
          email: data.user.email ?? null,
          username: normalizedUsername,
        },
        sessionStarted: Boolean(data.session),
      },
      { headers },
    );
  },
};
