import { Handlers } from "$fresh/server.ts";
import { allFlags } from "../../lib/flags.ts";
import { supabaseAdmin } from "../../lib/supabase.ts";
import type { AppState } from "../_middleware.ts";

export const handler: Handlers<unknown, AppState> = {
  async GET(_req, ctx) {
    let db = false;
    let dbError: string | null = null;

    try {
      const { data, error } = await supabaseAdmin().rpc("healthcheck");
      db = !error && data === true;
      if (error) {
        dbError = error.message;
      }
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
