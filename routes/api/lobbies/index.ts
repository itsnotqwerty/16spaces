import { Handlers } from "$fresh/server.ts";
import {
  type ColorAssignment,
  createLobby,
  listPublicLobbies,
  type LobbyPrivacy,
} from "../../../lib/lobbies.ts";
import { flag } from "../../../lib/flags.ts";
import type { AppState } from "../../_middleware.ts";
import { lobbyError, lobbyJson } from "./_shared.ts";

type CreateRequest = {
  privacy?: LobbyPrivacy;
  rated?: boolean;
  timeControlId?: string;
  colorAssignment?: ColorAssignment;
};

export const handler: Handlers<unknown, AppState> = {
  POST(req, ctx) {
    if (!flag("FEATURE_ONLINE")) {
      return Response.json(
        { error: "feature_disabled", code: "feature_online_disabled" },
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

    return req.json()
      .catch(() => ({}))
      .then((body: CreateRequest) => {
        const rated = body.rated === true;
        if (rated && !flag("FEATURE_RATED")) {
          return Response.json(
            { error: "feature_disabled", code: "feature_rated_disabled" },
            { status: 503 },
          );
        }

        const result = createLobby(user, body);
        if (!result.ok) {
          return lobbyError(result.code);
        }
        return Response.json({ ok: true, lobby: lobbyJson(result.value) });
      });
  },

  GET(_req, ctx) {
    if (!flag("FEATURE_ONLINE")) {
      return Response.json(
        { error: "feature_disabled", code: "feature_online_disabled" },
        { status: 503 },
      );
    }

    void ctx;
    return Response.json({
      ok: true,
      lobbies: listPublicLobbies().map((lobby) => ({
        code: lobby.code,
        options: lobby.options,
        memberCount: lobby.members.length,
        hostUsername: lobby.members.find((m) => m.isHost)?.username ?? null,
      })),
    });
  },
};
