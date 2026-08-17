import { Handlers } from "$fresh/server.ts";
import { submitMove } from "../../../lib/games.ts";
import type { Move } from "../../../lib/game/index.ts";
import type { AppState } from "../../_middleware.ts";

type MoveRequest = {
  gameId?: string;
  move?: Move;
};

function isValidMove(move: Move | undefined): move is Move {
  if (!move || typeof move !== "object") {
    return false;
  }
  const coord = (c: unknown) =>
    !!c && typeof c === "object" &&
    typeof (c as { x?: unknown }).x === "number" &&
    typeof (c as { y?: unknown }).y === "number";
  if (move.kind === "place") {
    return coord(move.to);
  }
  if (move.kind === "slide") {
    return coord(move.from) && coord(move.to);
  }
  return false;
}

export const handler: Handlers<unknown, AppState> = {
  async POST(req, ctx) {
    const user = ctx.state.user;
    if (!user) {
      return Response.json(
        { error: "unauthorized", code: "auth_required" },
        { status: 401 },
      );
    }

    let body: MoveRequest = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    if (typeof body.gameId !== "string" || !isValidMove(body.move)) {
      return Response.json(
        { error: "invalid_request", code: "invalid_move_payload" },
        { status: 400 },
      );
    }

    const result = submitMove(body.gameId, user.id, body.move);
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
          snapshot: result.session?.snapshot ?? null,
        },
        { status },
      );
    }

    return Response.json({
      ok: true,
      notation: result.notation,
      snapshot: result.session.snapshot,
      result: result.session.result,
    });
  },
};
