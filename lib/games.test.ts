import { assert, assertEquals } from "$std/assert/mod.ts";
import {
  getActiveGameForUser,
  playerForUser,
  resignGame,
  submitMove,
} from "./games.ts";
import { enqueueUser, getMatchById } from "./matchmaking.ts";

function matchTwoUsers(rated = false) {
  const userA = `g_a_${crypto.randomUUID().replaceAll("-", "")}`;
  const userB = `g_b_${crypto.randomUUID().replaceAll("-", "")}`;
  enqueueUser(userA, rated, "classic");
  const ticketB = enqueueUser(userB, rated, "classic");
  assert(ticketB.matchId);
  const match = getMatchById(ticketB.matchId);
  assert(match);
  return { userA, userB, match };
}

Deno.test("matchmaking creates a game session for the match", () => {
  const { userA, userB, match } = matchTwoUsers();
  assert(match.gameId, "match should have a game id");

  const session = getActiveGameForUser(userA);
  assert(session);
  assertEquals(session.gameId, match.gameId);
  assertEquals(getActiveGameForUser(userB)?.gameId, session.gameId);
  assertEquals(playerForUser(session, userA), "X");
  assertEquals(playerForUser(session, userB), "O");
  assertEquals(session.snapshot.toMove, "X");
});

Deno.test("server settles the match when a player wins", () => {
  const { userA, userB, match } = matchTwoUsers(true);
  const gameId = match.gameId!;

  // X completes column x=0 for a four-in-a-row win.
  const script: [string, number, number][] = [
    [userA, 0, 0],
    [userB, 1, 0],
    [userA, 0, 1],
    [userB, 1, 1],
    [userA, 0, 2],
    [userB, 1, 2],
    [userA, 0, 3],
  ];

  let last;
  for (const [userId, x, y] of script) {
    last = submitMove(gameId, userId, { kind: "place", to: { x, y } });
  }

  assert(last?.ok);
  if (last?.ok) {
    assertEquals(last.session.result, "a_win");
    assert(last.session.completedAt !== null);
  }

  const settled = getMatchById(match.matchId);
  assertEquals(settled?.result, "a_win");
  assert(settled?.ratingUpdate, "rated match should apply rating updates");
});

Deno.test("out-of-turn and post-game moves are rejected", () => {
  const { userA, userB, match } = matchTwoUsers();
  const gameId = match.gameId!;

  const wrongTurn = submitMove(gameId, userB, {
    kind: "place",
    to: { x: 2, y: 2 },
  });
  assertEquals(wrongTurn.ok, false);
  if (!wrongTurn.ok) {
    assertEquals(wrongTurn.code, "not_your_turn");
  }

  assert(resignGame(gameId, userA).ok);
  const after = submitMove(gameId, userB, {
    kind: "place",
    to: { x: 2, y: 2 },
  });
  assertEquals(after.ok, false);
  if (!after.ok) {
    assertEquals(after.code, "game_over");
  }
  assertEquals(getMatchById(match.matchId)?.result, "b_win");
});
