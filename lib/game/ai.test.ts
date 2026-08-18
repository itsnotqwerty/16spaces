import { assert, assertEquals } from "$std/assert/mod.ts";
import { emptyBoard } from "./board.ts";
import {
  AI_LEVELS,
  chooseAiMove,
  chooseAiMoveAsync,
  pickDelayMs,
  positionalBitmap,
  searchBudgetMs,
} from "./ai.ts";
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

Deno.test("higher levels search deeper and are less random to resist passive stalls", () => {
  assert(AI_LEVELS[1].depth >= 2);
  assert(AI_LEVELS[2].depth >= 3);
  assert(AI_LEVELS[3].depth >= 3);
  assert(AI_LEVELS[4].depth >= 4);
  assert(AI_LEVELS[5].depth >= 4);
  assert(AI_LEVELS[5].randomness <= 0.01);
  assert(AI_LEVELS[4].randomness <= 0.03);
});

Deno.test("positional bitmap is a 4-bit gaussian peaked at the center", () => {
  const size = 4;
  const bitmap = positionalBitmap(size);
  assertEquals(bitmap.length, size);
  const center = (size - 1) / 2;

  let max = -1;
  for (let x = 0; x < size; x++) {
    assertEquals(bitmap[x].length, size);
    for (let y = 0; y < size; y++) {
      const value = bitmap[x][y];
      assert(Number.isInteger(value));
      assert(value >= 0 && value <= 15, "bitmap values must fit in 4 bits");
      if (value > max) max = value;
    }
  }

  // The maximum must sit on a center square of the gaussian peak.
  const peakSquares: [number, number][] = [];
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      if (bitmap[x][y] === max) peakSquares.push([x, y]);
    }
  }
  assert(
    peakSquares.every(([x, y]) =>
      Math.abs(x - center) <= 0.5 && Math.abs(y - center) <= 0.5
    ),
    "peak must be at the board center",
  );

  // Corners are the least valuable squares.
  assert(bitmap[0][0] < max / 2);
  assert(bitmap[size - 1][size - 1] < max / 2);

  // The gaussian is rotationally symmetric.
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      assertEquals(bitmap[x][y], bitmap[y][x]);
      assertEquals(bitmap[x][y], bitmap[size - 1 - x][size - 1 - y]);
    }
  }
});

Deno.test("bitmap is cached per board size", () => {
  assertEquals(positionalBitmap(4), positionalBitmap(4));
  assertEquals(positionalBitmap(5).length, 5);
});

Deno.test("delays stay within 3-8s bounds for every level", () => {
  for (const level of [1, 2, 3, 4, 5] as const) {
    const { minDelayMs, maxDelayMs } = AI_LEVELS[level];
    assert(minDelayMs >= 3000);
    assert(maxDelayMs <= 8000);
    for (const r of [0, 0.5, 0.999]) {
      const delay = pickDelayMs(level, undefined, () => r);
      assert(delay >= minDelayMs && delay <= maxDelayMs);
    }
  }
});

Deno.test("async ai takes an immediate win at high difficulty", async () => {
  // X has three in column 0 and can win by placing at (0,3).
  const board = boardWith([[0, 0, "X"], [0, 1, "X"], [0, 2, "X"], [3, 3, "O"]]);
  const move = await chooseAiMoveAsync(board, "X", 5, () => 0.99);
  assertEquals(move, { kind: "place", to: { x: 0, y: 3 } });
});

Deno.test("async ai yields to the event loop during search", async () => {
  const board = emptyBoard(6);
  board[2][2] = "X";
  board[3][3] = "O";
  let yields = 0;
  const move = await chooseAiMoveAsync(board, "X", 5, () => 0.99, () => {
    yields++;
    return Promise.resolve();
  });
  assert(move && isLegal(board, move, "X"));
  assert(yields > 0, "search should yield between root moves");
});

Deno.test("search budget shrinks on larger boards", () => {
  for (const level of [1, 2, 3, 4, 5] as const) {
    assert(searchBudgetMs(level, 9) <= searchBudgetMs(level, 4));
    assert(searchBudgetMs(level, 4) >= 120);
  }
});

Deno.test("ai stays responsive on the largest board", async () => {
  const size = 9;
  const board = emptyBoard(size);
  board[4][4] = "X";
  board[3][3] = "O";
  board[4][3] = "X";
  const start = performance.now();
  const move = await chooseAiMoveAsync(board, "O", 5, () => 0.99);
  const elapsed = performance.now() - start;
  assert(move && isLegal(board, move, "O"));
  // Level-5 budget on 9x9 is 600ms; allow generous slack for CI machines.
  assert(elapsed < 3000, `search took ${elapsed}ms on a 9x9 board`);
});
