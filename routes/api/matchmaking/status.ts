import { Handlers } from "$fresh/server.ts";
import { getMatchById, getUserTicket } from "../../../lib/matchmaking.ts";
import { getRatingProfile } from "../../../lib/ratings.ts";
import type { AppState } from "../../_middleware.ts";

export const handler: Handlers<unknown, AppState> = {
  GET(_req, ctx) {
    const user = ctx.state.user;
    if (!user) {
      return Response.json(
        { error: "unauthorized", code: "auth_required" },
        { status: 401 },
      );
    }

    const ticket = getUserTicket(user.id);
    const match = ticket?.matchId ? getMatchById(ticket.matchId) : null;

    return Response.json({
      ok: true,
      status: ticket ? ticket.status : "idle",
      ticket,
      match,
      rating: getRatingProfile(user.id),
    });
  },
};
