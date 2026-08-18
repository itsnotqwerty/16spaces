import type { Board, Cell, Player } from "./types.ts";

export const BOARD_SIZE = 4;
export const DEFAULT_BOARD_SIZE = 4;
export const MIN_BOARD_SIZE = 3;
export const MAX_BOARD_SIZE = 6;

/** Stones available to each player for a given board size. */
export function stoneCap(size: number): number {
  return Math.floor((size * size) / 3);
}

export const STONE_CAP = stoneCap(DEFAULT_BOARD_SIZE);

export function boardSize(board: Board): number {
  return board.length;
}

export function emptyBoard(size: number = DEFAULT_BOARD_SIZE): Board {
  return Array.from(
    { length: size },
    () => Array.from({ length: size }, () => null as Cell),
  );
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

export function countStones(board: Board, player: Player): number {
  return board.flat().filter((cell) => cell === player).length;
}

export function isInBounds(x: number, y: number, size: number): boolean {
  return x >= 0 && x < size && y >= 0 && y < size;
}
