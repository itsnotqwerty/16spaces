import { Handlers } from "$fresh/server.ts";
import {
  getActiveGameForUser,
  getGameById,
  playerForUser,
  refreshSession,
} from "../../../lib/games.ts";
import { getRatingProfile } from "../../../lib/ratings.ts";
import type { AppState } from "../../_middleware.ts";

export const handler: Handlers<unknown, AppState> = {
  GET(req, ctx) {
    const user = ctx.state.user;
    if (!user) {
      return Response.json(
        { error: "unauthorized", code: "auth_required" },
        { status: 401 },
      );
    }

    const url = new URL(req.url);
    const gameId = url.searchParams.get("id");
    const session = gameId
      ? getGameById(gameId)
      : getActiveGameForUser(user.id);

    if (!session) {
      return Response.json(
        { error: "not_found", code: "game_not_found" },
        { status: 404 },
      );
    }

    const yourPlayer = playerForUser(session, user.id);
    if (!yourPlayer) {
      return Response.json(
        { error: "forbidden", code: "not_a_player" },
        { status: 403 },
      );
    }

    refreshSession(session, new Date());

    return Response.json({
      ok: true,
      game: {
        gameId: session.gameId,
        matchId: session.matchId,
        rated: session.rated,
        timeControlId: session.timeControlId,
        yourPlayer,
        snapshot: session.snapshot,
        moves: session.moves,
        result: session.result,
        completedAt: session.completedAt,
        players: {
          X: {
            userId: session.playerXId,
            rating: getRatingProfile(session.playerXId),
          },
          O: {
            userId: session.playerOId,
            rating: getRatingProfile(session.playerOId),
          },
        },
      },
    });
  },
};
