import { assert, assertEquals, assertRejects } from "$std/assert/mod.ts";
import {
  authenticate,
  consumeEmailToken,
  createAccount,
  createEmailToken,
  createGuest,
  createSession,
  digestToken,
  resolveUserFromAccessToken,
  revokeSession,
  updatePassword,
} from "./auth.ts";
import { closeDatabase, database } from "./db.ts";

Deno.test({
  name:
    "Postgres auth preserves identities and rejects expired or reused tokens",
  ignore: !Deno.env.get("TEST_DATABASE_URL"),
  async fn() {
    const previous = Deno.env.get("DATABASE_URL");
    Deno.env.set("DATABASE_URL", Deno.env.get("TEST_DATABASE_URL")!);
    const email = `${crypto.randomUUID()}@example.com`;
    const username = `test_${
      crypto.randomUUID().replaceAll("-", "").slice(0, 12)
    }`;
    const ids: string[] = [];
    try {
      const user = await createAccount(email, "correct password", username);
      ids.push(user.id);
      assertEquals(await authenticate(email, "wrong password"), null);
      assertEquals(
        (await authenticate(username.toUpperCase(), "correct password"))?.id,
        user.id,
      );
      await assertRejects(() =>
        createAccount(email.toUpperCase(), "other password", `${username}_2`)
      );
      await assertRejects(() =>
        createAccount(
          `other_${email}`,
          "other password",
          username.toUpperCase(),
        )
      );
      const session = await createSession(user.id);
      assertEquals(await resolveUserFromAccessToken(session), user);
      await revokeSession(session);
      assertEquals(await resolveUserFromAccessToken(session), null);
      const guest = await createGuest();
      ids.push(guest.id);
      const guestToken = await createSession(guest.id);
      assertEquals(
        (await resolveUserFromAccessToken(guestToken))?.isAnonymous,
        true,
      );
      assertEquals(await updatePassword(guestToken, "new password"), false);
      const expired = await createSession(user.id);
      await database()`UPDATE app_sessions SET expires_at = now() - interval '1 second'
        WHERE token_hash = ${await digestToken(expired)}`;
      assertEquals(await resolveUserFromAccessToken(expired), null);
      assertEquals(
        await createEmailToken(`unknown_${email}`, "recovery"),
        null,
      );
      const recovery = await createEmailToken(email, "recovery");
      assert(recovery);
      assertEquals(await consumeEmailToken(recovery, "magiclink"), null);
      const results = await Promise.all([
        consumeEmailToken(recovery, "recovery"),
        consumeEmailToken(recovery, "recovery"),
      ]);
      assertEquals(results.filter(Boolean).length, 1);
      const access = results.find(Boolean)!;
      const oldSession = await createSession(user.id);
      assert(await updatePassword(access, "replacement password"));
      assertEquals(await resolveUserFromAccessToken(oldSession), null);
      assertEquals(await updatePassword(access, "another password"), false);
      assertEquals(await authenticate(email, "correct password"), null);
      assertEquals(
        (await authenticate(email, "replacement password"))?.id,
        user.id,
      );
      const expiredLink = await createEmailToken(email, "magiclink");
      assert(expiredLink);
      await database()`UPDATE app_email_tokens SET expires_at = now() - interval '1 second'
        WHERE token_hash = ${await digestToken(expiredLink)}`;
      assertEquals(await consumeEmailToken(expiredLink, "magiclink"), null);
    } finally {
      for (const id of ids) {
        await database()`DELETE FROM app_users WHERE id = ${id}`;
      }
      await closeDatabase();
      if (previous === undefined) Deno.env.delete("DATABASE_URL");
      else Deno.env.set("DATABASE_URL", previous);
    }
  },
});
