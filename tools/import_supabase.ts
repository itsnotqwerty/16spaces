import postgres from "postgres";

const sourceUrl = Deno.env.get("SOURCE_DATABASE_URL");
const destinationUrl = Deno.env.get("DATABASE_URL");
if (!sourceUrl || !destinationUrl || sourceUrl === destinationUrl) {
  throw new Error("Set distinct SOURCE_DATABASE_URL and DATABASE_URL values.");
}
const source = postgres(sourceUrl, { max: 1 });
const destination = postgres(destinationUrl, { max: 1 });
try {
  await source.begin(async (read) => {
    await read`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`;
    await destination.begin(async (write) => {
      await write`LOCK TABLE app_users, profiles, games, game_moves, lobbies, lobby_members IN EXCLUSIVE MODE`;
      const [existing] = await write`SELECT id FROM app_users LIMIT 1`;
      if (existing) {
        throw new Error("Destination must be empty; no data was imported.");
      }
      for await (
        const users
          of read`SELECT id, email, encrypted_password, is_anonymous, created_at FROM auth.users`
            .cursor(100)
      ) {
        for (const user of users) {
          if (
            user.encrypted_password &&
            !/^\$2[aby]\$/.test(user.encrypted_password)
          ) {
            throw new Error(
              "Unsupported password hash. Resolve credential migration before cutover.",
            );
          }
          await write`INSERT INTO app_users (id, email, password_hash, is_anonymous, created_at)
            VALUES (${user.id}, ${user.email || null}, ${
            user.encrypted_password || null
          }, ${user.is_anonymous ?? false}, ${user.created_at})`;
        }
      }
      for (
        const table of [
          "profiles",
          "games",
          "game_moves",
          "lobbies",
          "lobby_members",
        ]
      ) {
        for await (
          const rows of read`SELECT * FROM ${read(table)}`.cursor(100)
        ) {
          for (const row of rows) {
            if (table === "game_moves") delete row.id;
            if (table === "games") row.snapshot = write.json(row.snapshot);
            await write`INSERT INTO ${write(table)} ${write(row)}`;
          }
        }
      }
      await write`INSERT INTO profiles (id, is_guest)
        SELECT id, is_anonymous FROM app_users WHERE id NOT IN (SELECT id FROM profiles)`;
    });
  });
  console.log(
    "Imported accounts, profiles, games, moves, and lobbies. Users must sign in again.",
  );
} finally {
  await source.end();
  await destination.end();
}
