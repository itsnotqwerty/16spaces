import { createEmailToken } from "./auth.ts";

function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function mailOriginUrl(): string {
  return Deno.env.get("MAIL_ORIGIN_URL") ?? "http://localhost:8000";
}

export function buildCallbackUrl(next?: string): string {
  const callbackUrl = new URL("/api/auth/callback", mailOriginUrl());
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    callbackUrl.searchParams.set("next", next);
  }
  return callbackUrl.toString();
}

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getEnv("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getEnv("MAIL_FROM"),
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend error ${response.status}: ${body}`);
  }
}

async function generateActionLink(
  type: "magiclink" | "recovery",
  email: string,
  redirectTo: string,
): Promise<string | null> {
  const hashedToken = await createEmailToken(email, type);
  if (!hashedToken) return null;
  const link = new URL(redirectTo);
  link.searchParams.set("token_hash", hashedToken);
  link.searchParams.set("type", type);
  return link.toString();
}

export async function sendMagicLinkEmail(email: string, redirectTo: string) {
  const link = await generateActionLink("magiclink", email, redirectTo);
  if (!link) return;
  await sendEmail(
    email,
    "Your 16spaces magic link",
    `<p>Click to sign in: <a href="${link}">${link}</a></p>`,
  );
}

export async function sendPasswordResetEmail(
  email: string,
  redirectTo: string,
) {
  const link = await generateActionLink("recovery", email, redirectTo);
  if (!link) return;
  await sendEmail(
    email,
    "Reset your 16spaces password",
    `<p>A password reset has been requested for your account. To reset your password, please click <a href="${link}">this link</a>.</p>`,
  );
}
