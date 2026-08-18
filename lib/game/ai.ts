import { boardSize, cloneBoard } from "./board.ts";
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
  1: { randomness: 0.7, depth: 2, minDelayMs: 3000, maxDelayMs: 4000 },
  2: { randomness: 0.2, depth: 3, minDelayMs: 3000, maxDelayMs: 4500 },
  3: { randomness: 0.08, depth: 3, minDelayMs: 3500, maxDelayMs: 5500 },
  4: { randomness: 0.03, depth: 4, minDelayMs: 4000, maxDelayMs: 6500 },
  5: { randomness: 0.01, depth: 4, minDelayMs: 4500, maxDelayMs: 8000 },
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

/** Counts contiguous runs of (size-1) stones — an open threat to complete a line. */
function threats(board: Board, player: Player): number {
  const size = boardSize(board);
  const run = size - 1;
  let count = 0;
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]] as const) {
        let streak = 0;
        for (let i = 0; i < run; i++) {
          const cx = x + dx * i;
          const cy = y + dy * i;
          if (cx < 0 || cy < 0 || cx >= size || cy >= size) break;
          if (board[cx][cy] !== player) break;
          streak++;
        }
        if (streak === run) count++;
      }
    }
  }
  return count;
}

/** Counts any 4-cell line that has 3 stones for `player` and one empty square. */
function potentialWinningMoves(board: Board, player: Player): number {
  const size = boardSize(board);
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]] as const;
  let count = 0;

  for (const [dx, dy] of directions) {
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const cells: Array<Player | null> = [];
        for (let step = 0; step < 4; step++) {
          const cx = x + dx * step;
          const cy = y + dy * step;
          if (cx < 0 || cy < 0 || cx >= size || cy >= size) {
            cells.length = 0;
            break;
          }
          cells.push(board[cx][cy]);
        }
        if (cells.length !== 4) continue;

        const own = cells.filter((cell) => cell === player).length;
        const empty = cells.filter((cell) => cell === null).length;
        const enemy = cells.filter((cell) => cell !== null && cell !== player).length;
        if (own === 3 && empty === 1 && enemy === 0) count++;
      }
    }
  }

  return count;
}

const bitmapCache = new Map<number, number[][]>();

/**
 * Auto-generates a 4-bit (0-15) positional bitmap from a 2D gaussian normal
 * distribution peaked at the board center. Used only for long-term strategic
 * scoring at leaf nodes — it never overrides tactical win/block detection.
 */
export function positionalBitmap(size: number): number[][] {
  const cached = bitmapCache.get(size);
  if (cached) return cached;

  const center = (size - 1) / 2;
  const sigma = size / 4;
  const bitmap = Array.from({ length: size }, (_, x) =>
    Array.from({ length: size }, (_, y) => {
      const dx = x - center;
      const dy = y - center;
      const d2 = dx * dx + dy * dy;
      return Math.round(15 * Math.exp(-d2 / (2 * sigma * sigma)));
    })
  );

  bitmapCache.set(size, bitmap);
  return bitmap;
}

/** Static evaluation from `me`'s perspective. */
function evaluate(board: Board, me: Player): number {
  const win = checkWin(board);
  if (win) {
    return win.winner === me ? 1_000_000 : -1_000_000;
  }

  const immediate = (threats(board, me) - threats(board, other(me))) * 40;
  const pressure =
    (potentialWinningMoves(board, me) - potentialWinningMoves(board, other(me))) *
    25;
  const mobility =
    (legalMoves(board, me).length - legalMoves(board, other(me)).length) * 3;

  // Long-term positional pressure from the gaussian bitmap. Weight is kept
  // small so it only breaks ties between strategically different plans and
  // never outweighs threats, pressure, or mobility.
  const bitmap = positionalBitmap(boardSize(board));
  let positional = 0;
  for (let x = 0; x < bitmap.length; x++) {
    for (let y = 0; y < bitmap.length; y++) {
      const cell = board[x][y];
      if (cell === me) positional += bitmap[x][y];
      else if (cell !== null) positional -= bitmap[x][y];
    }
  }

  return immediate + pressure + mobility + positional * 2;
}

function findImmediateWin(board: Board, player: Player): Move | null {
  for (const move of legalMoves(board, player)) {
    const next = applyMove(board, player, move);
    if (checkWin(next)?.winner === player) {
      return move;
    }
  }
  return null;
}

function findStrongestBlock(board: Board, player: Player): Move | null {
  const opponent = other(player);
  const opponentWin = findImmediateWin(board, opponent);
  if (!opponentWin) return null;

  for (const move of legalMoves(board, player)) {
    const next = applyMove(board, player, move);
    if (!findImmediateWin(next, opponent)) {
      return move;
    }
  }

  return legalMoves(board, player)[0] ?? null;
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
      root,
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

  const immediateWin = findImmediateWin(board, player);
  if (immediateWin) return immediateWin;

  const blockingMove = findStrongestBlock(board, player);
  if (blockingMove) return blockingMove;

  if (random() < params.randomness) {
    return moves[Math.floor(random() * moves.length)];
  }

  let best: Move = moves[0];
  let bestScore = -Infinity;
  for (const move of moves) {
    const score = -negamax(
      applyMove(board, player, move),
      other(player),
      player,
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

/**
 * Picks a response delay within the difficulty's window, capped so the AI
 * never burns more than `maxFraction` of its remaining time. This keeps the
 * AI from stalling out low-time (e.g. bullet) matches.
 */
export function pickDelayMs(
  difficulty: AiDifficulty,
  remainingMs?: number,
  random: () => number = Math.random,
): number {
  const { minDelayMs, maxDelayMs } = AI_LEVELS[difficulty];
  let delay = minDelayMs + Math.floor(random() * (maxDelayMs - minDelayMs + 1));

  if (remainingMs !== undefined && Number.isFinite(remainingMs)) {
    // Never think longer than a fifth of the remaining clock (and leave a
    // small buffer so the move lands before the flag falls).
    const cap = Math.max(200, Math.floor(remainingMs / 5) - 100);
    delay = Math.min(delay, cap);
    delay = Math.max(delay, 200); // keep a minimum think time
  }

  return delay;
}
