import { BOARD_SIZE, cloneBoard } from "./board.ts";
import { checkWin, legalMoves } from "./rules.ts";
import type { Board, Move, Player } from "./types.ts";

export type AiDifficulty = 1 | 2 | 3 | 4 | 5;

export type AiParams = {
  /** Probability of playing a uniformly random move instead of thinking. */
  randomness: number;
  /** Negamax search depth in plies. */
  depth: number;
  /** Delay bounds before committing a move, ms. */
  minDelayMs: number;
  maxDelayMs: number;
};

export const AI_LEVELS: Record<AiDifficulty, AiParams> = {
  1: { randomness: 0.85, depth: 1, minDelayMs: 3000, maxDelayMs: 4000 },
  2: { randomness: 0.55, depth: 1, minDelayMs: 3000, maxDelayMs: 4500 },
  3: { randomness: 0.3, depth: 2, minDelayMs: 3500, maxDelayMs: 5500 },
  4: { randomness: 0.12, depth: 3, minDelayMs: 4000, maxDelayMs: 6500 },
  5: { randomness: 0.02, depth: 5, minDelayMs: 4500, maxDelayMs: 8000 },
};

function other(player: Player): Player {
  return player === "X" ? "O" : "X";
}

function applyMove(board: Board, player: Player, move: Move): Board {
  const next = cloneBoard(board);
  if (move.kind === "place") {
    next[move.to.x][move.to.y] = player;
  } else {
    next[move.from.x][move.from.y] = null;
    next[move.to.x][move.to.y] = player;
  }
  return next;
}

/** Counts contiguous runs of 3 stones (an open threat to complete 4). */
function threats(board: Board, player: Player): number {
  let count = 0;
  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]] as const) {
        let run = 0;
        for (let i = 0; i < 3; i++) {
          const cx = x + dx * i;
          const cy = y + dy * i;
          if (cx < 0 || cy < 0 || cx >= BOARD_SIZE || cy >= BOARD_SIZE) break;
          if (board[cx][cy] !== player) break;
          run++;
        }
        if (run === 3) count++;
      }
    }
  }
  return count;
}

/** Static evaluation from `me`'s perspective. */
function evaluate(board: Board, me: Player): number {
  const win = checkWin(board);
  if (win) {
    return win.winner === me ? 1_000_000 : -1_000_000;
  }
  return (threats(board, me) - threats(board, other(me))) * 10;
}

function negamax(
  board: Board,
  toMove: Player,
  root: Player,
  depth: number,
  alpha: number,
  beta: number,
): number {
  const win = checkWin(board);
  if (win) {
    return win.winner === root ? 1_000_000 + depth : -1_000_000 - depth;
  }
  if (depth === 0) {
    return evaluate(board, root);
  }

  const moves = legalMoves(board, toMove);
  if (moves.length === 0) {
    return toMove === root ? 1_000_000 + depth : -1_000_000 - depth;
  }

  let best = -Infinity;
  for (const move of moves) {
    const score = -negamax(
      applyMove(board, toMove, move),
      other(toMove),
      other(root),
      depth - 1,
      -beta,
      -alpha,
    );
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/**
 * Chooses a move for `player`. Returns null when no legal move exists.
 * Difficulty blends uniform-random play with depth-limited negamax.
 */
export function chooseAiMove(
  board: Board,
  player: Player,
  difficulty: AiDifficulty,
  random: () => number = Math.random,
): Move | null {
  const moves = legalMoves(board, player);
  if (moves.length === 0) {
    return null;
  }

  const params = AI_LEVELS[difficulty];
  if (random() < params.randomness) {
    return moves[Math.floor(random() * moves.length)];
  }

  let best: Move = moves[0];
  let bestScore = -Infinity;
  for (const move of moves) {
    const score = -negamax(
      applyMove(board, player, move),
      other(player),
      other(player),
      params.depth - 1,
      -Infinity,
      Infinity,
    );
    // Deterministic tie-break jitter keeps equal moves varied.
    const jitter = random() * 0.5;
    if (score + jitter > bestScore) {
      bestScore = score + jitter;
      best = move;
    }
  }
  return best;
}

/** Picks a response delay within the difficulty's window. */
export function pickDelayMs(
  difficulty: AiDifficulty,
  random: () => number = Math.random,
): number {
  const { minDelayMs, maxDelayMs } = AI_LEVELS[difficulty];
  return minDelayMs + Math.floor(random() * (maxDelayMs - minDelayMs + 1));
}
