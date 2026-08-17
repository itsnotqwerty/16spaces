import { assert, assertEquals } from "$std/assert/mod.ts";
import { afterLegalMove, type ClockState, remainingMs } from "./index.ts";

function baseClock(): ClockState {
  return {
    remainingMsX: 150_000,
    remainingMsO: 150_000,
    incrementMs: 0,
    turnStartedAt: null,
    clocksStartedAt: null,
  };
}

Deno.test("afterLegalMove uses stored remaining when turnStartedAt is null", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  const updated = afterLegalMove(baseClock(), "X", now);

  assertEquals(updated.remainingMsX, 150_000);
  assertEquals(updated.turnStartedAt, now.toISOString());
  assertEquals(updated.clocksStartedAt, now.toISOString());
});

Deno.test("remainingMs ticks only for side to move", () => {
  const started = new Date("2026-01-01T00:00:00.000Z");
  const now = new Date(started.getTime() + 2_000);

  const xRemaining = remainingMs(10_000, started.toISOString(), "X", "X", now);
  const oRemaining = remainingMs(10_000, started.toISOString(), "X", "O", now);

  assertEquals(xRemaining, 8_000);
  assertEquals(oRemaining, 10_000);
});

Deno.test("afterLegalMove applies increment after elapsed time", () => {
  const started = new Date("2026-01-01T00:00:00.000Z");
  const clock: ClockState = {
    ...baseClock(),
    incrementMs: 1_000,
    remainingMsX: 10_000,
    turnStartedAt: started.toISOString(),
    clocksStartedAt: started.toISOString(),
  };

  const now = new Date(started.getTime() + 2_000);
  const updated = afterLegalMove(clock, "X", now);

  assert(updated.remainingMsX > 8_000);
  assertEquals(updated.remainingMsX, 9_000);
});
