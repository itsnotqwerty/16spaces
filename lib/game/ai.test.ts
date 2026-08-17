import { assert, assertEquals } from "$std/assert/mod.ts";
import { emptyBoard } from "./board.ts";
import { AI_LEVELS, chooseAiMove, pickDelayMs } from "./ai.ts";
import { legalMoves } from "./rules.ts";
import type { Board, Move } from "./types.ts";

function boardWith(cells: [number, number, "X" | "O"][]): Board {
  const board = emptyBoard();
  for (const [x, y, player] of cells) {
    board[x][y] = player;
  }
  return board;
}

function isLegal(board: Board, move: Move, player: "X" | "O"): boolean {
  return legalMoves(board, player).some((m) =>
    JSON.stringify(m) === JSON.stringify(move)
  );
}

Deno.test("ai move is always legal", () => {
  const board = boardWith([[0, 0, "X"], [1, 1, "O"], [2, 2, "X"], [3, 3, "O"]]);
  for (const level of [1, 2, 3, 4, 5] as const) {
    const move = chooseAiMove(board, "X", level);
    assert(move, `level ${level} should produce a move`);
    assert(isLegal(board, move, "X"), `level ${level} move must be legal`);
  }
});

Deno.test("ai takes an immediate win at high difficulty", () => {
  // X has three in column 0 and can win by placing at (0,3).
  const board = boardWith([[0, 0, "X"], [0, 1, "X"], [0, 2, "X"], [3, 3, "O"]]);
  const move = chooseAiMove(board, "X", 5, () => 0.99);
  assert(move);
  assertEquals(move, { kind: "place", to: { x: 0, y: 3 } });
});

Deno.test("ai blocks an immediate opponent win at high difficulty", () => {
  // O threatens column 1; X must block at (1,3).
  const board = boardWith([[1, 0, "O"], [1, 1, "O"], [1, 2, "O"], [2, 2, "X"]]);
  const move = chooseAiMove(board, "X", 5, () => 0.99);
  assert(move);
  assertEquals(move, { kind: "place", to: { x: 1, y: 3 } });
});

Deno.test("level 1 mostly plays random moves", () => {
  const board = boardWith([[0, 0, "X"], [0, 1, "X"], [0, 2, "X"], [3, 3, "O"]]);
  // Deterministic random that stays below the level-1 randomness threshold.
  const move = chooseAiMove(board, "X", 1, () => 0.01);
  assert(move);
  assert(isLegal(board, move, "X"));
});

Deno.test("ai returns null when no legal moves exist", () => {
  const board = emptyBoard();
  // No X stones at cap is impossible to force here; empty board has moves.
  assert(legalMoves(board, "X").length > 0);
  // Fill the board entirely: no legal moves for anyone.
  const full = emptyBoard().map((row) => row.map(() => "X" as const));
  assertEquals(chooseAiMove(full as Board, "O", 5), null);
});

Deno.test("delays stay within 3-8s bounds for every level", () => {
  for (const level of [1, 2, 3, 4, 5] as const) {
    const { minDelayMs, maxDelayMs } = AI_LEVELS[level];
    assert(minDelayMs >= 3000);
    assert(maxDelayMs <= 8000);
    for (const r of [0, 0.5, 0.999]) {
      const delay = pickDelayMs(level, () => r);
      assert(delay >= minDelayMs && delay <= maxDelayMs);
    }
  }
});
