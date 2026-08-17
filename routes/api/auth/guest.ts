import { Handlers } from "$fresh/server.ts";
import { setAuthCookies } from "../../../lib/auth_cookies.ts";
import { flag } from "../../../lib/flags.ts";
import { supabaseAnon } from "../../../lib/supabase.ts";

export const handler: Handlers = {
  async POST() {
    if (!flag("FEATURE_AUTH")) {
      return Response.json(
        { error: "feature_disabled", code: "feature_auth_disabled" },
        { status: 503 },
      );
    }

    const { data, error } = await supabaseAnon().auth.signInAnonymously();

    if (error || !data.session || !data.user) {
      return Response.json(
        {
          error: error?.message ?? "guest_failed",
          code: "guest_failed",
        },
        { status: 400 },
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
