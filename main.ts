/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

try {
  await import("$std/dotenv/load.ts");
} catch {
  // Ignore unreadable or missing .env files in production; systemd provides env vars.
}

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";

if (
  Deno.env.get("DENO_ENV") === "production" && !Deno.env.get("DATABASE_URL")
) {
  throw new Error("DATABASE_URL is required in production");
}

await start(manifest, config);
