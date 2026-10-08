import { deleteCookie, getCookies, setCookie } from "$std/http/cookie.ts";

export const ACCESS_COOKIE_NAME = "spaces-session";
export const REFRESH_COOKIE_NAME = "sb-refresh-token";

function isSecureCookie(): boolean {
  const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:8000";
  return siteUrl.startsWith("https://");
}

export function getAccessTokenFromRequest(req: Request): string | null {
  const cookies = getCookies(req.headers);
  return cookies[ACCESS_COOKIE_NAME] ?? null;
}

export function setAuthCookies(
  headers: Headers,
  accessToken: string,
  _refreshToken: string,
  expiresInSeconds: number,
): void {
  const secure = isSecureCookie();

  setCookie(headers, {
    name: ACCESS_COOKIE_NAME,
    value: accessToken,
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    secure,
    maxAge: Math.max(60, expiresInSeconds),
  });

  deleteCookie(headers, "sb-access-token", { path: "/" });
  deleteCookie(headers, REFRESH_COOKIE_NAME, { path: "/" });
}

export function clearAuthCookies(headers: Headers): void {
  deleteCookie(headers, ACCESS_COOKIE_NAME, { path: "/" });
  deleteCookie(headers, REFRESH_COOKIE_NAME, { path: "/" });
}
