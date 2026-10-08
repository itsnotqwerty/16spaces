import { Handlers } from "$fresh/server.ts";
import { allFlags } from "../../lib/flags.ts";
import { database } from "../../lib/db.ts";
import type { AppState } from "../_middleware.ts";

export const handler: Handlers<unknown, AppState> = {
  async GET(_req, ctx) {
    let db = false;
    let dbError: string | null = null;

    try {
      const [row] =
        await database()`SELECT true AS healthy FROM app_users LIMIT 1`;
      db = row?.healthy === true || row === undefined;
    } catch (error) {
      dbError = error instanceof Error ? error.message : "unknown_error";
    }

    return Response.json({
      ok: true,
      flags: ctx.state.flags ?? allFlags(),
      db,
      dbError,
      requestId: ctx.state.requestId ?? null,
    });
  },
};
