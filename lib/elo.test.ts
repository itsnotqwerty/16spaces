import { assertEquals } from "$std/assert/mod.ts";
import { applyEloResult, expectedScore, kFactor } from "./elo.ts";

Deno.test("expectedScore is symmetric around equal ratings", () => {
  assertEquals(Number(expectedScore(1000, 1000).toFixed(4)), 0.5);
});

Deno.test("kFactor uses provisional and established values", () => {
  assertEquals(kFactor(0), 40);
  assertEquals(kFactor(9), 40);
  assertEquals(kFactor(10), 20);
});

Deno.test("applyEloResult raises winner and lowers loser", () => {
  const update = applyEloResult({
    ratingA: 1000,
    ratingB: 1000,
    gamesPlayedA: 12,
    gamesPlayedB: 20,
    resultA: "win",
  });

  assertEquals(update.deltaA, 10);
  assertEquals(update.deltaB, -10);
  assertEquals(update.ratingA, 1010);
  assertEquals(update.ratingB, 990);
});

Deno.test("applyEloResult supports draw updates", () => {
  const update = applyEloResult({
    ratingA: 1200,
    ratingB: 1000,
    gamesPlayedA: 20,
    gamesPlayedB: 20,
    resultA: "draw",
  });

  assertEquals(update.deltaA < 0, true);
  assertEquals(update.deltaB > 0, true);
});

Deno.test("applyEloResult enforces rating floor", () => {
  const update = applyEloResult({
    ratingA: 100,
    ratingB: 2200,
    gamesPlayedA: 50,
    gamesPlayedB: 50,
    resultA: "loss",
  });

  assertEquals(update.ratingA, 100);
  assertEquals(update.deltaA, 0);
});
