import { assert, assertEquals } from "$std/assert/mod.ts";
import {
  enqueueUser,
  getUserTicket,
  settleMatchResult,
} from "./matchmaking.ts";
import { getRatingProfile } from "./ratings.ts";

Deno.test("rated match settlement applies rating updates", () => {
  const userA = `mm_a_${crypto.randomUUID().replaceAll("-", "")}`;
  const userB = `mm_b_${crypto.randomUUID().replaceAll("-", "")}`;

  enqueueUser(userA, true, "classic");
  const ticketB = enqueueUser(userB, true, "classic");
  assert(ticketB.matchId);

  const beforeA = getRatingProfile(userA);
  const beforeB = getRatingProfile(userB);

  const completed = settleMatchResult(ticketB.matchId, "a_win");

  assertEquals(completed.ok, true);
  if (completed.ok) {
    assert(completed.match.ratingUpdate);
  }

  const afterA = getRatingProfile(userA);
  const afterB = getRatingProfile(userB);
  assertEquals(afterA.ratedGames, beforeA.ratedGames + 1);
  assertEquals(afterB.ratedGames, beforeB.ratedGames + 1);
  assertEquals(afterA.rating > beforeA.rating, true);
  assertEquals(afterB.rating < beforeB.rating, true);
  assertEquals(getUserTicket(userA), null);
  assertEquals(getUserTicket(userB), null);
});
