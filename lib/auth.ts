import { compare, hash } from "bcryptjs";
import { database } from "./db.ts";

export type SessionUser = {
  id: string;
  email: string | null;
  username: string | null;
  isAnonymous: boolean;
};

export async function resolveUserFromAccessToken(
  accessToken: string,
): Promise<SessionUser | null> {
  const [user] = await database()<SessionUser[]>`
    SELECT users.id, users.email, profiles.username,
      users.is_anonymous AS "isAnonymous"
    FROM app_sessions JOIN app_users users ON users.id = app_sessions.user_id
    JOIN profiles ON profiles.id = users.id
    WHERE token_hash = ${await digestToken(accessToken)} AND expires_at > now()
  `;
  return user ?? null;
}

export const SESSION_SECONDS = 60 * 60 * 24 * 7;

export async function digestToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

function randomToken(): string {
  return Array.from(
    crypto.getRandomValues(new Uint8Array(32)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

function validPassword(password: string): boolean {
  return password.length >= 8 &&
    new TextEncoder().encode(password).length <= 72;
}

export async function createSession(userId: string): Promise<string> {
  const token = randomToken();
  await database()`INSERT INTO app_sessions (token_hash, user_id, expires_at)
    VALUES (${await digestToken(token)}, ${userId}, now() + interval '7 days')`;
  return token;
}

export async function createAccount(
  email: string,
  password: string,
  username: string,
): Promise<SessionUser> {
  if (!validPassword(password)) {
    throw new Error(
      "Password must be 8 characters or more and at most 72 bytes.",
    );
  }
  email = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+$/.test(email)) {
    throw new Error("Invalid email address.");
  }
  const user: SessionUser = {
    id: crypto.randomUUID(),
    email,
    username,
    isAnonymous: false,
  };
  const passwordHash = await hash(password, 12);
  await database().begin(async (sql) => {
    await sql`INSERT INTO app_users (id, email, password_hash) VALUES (${user.id}, ${email}, ${passwordHash})`;
    await sql`INSERT INTO profiles (id, username) VALUES (${user.id}, ${username})`;
  });
  return user;
}

export async function createGuest(): Promise<SessionUser> {
  const user: SessionUser = {
    id: crypto.randomUUID(),
    email: null,
    username: null,
    isAnonymous: true,
  };
  await database().begin(async (sql) => {
    await sql`INSERT INTO app_users (id, is_anonymous) VALUES (${user.id}, true)`;
    await sql`INSERT INTO profiles (id, is_guest) VALUES (${user.id}, true)`;
  });
  return user;
}

export async function authenticate(
  identifier: string,
  password: string,
): Promise<SessionUser | null> {
  if (!validPassword(password)) return null;
  const [user] = await database()<(SessionUser & { password_hash: string })[]>`
    SELECT users.id, users.email, profiles.username, users.is_anonymous AS "isAnonymous", users.password_hash
    FROM app_users users JOIN profiles ON profiles.id = users.id
    WHERE (lower(users.email) = ${identifier.trim().toLowerCase()}
      OR lower(profiles.username) = ${identifier.trim().toLowerCase()})
      AND NOT users.is_anonymous
  `;
  if (!user?.password_hash || !await compare(password, user.password_hash)) {
    return null;
  }
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    isAnonymous: user.isAnonymous,
  };
}

export async function revokeSession(token: string): Promise<void> {
  await database()`DELETE FROM app_sessions WHERE token_hash = ${await digestToken(
    token,
  )}`;
}

export async function createEmailToken(
  email: string,
  purpose: "magiclink" | "recovery",
): Promise<string | null> {
  const token = randomToken();
  const rows =
    await database()`INSERT INTO app_email_tokens (token_hash, user_id, purpose, expires_at)
    SELECT ${await digestToken(
      token,
    )}, id, ${purpose}, now() + interval '30 minutes'
    FROM app_users WHERE lower(email) = ${email.trim().toLowerCase()} AND NOT is_anonymous
    RETURNING user_id`;
  return rows.length ? token : null;
}

export async function consumeEmailToken(
  token: string,
  purpose: string,
): Promise<string | null> {
  if (purpose !== "magiclink" && purpose !== "recovery") return null;
  const tokenHash = await digestToken(token);
  return await database().begin(async (sql) => {
    const [user] = await sql`SELECT users.id FROM app_users users
      JOIN app_email_tokens tokens ON tokens.user_id = users.id
      WHERE tokens.token_hash = ${tokenHash} AND tokens.purpose = ${purpose}
        AND tokens.expires_at > now() FOR UPDATE OF users`;
    if (!user) return null;
    const [row] = await sql`DELETE FROM app_email_tokens
      WHERE token_hash = ${tokenHash} AND purpose = ${purpose}
        AND expires_at > now() RETURNING user_id`;
    if (!row) return null;
    const session = randomToken();
    await sql`INSERT INTO app_sessions (token_hash, user_id, expires_at)
      VALUES (${await digestToken(
      session,
    )}, ${user.id}, now() + interval '7 days')`;
    return session;
  });
}

export async function updatePassword(
  token: string,
  password: string,
): Promise<boolean> {
  if (!validPassword(password)) return false;
  const passwordHash = await hash(password, 12);
  return await database().begin(async (sql) => {
    const [user] = await sql`SELECT users.id FROM app_users users
      JOIN app_sessions sessions ON sessions.user_id = users.id
      WHERE sessions.token_hash = ${await digestToken(
      token,
    )} AND sessions.expires_at > now()
        AND NOT users.is_anonymous FOR UPDATE OF users`;
    if (!user) return false;
    await sql`UPDATE app_users SET password_hash = ${passwordHash} WHERE id = ${user.id}`;
    await sql`DELETE FROM app_sessions WHERE user_id = ${user.id}`;
    await sql`DELETE FROM app_email_tokens WHERE user_id = ${user.id}`;
    return true;
  });
}
