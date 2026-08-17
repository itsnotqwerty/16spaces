import { Handlers } from "$fresh/server.ts";
import { setAuthCookies } from "../../../lib/auth_cookies.ts";
import { supabaseAnon } from "../../../lib/supabase.ts";

type EmailCallbackOtpType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email";

const OTP_TYPES: ReadonlySet<EmailCallbackOtpType> = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function isEmailCallbackOtpType(value: string): value is EmailCallbackOtpType {
  return OTP_TYPES.has(value as EmailCallbackOtpType);
}

function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/")) {
    return "/";
  }

  if (next.startsWith("//")) {
    return "/";
  }

  return next;
}

export const handler: Handlers = {
  async GET(req) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const tokenHash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type");
    const next = safeNext(url.searchParams.get("next"));

    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    let expiresIn = 3600;

    if (code) {
      const { data, error } = await supabaseAnon().auth.exchangeCodeForSession(
        code,
      );

      if (error || !data.session) {
        return new Response("Failed to exchange auth code.", { status: 400 });
      }

      accessToken = data.session.access_token;
      refreshToken = data.session.refresh_token;
      expiresIn = data.session.expires_in;
    } else if (tokenHash && type && isEmailCallbackOtpType(type)) {
      const { data, error } = await supabaseAnon().auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });

      if (error || !data.session) {
        return new Response("Failed to verify magic link.", { status: 400 });
      }

      accessToken = data.session.access_token;
      refreshToken = data.session.refresh_token;
      expiresIn = data.session.expires_in;
    }

    if (!accessToken || !refreshToken) {
      return new Response("Missing or invalid auth callback parameters.", {
        status: 400,
      });
    }

    const headers = new Headers({
      Location: next,
    });

    setAuthCookies(headers, accessToken, refreshToken, expiresIn);

    return new Response(null, {
      status: 303,
      headers,
    });
  },
};