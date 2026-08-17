import { assert, assertEquals } from "$std/assert/mod.ts";
import {
  applyLocalMove,
  checkWin,
  DEFAULT_TIME_CONTROL_ID,
  emptyBoard,
  type GameSnapshot,
  hasLegalMove,
  isAdjacent,
  type Move,
  resolveFlagFall,
  TIME_CONTROLS,
} from "./index.ts";

function createSnapshot(): GameSnapshot {
  const control = TIME_CONTROLS[DEFAULT_TIME_CONTROL_ID];
  return {
    board: emptyBoard(),
    size: emptyBoard().length,
    toMove: "X",
    ply: 0,
    clock: {
      remainingMsX: control.initialMs,
      remainingMsO: control.initialMs,
      incrementMs: control.incrementMs,
      turnStartedAt: null,
      clocksStartedAt: null,
    },
    terminal: null,
  };
}

Deno.test("emptyBoard rows are independent", () => {
  const board = emptyBoard();
  board[0][0] = "X";
  assertEquals(board[1][0], null);
});

Deno.test("isAdjacent allows king moves only", () => {
  assert(isAdjacent({ x: 1, y: 1 }, { x: 2, y: 2 }));
  assert(!isAdjacent({ x: 1, y: 1 }, { x: 3, y: 3 }));
});

Deno.test("three-long diagonal is not a win on 4x4", () => {
  const board = emptyBoard();
  board[0][0] = "X";
  board[1][1] = "X";
  board[2][2] = "X";
  assertEquals(checkWin(board), null);
});

Deno.test("long diagonal is a win", () => {
  const board = emptyBoard();
  board[0][0] = "X";
  board[1][1] = "X";
  board[2][2] = "X";
  board[3][3] = "X";
  assertEquals(checkWin(board)?.winner, "X");
});

Deno.test("stone cap prevents a sixth place move", () => {
  const board = emptyBoard();
  board[0][0] = "X";
  board[0][1] = "X";
  board[1][0] = "X";
  board[2][0] = "X";
  board[1][2] = "X";

  const snapshot: GameSnapshot = {
    ...createSnapshot(),
    board,
    toMove: "X",
    clock: {
      ...createSnapshot().clock,
      turnStartedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
      clocksStartedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    },
  };

  const sixthX = applyLocalMove(
    snapshot,
    { kind: "place", to: { x: 2, y: 2 } },
    new Date("2026-01-01T00:00:01.000Z"),
  );
  assertEquals(sixthX.ok, false);
  if (!sixthX.ok) {
    assertEquals(sixthX.error, "illegal");
  }
});

Deno.test("flag-fall resolves before move and does not place stone", () => {
  const snapshot = createSnapshot();
  const startedAt = new Date("2026-01-01T00:00:00.000Z");
  const running: GameSnapshot = {
    ...snapshot,
    clock: {
      ...snapshot.clock,
      turnStartedAt: startedAt.toISOString(),
      clocksStartedAt: startedAt.toISOString(),
      remainingMsX: 1000,
    },
  };

  const now = new Date(startedAt.getTime() + 2000);
  const flagged = resolveFlagFall(running, now);
  assertEquals(flagged.terminal?.reason, "timeout");
  assertEquals(flagged.board[0][0], null);

  const attempt = applyLocalMove(
    flagged,
    { kind: "place", to: { x: 0, y: 0 } },
    now,
  );
  assertEquals(attempt.ok, false);
  if (!attempt.ok) {
    assertEquals(attempt.snapshot.board[0][0], null);
  }
});

Deno.test("first move starts clocks when clocks are not started", () => {
  const snapshot = createSnapshot();
  const now = new Date("2026-01-01T00:00:00.000Z");
  const result = applyLocalMove(
    snapshot,
    { kind: "place", to: { x: 0, y: 0 } },
    now,
  );
  assert(result.ok);
  assertEquals(result.snapshot.clock.clocksStartedAt !== null, true);
  assertEquals(result.snapshot.clock.turnStartedAt !== null, true);
});

Deno.test("ply cap at 400 is a draw", () => {
  const snapshot = createSnapshot();
  const board = emptyBoard();
  board[0][0] = "X";
  board[0][1] = "X";
  board[1][0] = "X";
  board[1][1] = "X";
  board[2][0] = "X";

  board[3][3] = "O";
  board[3][2] = "O";
  board[2][3] = "O";
  board[3][1] = "O";
  board[1][2] = "O";

  const nearCap: GameSnapshot = {
    ...snapshot,
    board,
    toMove: "X",
    ply: 399,
    clock: {
      ...snapshot.clock,
      turnStartedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
      clocksStartedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    },
  };

  const move: Move = {
    kind: "slide",
    from: { x: 2, y: 0 },
    to: { x: 2, y: 1 },
  };

  const result = applyLocalMove(
    nearCap,
    move,
    new Date("2026-01-01T00:00:01.000Z"),
  );
  assert(result.ok);
  assertEquals(result.snapshot.terminal?.reason, "ply_cap");
  assertEquals(result.snapshot.terminal?.winner, null);
});

Deno.test("position with blocked side has no legal move", () => {
  const board = emptyBoard();
  board[0][0] = "X";
  board[0][1] = "X";
  board[0][2] = "X";
  board[0][3] = "X";
  board[1][0] = "X";

  board[1][1] = "O";
  board[1][2] = "O";
  board[1][3] = "O";
  board[2][0] = "O";
  board[2][1] = "O";

  assertEquals(hasLegalMove(board, "X"), false);
});
