import type { Board, Cell, Player } from "./types.ts";

export const BOARD_SIZE = 4;
export const STONE_CAP = 5;

export function emptyBoard(): Board {
  return Array.from(
    { length: BOARD_SIZE },
    () => Array.from({ length: BOARD_SIZE }, () => null as Cell),
  );
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

export function countStones(board: Board, player: Player): number {
  return board.flat().filter((cell) => cell === player).length;
}

export function isInBounds(x: number, y: number): boolean {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}
