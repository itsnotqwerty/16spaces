import type { ClockState, Player } from "./types.ts";

export function remainingMs(
  stored: number,
  turnStartedAt: string | null,
  toMove: Player,
  me: Player,
  now: Date,
): number {
  if (!turnStartedAt || toMove !== me) {
    return stored;
  }

  const elapsed = now.getTime() - new Date(turnStartedAt).getTime();
  return Math.max(0, stored - elapsed);
}

export function afterLegalMove(
  clock: ClockState,
  mover: Player,
  now: Date,
): ClockState {
  const startedAt = clock.turnStartedAt ? new Date(clock.turnStartedAt) : null;
  const elapsed = startedAt ? now.getTime() - startedAt.getTime() : 0;

  if (mover === "X") {
    const remaining = Math.max(0, clock.remainingMsX - elapsed) +
      clock.incrementMs;
    return {
      ...clock,
      remainingMsX: remaining,
      turnStartedAt: now.toISOString(),
      clocksStartedAt: clock.clocksStartedAt ?? now.toISOString(),
    };
  }

  const remaining = Math.max(0, clock.remainingMsO - elapsed) +
    clock.incrementMs;
  return {
    ...clock,
    remainingMsO: remaining,
    turnStartedAt: now.toISOString(),
    clocksStartedAt: clock.clocksStartedAt ?? now.toISOString(),
  };
}

export function flaggedPlayer(
  clock: ClockState,
  toMove: Player,
  now: Date,
): Player | null {
  if (!clock.turnStartedAt) {
    return null;
  }

  const remaining = toMove === "X"
    ? remainingMs(clock.remainingMsX, clock.turnStartedAt, toMove, "X", now)
    : remainingMs(clock.remainingMsO, clock.turnStartedAt, toMove, "O", now);

  return remaining <= 0 ? toMove : null;
}
