import { Handlers } from "$fresh/server.ts";
import { setAuthCookies } from "../../../lib/auth_cookies.ts";
import { consumeEmailToken, SESSION_SECONDS } from "../../../lib/auth.ts";

function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/")) {
    return "/";
  }

  if (next.startsWith("//") || next.includes("\\")) {
    return "/";
  }

  return next;
}

export const handler: Handlers = {
  async GET(req) {
    const url = new URL(req.url);
    const tokenHash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type");
    const next = safeNext(url.searchParams.get("next"));

    const isRecovery = type === "recovery";
    const accessToken = tokenHash && type
      ? await consumeEmailToken(tokenHash, type)
      : null;
    if (!accessToken) {
      return new Response("Missing or invalid auth callback parameters.", {
        status: 400,
      });
    }

    const headers = new Headers({
      Location: isRecovery ? "/reset-password" : next,
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store",
    });

    setAuthCookies(headers, accessToken, "", SESSION_SECONDS);

    return new Response(null, {
      status: 303,
      headers,
    });
  },
};
