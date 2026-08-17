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
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const winState = game.terminal?.winner ?? null;

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
    commitMove(move, humanPlayer);
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
