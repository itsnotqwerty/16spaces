import { useEffect, useRef, useState } from "preact/hooks";
import Board from "./Board.tsx";
import Sidebar from "./Sidebar.tsx";
import {
  type AiDifficulty,
  applyLocalMove,
  checkWin,
  chooseAiMove,
  DEFAULT_BOARD_SIZE,
  DEFAULT_TIME_CONTROL_ID,
  emptyBoard,
  type GameSnapshot,
  MAX_BOARD_SIZE,
  MIN_BOARD_SIZE,
  type Move,
  pickDelayMs,
  type Player,
  remainingMs,
  resolveFlagFall,
  resolveTimeControl,
  stoneCap,
} from "../lib/game/index.ts";
import { markAiTutorialSeen, shouldShowAiTutorial } from "../lib/tutorial.ts";
import TimeControlPicker from "./TimeControlPicker.tsx";
import Dropdown from "./Dropdown.tsx";

type Ploy = {
  index: number;
  xMove: string | null;
  oMove: string | null;
};

const DIFFICULTY_LABELS: Record<AiDifficulty, string> = {
  1: "1 — Beginner",
  2: "2 — Easy",
  3: "3 — Casual",
  4: "4 — Strong",
  5: "5 — Perfect",
};

function createInitialSnapshot(
  timeControlId: string,
  size: number = DEFAULT_BOARD_SIZE,
): GameSnapshot {
  const control = resolveTimeControl(timeControlId, size);

  return {
    board: emptyBoard(size),
    size,
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

export default function AiGame() {
  const [difficulty, setDifficulty] = useState<AiDifficulty>(3);
  const [timeControlId, setTimeControlId] = useState(DEFAULT_TIME_CONTROL_ID);
  const [boardSize, setBoardSize] = useState(DEFAULT_BOARD_SIZE);
  const [game, setGame] = useState<GameSnapshot>(() =>
    createInitialSnapshot(DEFAULT_TIME_CONTROL_ID)
  );
  const [humanPlayer] = useState<Player>("X");
  const aiPlayer: Player = humanPlayer === "X" ? "O" : "X";
  const [ploys, setPloys] = useState<Ploy[]>([]);
  const [winningLine, setWinningLine] = useState<[number, number][] | null>(
    null,
  );
  const [nowMs, setNowMs] = useState(Date.now());
  const [aiThinking, setAiThinking] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialPlacedStone, setTutorialPlacedStone] = useState<
    { x: number; y: number } | null
  >(null);
  const [tutorialSelectedStone, setTutorialSelectedStone] = useState<
    { x: number; y: number } | null
  >(null);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const centerTargets = (() => {
    const size = game.board.length;
    const start = Math.floor(size / 2) - 1;
    const targets: Array<{ x: number; y: number }> = [];

    for (let x = start; x <= start + 1; x++) {
      for (let y = start; y <= start + 1; y++) {
        if (x >= 0 && x < size && y >= 0 && y < size) {
          targets.push({ x, y });
        }
      }
    }

    return targets;
  })();

  const tutorialSteps = [
    {
      title: "Step 1: Start in the middle",
      text: "Click one of the four center squares to place your opening stone.",
    },
    {
      title: "Step 2: Wait for the AI",
      text: "The AI responds next. Watch the board and then select the stone you just placed.",
    },
    {
      title: "Step 3: Select your stone",
      text: "Click the highlighted stone to prepare your move.",
    },
    {
      title: "Step 4: Slide to a nearby empty square",
      text: "Move it to any highlighted adjacent square. Diagonal moves count too.",
    },
    {
      title: "Your first win starts with a line",
      text: "Look for a row, column, or diagonal. Control the center and create open lines to win your first game.",
    },
  ];

  const getAdjacentLegalTargets = (source: { x: number; y: number }) => {
    const adjacent: Array<{ x: number; y: number }> = [];
    const size = game.board.length;

    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        if (game.board[x][y] !== null) continue;
        const dx = Math.abs(x - source.x);
        const dy = Math.abs(y - source.y);
        if (dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0)) {
          adjacent.push({ x, y });
        }
      }
    }

    return adjacent;
  };

  const tutorialHighlights = (() => {
    if (!showTutorial) return [];

    if (tutorialStep === 0) return centerTargets;
    if (tutorialStep === 1 || tutorialStep === 2) {
      return tutorialPlacedStone ? [tutorialPlacedStone] : [];
    }
    if (tutorialStep === 3 && tutorialSelectedStone) {
      return [tutorialSelectedStone, ...getAdjacentLegalTargets(tutorialSelectedStone)];
    }
    return [];
  })();

  const isTutorialMoveAllowed = (move: Move): boolean => {
    if (!showTutorial) return true;

    if (tutorialStep === 0) {
      return move.kind === "place" && centerTargets.some(
        ({ x, y }) => x === move.to.x && y === move.to.y,
      );
    }

    if (tutorialStep === 3 && tutorialSelectedStone) {
      return move.kind === "slide" &&
        move.from.x === tutorialSelectedStone.x &&
        move.from.y === tutorialSelectedStone.y &&
        game.board[move.to.x][move.to.y] === null &&
        Math.abs(move.from.x - move.to.x) <= 1 &&
        Math.abs(move.from.y - move.to.y) <= 1 &&
        !(move.from.x === move.to.x && move.from.y === move.to.y);
    }

    return false;
  };

  const winState = game.terminal?.winner ?? null;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const shouldShow = shouldShowAiTutorial(globalThis.localStorage);
    if (shouldShow) {
      setShowTutorial(true);
      setTutorialStep(0);
      markAiTutorialSeen(globalThis.localStorage);
    }
  }, []);

  const closeTutorial = () => {
    setShowTutorial(false);
    markAiTutorialSeen(typeof window !== "undefined" ? globalThis.localStorage : null);
  };

  const appendPloy = (mover: Player, notation: string) => {
    setPloys((prev) => {
      if (mover === "X") {
        return [...prev, { index: prev.length, xMove: notation, oMove: null }];
      }
      if (prev.length === 0) {
        return [{ index: 0, xMove: null, oMove: notation }];
      }
      const next = [...prev];
      const last = next[next.length - 1];
      next[next.length - 1] = { ...last, oMove: notation };
      return next;
    });
  };

  const commitMove = (move: Move, mover: Player) => {
    const result = applyLocalMove(game, move, new Date());
    if (!result.ok) {
      if (result.error === "flag_fell") {
        setGame(result.snapshot);
      }
      return false;
    }
    setGame(result.snapshot);
    appendPloy(mover, result.notation);
    setWinningLine(checkWin(result.snapshot.board)?.line ?? null);
    setNowMs(Date.now());
    return true;
  };

  useEffect(() => {
    if (!showTutorial) return;

    if (tutorialStep === 1 && tutorialPlacedStone && game.toMove === humanPlayer) {
      setTutorialStep(2);
    }

    if (tutorialStep === 2 && tutorialSelectedStone &&
      tutorialSelectedStone.x === tutorialPlacedStone?.x &&
      tutorialSelectedStone.y === tutorialPlacedStone?.y) {
      setTutorialStep(3);
    }
  }, [showTutorial, tutorialStep, game.toMove, tutorialPlacedStone, tutorialSelectedStone]);

  // Clock tick + flag fall.
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setNowMs(now.getTime());
      setGame((prev) => resolveFlagFall(prev, now));
    }, 250);
    return () => clearInterval(timer);
  }, []);

  // Schedule the AI whenever it is its turn and the game is live.
  useEffect(() => {
    if (game.terminal || game.toMove !== aiPlayer) {
      setAiThinking(false);
      return;
    }

    setAiThinking(true);
    const delay = pickDelayMs(difficulty);
    aiTimer.current = setTimeout(() => {
      setGame((current) => {
        if (current.terminal || current.toMove !== aiPlayer) {
          return current;
        }
        const move = chooseAiMove(current.board, aiPlayer, difficulty);
        if (!move) {
          return current;
        }
        const result = applyLocalMove(current, move, new Date());
        if (!result.ok) {
          return result.error === "flag_fell" ? result.snapshot : current;
        }
        appendPloy(aiPlayer, result.notation);
        setWinningLine(checkWin(result.snapshot.board)?.line ?? null);
        setAiThinking(false);
        return result.snapshot;
      });
    }, delay);

    return () => {
      if (aiTimer.current) {
        clearTimeout(aiTimer.current);
        aiTimer.current = null;
      }
    };
  }, [game.toMove, game.terminal, difficulty]);

  const handleIntent = (move: Move) => {
    if (game.toMove !== humanPlayer || game.terminal || aiThinking) {
      return;
    }

    if (showTutorial && !isTutorialMoveAllowed(move)) {
      return;
    }

    const didMove = commitMove(move, humanPlayer);
    if (!didMove || !showTutorial) {
      return;
    }

    if (tutorialStep === 0) {
      setTutorialPlacedStone({ x: move.to.x, y: move.to.y });
      setTutorialSelectedStone(null);
      setTutorialStep(1);
      return;
    }

    if (tutorialStep === 3) {
      setTutorialPlacedStone(null);
      setTutorialSelectedStone(null);
      setTutorialStep(4);
      return;
    }
  };

  const handleReset = (
    nextTimeControlId = timeControlId,
    nextSize = boardSize,
  ) => {
    if (aiTimer.current) {
      clearTimeout(aiTimer.current);
      aiTimer.current = null;
    }
    setGame(createInitialSnapshot(nextTimeControlId, nextSize));
    setPloys([]);
    setWinningLine(null);
    setAiThinking(false);
    setNowMs(Date.now());
  };

  const displayTimeSeconds = (player: Player): number => {
    const stored = player === "X"
      ? game.clock.remainingMsX
      : game.clock.remainingMsO;
    if (game.terminal) {
      return Math.ceil(stored / 1000);
    }
    return Math.ceil(
      remainingMs(
        stored,
        game.clock.turnStartedAt,
        game.toMove,
        player,
        new Date(nowMs),
      ) / 1000,
    );
  };

  return (
    <div class="w-full">
      {showTutorial && (
        <div class="mb-4 w-full max-w-2xl rounded-xl border border-yellow-300/60 bg-[#1d1a17] p-4 shadow-lg shadow-yellow-500/10">
          <div class="flex items-center justify-between gap-3 text-xs text-gray-300">
            <span class="font-semibold uppercase tracking-[0.18em] text-yellow-300">
              Quick tutorial
            </span>
            <span>
              {Math.min(tutorialStep + 1, tutorialSteps.length)}/{tutorialSteps.length}
            </span>
          </div>
          <h2 class="mt-2 text-xl font-bold text-white">
            {tutorialSteps[Math.min(tutorialStep, tutorialSteps.length - 1)].title}
          </h2>
          <p class="mt-2 text-sm leading-6 text-gray-200">
            {tutorialSteps[Math.min(tutorialStep, tutorialSteps.length - 1)].text}
          </p>
          <div class="mt-3 flex justify-end gap-2">
            {tutorialStep > 0 && tutorialStep < tutorialSteps.length - 1 && (
              <button
                type="button"
                class="rounded border border-white/20 px-3 py-2 text-white hover:bg-white/5"
                onClick={() => setTutorialStep((current) => Math.max(0, current - 1))}
              >
                Back
              </button>
            )}
            <button
              type="button"
              class="rounded bg-yellow-400 px-3 py-2 font-semibold text-black hover:bg-yellow-300"
              onClick={() => {
                if (tutorialStep === tutorialSteps.length - 1) {
                  closeTutorial();
                  return;
                }

                if (tutorialStep < tutorialSteps.length - 1) {
                  setTutorialStep((current) => current + 1);
                }
              }}
            >
              {tutorialStep === tutorialSteps.length - 1 ? "Start playing" : "Next"}
            </button>
          </div>
        </div>
      )}
      <div class="mb-4 grid gap-3 sm:grid-cols-3">
        <div class="space-y-1">
          <span class="block text-xs font-medium text-gray-400 uppercase tracking-wide">
            Difficulty
          </span>
          <Dropdown
            id="ai-difficulty-select"
            value={String(difficulty)}
            options={(
              Object.keys(DIFFICULTY_LABELS) as unknown as AiDifficulty[]
            ).map((level) => ({
              value: String(level),
              label: DIFFICULTY_LABELS[level],
            }))}
            onChange={(v) => {
              setDifficulty(Number(v) as AiDifficulty);
              handleReset();
            }}
            class="w-full text-sm"
          />
        </div>

        <div class="space-y-1">
          <span class="block text-xs font-medium text-gray-400 uppercase tracking-wide">
            Time
          </span>
          <TimeControlPicker
            value={timeControlId}
            onChange={(value) => {
              setTimeControlId(value);
              handleReset(value);
            }}
            size={boardSize}
            showLabel={false}
            selectClass="w-full rounded bg-[#23211d] border border-white/20 px-3 py-2 text-white text-sm"
          />
        </div>

        <div class="space-y-1">
          <span class="block text-xs font-medium text-gray-400 uppercase tracking-wide">
            Board
          </span>
          <Dropdown
            id="ai-board-size-select"
            value={String(boardSize)}
            options={Array.from(
              { length: MAX_BOARD_SIZE - MIN_BOARD_SIZE + 1 },
              (_, i) => MIN_BOARD_SIZE + i,
            ).map((size) => ({
              value: String(size),
              label: `${size}×${size} · ${stoneCap(size)} stones`,
            }))}
            onChange={(v) => {
              const size = Number(v);
              setBoardSize(size);
              handleReset(timeControlId, size);
            }}
            class="w-full text-sm"
          />
        </div>

        {aiThinking && !game.terminal && (
          <span class="text-sm text-amber-200 sm:ml-4">AI is thinking…</span>
        )}
      </div>

      <div class="flex flex-col sm:flex-row justify-center items-start sm:space-x-4 w-full">
        <Board
          board={game.board}
          currentPlayer={game.toMove}
          winningLine={winningLine}
          onIntent={handleIntent}
          onReset={handleReset}
          winState={winState}
          tutorialTargets={tutorialHighlights}
          onSelectionChange={(coord) => {
            if (!showTutorial) return;

            if (coord === null) {
              setTutorialSelectedStone(null);
              return;
            }

            if (tutorialStep === 2 &&
              tutorialPlacedStone &&
              coord.x === tutorialPlacedStone.x &&
              coord.y === tutorialPlacedStone.y) {
              setTutorialSelectedStone(coord);
              setTutorialStep(3);
            }
          }}
        />
        <Sidebar
          playerX={{
            name: humanPlayer === "X" ? "You" : `AI (level ${difficulty})`,
            elo: 0,
            isConnected: true,
          }}
          playerO={{
            name: aiPlayer === "O" ? `AI (level ${difficulty})` : "You",
            elo: 0,
            isConnected: true,
          }}
          ploys={ploys}
          timeX={displayTimeSeconds("X")}
          timeO={displayTimeSeconds("O")}
          winState={winState}
        />
      </div>
    </div>
  );
}
