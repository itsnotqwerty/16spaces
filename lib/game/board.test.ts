import { assert, assertEquals } from "$std/assert/mod.ts";
import {
  boardSize,
  DEFAULT_BOARD_SIZE,
  emptyBoard,
  isInBounds,
  stoneCap,
} from "./board.ts";
import { checkWin, legalMoves } from "./rules.ts";

Deno.test("stoneCap is floor(N^2 / 3)", () => {
  assertEquals(stoneCap(3), 3);
  assertEquals(stoneCap(4), 5);
  assertEquals(stoneCap(5), 8);
  assertEquals(stoneCap(6), 12);
});

Deno.test("emptyBoard creates an N x N grid", () => {
  const b3 = emptyBoard(3);
  assertEquals(boardSize(b3), 3);
  assertEquals(b3.every((row) => row.length === 3), true);
  assertEquals(boardSize(emptyBoard()), DEFAULT_BOARD_SIZE);
});

Deno.test("isInBounds respects size", () => {
  assert(isInBounds(2, 2, 3));
  assert(!isInBounds(3, 0, 3));
  assert(!isInBounds(0, 3, 3));
  assert(isInBounds(3, 3, 4));
});

Deno.test("3x3 win requires three in a row", () => {
  const board = emptyBoard(3);
  board[0][0] = "X";
  board[0][1] = "X";
  assertEquals(checkWin(board), null);
  board[0][2] = "X";
  assertEquals(checkWin(board)?.winner, "X");
});

Deno.test("5x5 win requires five in a row", () => {
  const board = emptyBoard(5);
  for (let i = 0; i < 4; i++) board[i][0] = "O";
  assertEquals(checkWin(board), null);
  board[4][0] = "O";
  assertEquals(checkWin(board)?.winner, "O");
});

Deno.test("stone cap scales with board size", () => {
  // 3x3 => cap 3; a 4th place is illegal.
  const board = emptyBoard(3);
  board[0][0] = "X";
  board[1][0] = "X";
  board[2][0] = "X";
  const places = legalMoves(board, "X").filter((m) => m.kind === "place");
  assertEquals(places.length, 0);
});
