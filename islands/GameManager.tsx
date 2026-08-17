import { useEffect, useState } from "preact/hooks";
import Board from "./Board.tsx";
import Sidebar from "./Sidebar.tsx";
import {
  applyLocalMove,
  checkWin,
  DEFAULT_BOARD_SIZE,
  DEFAULT_TIME_CONTROL_ID,
  emptyBoard,
  type GameSnapshot,
  MAX_BOARD_SIZE,
  MIN_BOARD_SIZE,
  type Move,
  type Player,
  remainingMs,
  resolveFlagFall,
  resolveTimeControl,
  stoneCap,
} from "../lib/game/index.ts";
import TimeControlPicker from "./TimeControlPicker.tsx";
import Dropdown from "./Dropdown.tsx";

type PlayerInfo = {
  name: string;
  elo: number;
  isConnected: boolean;
};

type Ploy = {
  index: number; // e.g., 0, 1, 2, etc.
  xMove: string | null; // e.g., "A1"
  oMove: string | null; // e.g., "B2"
};

function createInitialSnapshot(
  timeControlId: string,
  size: number = DEFAULT_BOARD_SIZE,
): GameSnapshot {
  const control = resolveTimeControl(timeControlId);

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

export default function GameManager() {
  const [playerX, _setPlayerX] = useState<PlayerInfo>({
    name: "Anonymous",
    elo: 1000,
    isConnected: true,
  });
  const [playerO, _setPlayerO] = useState<PlayerInfo>({
    name: "Anonymous",
    elo: 1000,
    isConnected: false,
  });
  const [ploys, setPloys] = useState<Ploy[]>([]);
  const [winningLine, setWinningLine] = useState<[number, number][] | null>(
    null,
  );
  const [nowMs, setNowMs] = useState(Date.now());
  const [timeControlId, setTimeControlId] = useState(DEFAULT_TIME_CONTROL_ID);
  const [boardSize, setBoardSize] = useState(DEFAULT_BOARD_SIZE);
  const [game, setGame] = useState<GameSnapshot>(() =>
    createInitialSnapshot(DEFAULT_TIME_CONTROL_ID)
  );

  const winState = game.terminal?.winner ?? null;

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setNowMs(now.getTime());
      setGame((prev) => resolveFlagFall(prev, now));
    }, 250);

    return () => clearInterval(timer);
  }, []);

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

  const handleIntent = (move: Move) => {
    const now = new Date();
    const mover = game.toMove;
    const result = applyLocalMove(game, move, now);

    if (!result.ok) {
      if (result.error === "flag_fell") {
        setGame(result.snapshot);
      }
      return;
    }

    setGame(result.snapshot);
    appendPloy(mover, result.notation);

    const win = checkWin(result.snapshot.board);
    setWinningLine(win?.line ?? null);
    setNowMs(now.getTime());
  };

  const handleReset = () => {
    setGame(createInitialSnapshot(timeControlId, boardSize));
    setPloys([]);
    setWinningLine(null);
    setNowMs(Date.now());
  };

  const handleTimeControlChange = (value: string) => {
    setTimeControlId(value);
    setGame(createInitialSnapshot(value, boardSize));
    setPloys([]);
    setWinningLine(null);
    setNowMs(Date.now());
  };

  const handleBoardSizeChange = (value: string) => {
    const size = Number(value);
    setBoardSize(size);
    setGame(createInitialSnapshot(timeControlId, size));
    setPloys([]);
    setWinningLine(null);
    setNowMs(Date.now());
  };

  const displayTimeSeconds = (player: Player): number => {
    const stored = player === "X"
      ? game.clock.remainingMsX
      : game.clock.remainingMsO;

    if (game.terminal) {
      return Math.ceil(stored / 1000);
    }

    const liveRemaining = remainingMs(
      stored,
      game.clock.turnStartedAt,
      game.toMove,
      player,
      new Date(nowMs),
    );

    return Math.ceil(liveRemaining / 1000);
  };

  const timeX = displayTimeSeconds("X");
  const timeO = displayTimeSeconds("O");

  return (
    <div class="w-full">
      <div class="mb-4 grid gap-3 sm:grid-cols-2">
        <div class="space-y-1">
          <span class="block text-xs font-medium text-gray-400 uppercase tracking-wide">
            Time
          </span>
          <TimeControlPicker
            value={timeControlId}
            onChange={handleTimeControlChange}
            showLabel={false}
            selectClass="w-full rounded bg-[#23211d] border border-white/20 px-3 py-2 text-white text-sm"
          />
        </div>

        <div class="space-y-1">
          <span class="block text-xs font-medium text-gray-400 uppercase tracking-wide">
            Board
          </span>
          <Dropdown
            id="board-size-select"
            value={String(boardSize)}
            options={Array.from(
              { length: MAX_BOARD_SIZE - MIN_BOARD_SIZE + 1 },
              (_, i) => MIN_BOARD_SIZE + i,
            ).map((size) => ({
              value: String(size),
              label: `${size}×${size} · ${stoneCap(size)} stones`,
            }))}
            onChange={handleBoardSizeChange}
            class="w-full text-sm"
          />
        </div>
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
          playerX={playerX}
          playerO={playerO}
          ploys={ploys}
          timeX={timeX}
          timeO={timeO}
          winState={winState}
        />
      </div>
    </div>
  );
}
