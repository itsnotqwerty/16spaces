import { supabaseAdmin } from "./supabase.ts";

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
): Promise<string> {
  const { data, error } = await supabaseAdmin().auth.admin.generateLink({
    type,
    email,
    options: { redirectTo },
  });

  const hashedToken = data.properties?.hashed_token;
  if (error || !hashedToken) {
    throw new Error(error?.message ?? "Failed to generate link.");
  }

  // Point straight at our callback with server-side query params. This skips
  // Supabase's /auth/v1/verify redirect, which can fall back to the deprecated
  // implicit `/#access_token=` fragment depending on the project flow type.
  const link = new URL(redirectTo);
  link.searchParams.set("token_hash", hashedToken);
  link.searchParams.set("type", type);
  return link.toString();
}

export async function sendMagicLinkEmail(email: string, redirectTo: string) {
  const link = await generateActionLink("magiclink", email, redirectTo);
  await sendEmail(
    email,
    "Your 16spaces magic link",
    `<p>Click to sign in: <a href="${link}">${link}</a></p>`,
  );
}

export async function sendPasswordResetEmail(email: string, redirectTo: string) {
  const link = await generateActionLink("recovery", email, redirectTo);
  await sendEmail(
    email,
    "Reset your 16spaces password",
    `<p>A password reset has been requested for your account. To reset your password, please click <a href="${link}">this link</a>.</p>`,
  );
}
