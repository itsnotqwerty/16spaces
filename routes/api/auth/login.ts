import { Handlers } from "$fresh/server.ts";
import { setAuthCookies } from "../../../lib/auth_cookies.ts";
import { flag } from "../../../lib/flags.ts";
import { supabaseAdmin, supabaseAnon } from "../../../lib/supabase.ts";

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+$/;

/** Resolves an email-or-username login identifier to an account email. */
async function resolveEmail(identifier: string): Promise<string | null> {
  const trimmed = identifier.trim();
  if (EMAIL_REGEX.test(trimmed)) {
    return trimmed;
  }

  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("id")
    .eq("username", trimmed)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const { data: userData, error: userError } = await supabaseAdmin()
    .auth.admin.getUserById(data.id);

  return userError ? null : userData.user?.email ?? null;
}

export const handler: Handlers = {
  async POST(req) {
    if (!flag("FEATURE_AUTH")) {
      return Response.json(
        { error: "feature_disabled", code: "feature_auth_disabled" },
        { status: 503 },
      );
    }

    const { identifier, password } = await req.json();
    if (!identifier || !password) {
      return Response.json(
        { error: "invalid_request", code: "missing_credentials" },
        { status: 400 },
      );
    }

    const email = await resolveEmail(String(identifier));
    if (!email) {
      // Same response as a bad password so identifiers cannot be probed.
      return Response.json(
        { error: "Invalid login credentials", code: "login_failed" },
        { status: 401 },
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
