import { assertEquals } from "$std/assert/mod.ts";
import { applyRatedOutcome, getRatingProfile } from "./ratings.ts";

Deno.test("new rating profiles start at 1000", () => {
  const profile = getRatingProfile("test-user-initial");
  assertEquals(profile.rating, 1000);
  assertEquals(profile.ratedGames, 0);
});

Deno.test("applyRatedOutcome updates both players", () => {
  const userA = "test-user-a";
  const userB = "test-user-b";

  const beforeA = getRatingProfile(userA);
  const beforeB = getRatingProfile(userB);

  const update = applyRatedOutcome(userA, userB, "win");
  assertEquals(update.profileA.ratedGames, beforeA.ratedGames + 1);
  assertEquals(update.profileB.ratedGames, beforeB.ratedGames + 1);
  assertEquals(update.profileA.wins, beforeA.wins + 1);
  assertEquals(update.profileB.losses, beforeB.losses + 1);
});
