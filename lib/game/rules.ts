import {
  BOARD_SIZE,
  cloneBoard,
  countStones,
  isInBounds,
  STONE_CAP,
} from "./board.ts";
import { afterLegalMove, flaggedPlayer } from "./clock.ts";
import { moveToNotation } from "./notation.ts";
import type {
  Board,
  Coord,
  GameSnapshot,
  Move,
  MoveResult,
  Player,
  TerminalState,
} from "./types.ts";

function otherPlayer(player: Player): Player {
  return player === "X" ? "O" : "X";
}

export function isAdjacent(from: Coord, to: Coord): boolean {
  const dx = Math.abs(from.x - to.x);
  const dy = Math.abs(from.y - to.y);
  return dx <= 1 && dy <= 1 && dx + dy > 0;
}

export function checkWin(
  board: Board,
): { winner: Player; line: [number, number][] } | null {
  const lines: [number, number][][] = [];

  for (let i = 0; i < BOARD_SIZE; i++) {
    lines.push(Array.from({ length: BOARD_SIZE }, (_, y) => [i, y]));
    lines.push(Array.from({ length: BOARD_SIZE }, (_, x) => [x, i]));
  }

  lines.push(Array.from({ length: BOARD_SIZE }, (_, i) => [i, i]));
  lines.push(
    Array.from({ length: BOARD_SIZE }, (_, i) => [i, BOARD_SIZE - 1 - i]),
  );

  for (const line of lines) {
    const cells = line.map(([x, y]) => board[x][y]);
    if (cells.every((cell) => cell === "X")) {
      return { winner: "X", line };
    }
    if (cells.every((cell) => cell === "O")) {
      return { winner: "O", line };
    }
  }

  return null;
}

function canPlace(board: Board, player: Player, to: Coord): boolean {
  return isInBounds(to.x, to.y) && board[to.x][to.y] === null &&
    countStones(board, player) < STONE_CAP;
}

function canSlide(
  board: Board,
  player: Player,
  from: Coord,
  to: Coord,
): boolean {
  return isInBounds(from.x, from.y) &&
    isInBounds(to.x, to.y) &&
    board[from.x][from.y] === player &&
    board[to.x][to.y] === null &&
    isAdjacent(from, to);
}

function applyBoardMove(
  board: Board,
  player: Player,
  move: Move,
): Board | null {
  if (move.kind === "place") {
    if (!canPlace(board, player, move.to)) {
      return null;
    }

    const next = cloneBoard(board);
    next[move.to.x][move.to.y] = player;
    return next;
  }

  if (!canSlide(board, player, move.from, move.to)) {
    return null;
  }

  const next = cloneBoard(board);
  next[move.from.x][move.from.y] = null;
  next[move.to.x][move.to.y] = player;
  return next;
}

export function legalMoves(board: Board, player: Player): Move[] {
  const moves: Move[] = [];
  const stones = countStones(board, player);

  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      if (stones < STONE_CAP && board[x][y] === null) {
        moves.push({ kind: "place", to: { x, y } });
      }

      if (board[x][y] === player) {
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const to = { x: x + dx, y: y + dy };
            if (canSlide(board, player, { x, y }, to)) {
              moves.push({ kind: "slide", from: { x, y }, to });
            }
          }
        }
      }
    }
  }

  return moves;
}

export function hasLegalMove(board: Board, player: Player): boolean {
  return legalMoves(board, player).length > 0;
}

export function resolveFlagFall(
  snapshot: GameSnapshot,
  now: Date,
): GameSnapshot {
  if (snapshot.terminal) {
    return snapshot;
  }

  const flagged = flaggedPlayer(snapshot.clock, snapshot.toMove, now);
  if (!flagged) {
    return snapshot;
  }

  const winner = otherPlayer(flagged);
  const terminal: TerminalState = { winner, reason: "timeout" };
  return { ...snapshot, terminal };
}

export function applyLocalMove(
  snapshot: GameSnapshot,
  move: Move,
  now: Date,
): MoveResult {
  const afterFlag = resolveFlagFall(snapshot, now);
  if (afterFlag.terminal) {
    return { ok: false, error: "flag_fell", snapshot: afterFlag };
  }

  const player = snapshot.toMove;
  const nextBoard = applyBoardMove(snapshot.board, player, move);
  if (!nextBoard) {
    return { ok: false, error: "illegal", snapshot };
  }

  const nextToMove = otherPlayer(player);
  const nextPly = snapshot.ply + 1;
  let terminal: TerminalState | null = null;

  const win = checkWin(nextBoard);
  if (win) {
    terminal = { winner: player, reason: "four_in_a_row" };
  } else if (!hasLegalMove(nextBoard, nextToMove)) {
    terminal = { winner: player, reason: "no_legal_moves" };
  } else if (nextPly >= 400) {
    terminal = { winner: null, reason: "ply_cap" };
  }

  const nextClock = afterLegalMove(snapshot.clock, player, now);
  const nextSnapshot: GameSnapshot = {
    ...snapshot,
    board: nextBoard,
    toMove: nextToMove,
    ply: nextPly,
    clock: nextClock,
    terminal,
  };

  return {
    ok: true,
    snapshot: nextSnapshot,
    notation: moveToNotation(move),
  };
}
