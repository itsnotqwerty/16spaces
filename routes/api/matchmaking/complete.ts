import { Handlers } from "$fresh/server.ts";
import { completeMatch } from "../../../lib/matchmaking.ts";
import type { AppState } from "../../_middleware.ts";

type CompleteRequest = {
  matchId?: string;
  result?: "win" | "loss" | "draw";
};

export const handler: Handlers<unknown, AppState> = {
  async POST(req, ctx) {
    const user = ctx.state.user;
    if (!user) {
      return Response.json(
        { error: "unauthorized", code: "auth_required" },
        { status: 401 },
      );
    }

    let body: CompleteRequest = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    if (!body.matchId || !body.result) {
      return Response.json(
        { error: "invalid_request", code: "invalid_complete_payload" },
        { status: 400 },
      );
    }

    const outcome = body.result;
    if (outcome !== "win" && outcome !== "loss" && outcome !== "draw") {
      return Response.json(
        { error: "invalid_request", code: "invalid_match_result" },
        { status: 400 },
      );
    }

    const result = completeMatch({
      matchId: body.matchId,
      actorUserId: user.id,
      outcome,
    });

    if (!result.ok) {
      const status = result.code === "not_found"
        ? 404
        : result.code === "forbidden"
        ? 403
        : 409;

      return Response.json(
        {
          error: result.code,
          code: result.code,
        },
        { status },
      );
    }

    return Response.json({ ok: true, match: result.match });
  },
};
