import { Handlers } from "$fresh/server.ts";
import { resignGame } from "../../../lib/games.ts";
import type { AppState } from "../../_middleware.ts";

type ResignRequest = {
  gameId?: string;
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

    let body: ResignRequest = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    if (typeof body.gameId !== "string") {
      return Response.json(
        { error: "invalid_request", code: "invalid_resign_payload" },
        { status: 400 },
      );
    }

    const result = resignGame(body.gameId, user.id);
    if (!result.ok) {
      const status = result.code === "not_found"
        ? 404
        : result.code === "forbidden"
        ? 403
        : 409;
      return Response.json({ error: result.code, code: result.code }, {
        status,
      });
    }

    return Response.json({ ok: true });
  },
};
