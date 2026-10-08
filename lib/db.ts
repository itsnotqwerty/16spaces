import postgres from "postgres";

let connection: ReturnType<typeof postgres> | undefined;
let writes: Promise<unknown> = Promise.resolve();

export function persist(write: () => Promise<unknown>): void {
  if (!Deno.env.get("DATABASE_URL")) return;
  writes = writes.then(write).catch((error) =>
    console.error("database_write_failed", error)
  );
}

export function database() {
  if (!connection) {
    const url = Deno.env.get("DATABASE_URL");
    if (!url) throw new Error("DATABASE_URL is required");
    connection = postgres(url, { max: 5 });
  }
  return connection;
}

export async function closeDatabase() {
  await writes;
  await connection?.end();
  connection = undefined;
}
