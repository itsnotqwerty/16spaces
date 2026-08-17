import { Handlers } from "$fresh/server.ts";
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

    const { email, next } = await req.json();
    if (!email) {
      return Response.json(
        { error: "invalid_request", code: "missing_email" },
        { status: 400 },
      );
    }

    const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:8000";
    const callbackUrl = new URL("/api/auth/callback", siteUrl);
    if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
      callbackUrl.searchParams.set("next", next);
    }

    const { error } = await supabaseAnon().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      return Response.json(
        { error: error.message, code: "magic_failed" },
        { status: 400 },
      );
    }

    return Response.json({ ok: true, sent: true });
  },
};
