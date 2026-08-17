import { Handlers } from "$fresh/server.ts";
import {
  MAX_BOARD_SIZE,
  MIN_BOARD_SIZE,
  parseCustomTimeControl,
  TIME_CONTROLS,
} from "../../../lib/game/index.ts";
import { enqueueUser } from "../../../lib/matchmaking.ts";
import { flag } from "../../../lib/flags.ts";
import { isPlaceholderUsername } from "../../../lib/username.ts";
import type { AppState } from "../../_middleware.ts";

type EnqueueRequest = {
  rated?: boolean;
  timeControlId?: string;
  boardSize?: number;
};

function isValidTimeControlId(id: string): boolean {
  if (TIME_CONTROLS[id]) {
    return true;
  }
  if (id.startsWith("custom:")) {
    return parseCustomTimeControl(id.slice("custom:".length)) !== null;
  }
  return false;
}

export const handler: Handlers<unknown, AppState> = {
  async POST(req, ctx) {
    if (!flag("FEATURE_MATCHMAKING")) {
      return Response.json(
        { error: "feature_disabled", code: "feature_matchmaking_disabled" },
        { status: 503 },
      );
    }

    const user = ctx.state.user;
    if (!user) {
      return Response.json(
        { error: "unauthorized", code: "auth_required" },
        { status: 401 },
      );
    }

    let body: EnqueueRequest = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const rated = body.rated === true;
    if (rated && !flag("FEATURE_RATED")) {
      return Response.json(
        { error: "feature_disabled", code: "feature_rated_disabled" },
        { status: 503 },
      );
    }

    if (rated && user.isAnonymous) {
      return Response.json(
        {
          error: "Rated matchmaking requires a non-guest account.",
          code: "rated_requires_registered_user",
        },
        { status: 403 },
      );
    }

    if (rated && isPlaceholderUsername(user.username)) {
      return Response.json(
        {
          error: "Set a username before joining rated matchmaking.",
          code: "rated_requires_username",
        },
        { status: 403 },
      );
    }

    const timeControlId = typeof body.timeControlId === "string" &&
        body.timeControlId.trim().length > 0
      ? body.timeControlId.trim()
      : "classic";

    if (!isValidTimeControlId(timeControlId)) {
      return Response.json(
        { error: "invalid_request", code: "invalid_time_control" },
        { status: 400 },
      );
    }

    const boardSize = typeof body.boardSize === "number"
      ? Math.floor(body.boardSize)
      : 4;
    if (
      boardSize < MIN_BOARD_SIZE || boardSize > MAX_BOARD_SIZE
    ) {
      return Response.json(
        { error: "invalid_request", code: "invalid_board_size" },
        { status: 400 },
      );
    }

    const ticket = enqueueUser(user.id, rated, timeControlId, boardSize);
    return Response.json({ ok: true, ticket });
  },
};
