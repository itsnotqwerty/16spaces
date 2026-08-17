#!/usr/bin/env -S deno run -A --watch=static/,routes/

import dev from "$fresh/dev.ts";
import config from "./fresh.config.ts";

try {
	await import("$std/dotenv/load.ts");
} catch {
	// Ignore unreadable or missing .env files; task start/build/preview can inject env separately.
}

await dev(import.meta.url, "./main.ts", config);
