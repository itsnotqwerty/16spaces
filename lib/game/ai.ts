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

  // The only way to stop the opponent's threat is to occupy the square their
  // winning move targets (placing on it or sliding onto it). Filtering to
  // those candidates avoids an O(moves^2) scan, which matters on large boards.
  const target = opponentWin.to;
  const candidates = legalMoves(board, player).filter((move) =>
    move.to.x === target.x && move.to.y === target.y
  );

  for (const move of candidates) {
    const next = applyMove(board, player, move);
    if (!findImmediateWin(next, opponent)) {
      return move;
    }
  }

  return legalMoves(board, player)[0] ?? null;
}

/** Thrown when the search exceeds its wall-clock deadline. */
class SearchAborted extends Error {}

type SearchContext = {
  /** performance.now() timestamp after which the search must stop. */
  deadline: number;
  /** Nodes visited since the search started; deadline is checked periodically. */
  nodes: number;
};

/**
 * Wall-clock budget for a single AI move. Larger boards get a smaller budget
 * because their branching factor makes deep search exponentially pricier —
 * this is what keeps 7x7-9x9 games responsive.
 */
export function searchBudgetMs(difficulty: AiDifficulty, size: number): number {
  const base = [0, 250, 400, 700, 1200, 2000][difficulty];
  const sizeFactor = size <= 5 ? 1 : size <= 7 ? 0.5 : 0.3;
  return Math.max(120, Math.round(base * sizeFactor));
}

function newSearchContext(budgetMs: number): SearchContext {
  return { deadline: performance.now() + budgetMs, nodes: 0 };
}

function checkSearchBudget(ctx: SearchContext): void {
  // Cheap node counter gate so performance.now() is sampled rarely.
  if ((++ctx.nodes & 0x7f) === 0 && performance.now() > ctx.deadline) {
    throw new SearchAborted();
  }
}

/** Orders moves so alpha-beta prunes early: central, aggressive moves first. */
function orderedMoves(board: Board, player: Player): Move[] {
  const moves = legalMoves(board, player);
  const bitmap = positionalBitmap(boardSize(board));
  const score = (move: Move): number => {
    const to = bitmap[move.to.x][move.to.y];
    return move.kind === "slide"
      ? to - bitmap[move.from.x][move.from.y] * 0.5
      : to;
  };
  return moves
    .map((move) => ({ move, score: score(move) }))
    .sort((a, b) => b.score - a.score)
    .map(({ move }) => move);
}

function negamax(
  board: Board,
  toMove: Player,
  root: Player,
  depth: number,
  alpha: number,
  beta: number,
  ctx: SearchContext,
): number {
  checkSearchBudget(ctx);

  const win = checkWin(board);
  if (win) {
    return win.winner === root ? 1_000_000 + depth : -1_000_000 - depth;
  }
  if (depth === 0) {
    return evaluate(board, root);
  }

  const moves = orderedMoves(board, toMove);
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
      ctx,
    );
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

type RootSearchResult = { move: Move; score: number };

/** One iterative-deepening pass over the root moves (synchronous). */
function searchRoot(
  board: Board,
  player: Player,
  moves: Move[],
  depth: number,
  ctx: SearchContext,
  random: () => number,
): RootSearchResult {
  let best = moves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  for (const move of moves) {
    const score = -negamax(
      applyMove(board, player, move),
      other(player),
      player,
      depth - 1,
      -Infinity,
      -alpha,
      ctx,
    );
    // Deterministic tie-break jitter keeps equal moves varied.
    const jittered = score + random() * 0.5;
    if (jittered > bestScore) {
      bestScore = jittered;
      best = move;
    }
    if (score > alpha) alpha = score;
  }
  return { move: best, score: bestScore };
}

/** Same as searchRoot but yields to the event loop between root moves. */
async function searchRootAsync(
  board: Board,
  player: Player,
  moves: Move[],
  depth: number,
  ctx: SearchContext,
  random: () => number,
  yieldFn: () => Promise<void>,
): Promise<RootSearchResult> {
  let best = moves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const score = -negamax(
      applyMove(board, player, move),
      other(player),
      player,
      depth - 1,
      -Infinity,
      -alpha,
      ctx,
    );
    const jittered = score + random() * 0.5;
    if (jittered > bestScore) {
      bestScore = jittered;
      best = move;
    }
    if (score > alpha) alpha = score;
    if ((i & 3) === 3) {
      await yieldFn();
    }
  }
  return { move: best, score: bestScore };
}

type PreparedSearch = {
  moves: Move[];
  params: AiParams;
  ctx: SearchContext;
};

/**
 * Handles the cheap tactical shortcuts (immediate win, forced block, random
 * play) and returns the ordered root moves plus a deadline-budgeted search
 * context when a real search is needed.
 */
function prepareSearch(
  board: Board,
  player: Player,
  difficulty: AiDifficulty,
  random: () => number,
): { kind: "move"; move: Move | null } | { kind: "search"; search: PreparedSearch } {
  const moves = legalMoves(board, player);
  if (moves.length === 0) {
    return { kind: "move", move: null };
  }

  const params = AI_LEVELS[difficulty];

  const immediateWin = findImmediateWin(board, player);
  if (immediateWin) return { kind: "move", move: immediateWin };

  const blockingMove = findStrongestBlock(board, player);
  if (blockingMove) return { kind: "move", move: blockingMove };

  if (random() < params.randomness) {
    return {
      kind: "move",
      move: moves[Math.floor(random() * moves.length)],
    };
  }

  return {
    kind: "search",
    search: {
      moves: orderedMoves(board, player),
      params,
      ctx: newSearchContext(searchBudgetMs(difficulty, boardSize(board))),
    },
  };
}

/**
 * Chooses a move for `player`. Returns null when no legal move exists.
 * Difficulty blends uniform-random play with depth-limited negamax.
 *
 * The search uses iterative deepening under a wall-clock budget
 * (see searchBudgetMs): it returns the best move from the last fully
 * completed depth, so it stays fast even on large boards.
 */
export function chooseAiMove(
  board: Board,
  player: Player,
  difficulty: AiDifficulty,
  random: () => number = Math.random,
): Move | null {
  const prepared = prepareSearch(board, player, difficulty, random);
  if (prepared.kind === "move") {
    return prepared.move;
  }
  const { moves, params, ctx } = prepared.search;

  let best = moves[0];
  for (let depth = 1; depth <= params.depth; depth++) {
    try {
      best = searchRoot(board, player, moves, depth, ctx, random).move;
    } catch (error) {
      if (error instanceof SearchAborted) break;
      throw error;
    }
  }
  return best;
}

const defaultYield = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Async variant of chooseAiMove for UI contexts: identical move selection,
 * but it yields to the event loop between root moves so timers and rendering
 * keep running while the AI thinks.
 */
export async function chooseAiMoveAsync(
  board: Board,
  player: Player,
  difficulty: AiDifficulty,
  random: () => number = Math.random,
  yieldFn: () => Promise<void> = defaultYield,
): Promise<Move | null> {
  const prepared = prepareSearch(board, player, difficulty, random);
  if (prepared.kind === "move") {
    return prepared.move;
  }
  const { moves, params, ctx } = prepared.search;

  let best = moves[0];
  for (let depth = 1; depth <= params.depth; depth++) {
    try {
      best = (await searchRootAsync(
        board,
        player,
        moves,
        depth,
        ctx,
        random,
        yieldFn,
      )).move;
    } catch (error) {
      if (error instanceof SearchAborted) break;
      throw error;
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
