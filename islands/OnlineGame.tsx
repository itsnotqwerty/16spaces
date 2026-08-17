import { useEffect, useMemo, useState } from "preact/hooks";
import Board from "./Board.tsx";
import Sidebar from "./Sidebar.tsx";
import {
  checkWin,
  type GameSnapshot,
  type Move as GameMove,
  type Player,
  remainingMs,
} from "../lib/game/index.ts";

type GameMoveRecord = {
  ply: number;
  player: Player;
  notation: string;
};

type GameStateResponse = {
  ok: boolean;
  game?: {
    gameId: string;
    rated: boolean;
    timeControlId: string;
    yourPlayer: Player;
    snapshot: GameSnapshot;
    moves: GameMoveRecord[];
    result: "a_win" | "b_win" | "draw" | null;
    completedAt: number | null;
    players: {
      X: { userId: string; rating: { rating: number } };
      O: { userId: string; rating: { rating: number } };
    };
  };
  error?: string;
};

type Ploy = {
  index: number;
  xMove: string | null;
  oMove: string | null;
};

function movesToPloys(moves: GameMoveRecord[]): Ploy[] {
  const ploys: Ploy[] = [];
  for (const move of moves) {
    if (move.player === "X") {
      ploys.push({ index: ploys.length, xMove: move.notation, oMove: null });
    } else if (ploys.length === 0) {
      ploys.push({ index: 0, xMove: null, oMove: move.notation });
    } else {
      ploys[ploys.length - 1] = {
        ...ploys[ploys.length - 1],
        oMove: move.notation,
      };
    }
  }
  return ploys;
}

export default function OnlineGame({ gameId }: { gameId: string }) {
  const [game, setGame] = useState<GameStateResponse["game"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [resigning, setResigning] = useState(false);

  async function refresh() {
    try {
      const response = await fetch(
        `/api/gameplay/state?id=${encodeURIComponent(gameId)}`,
        { cache: "no-store", credentials: "same-origin" },
      );
      const data: GameStateResponse = await response.json();
      if (!response.ok || !data.game) {
        setError(data.error ?? "game_unavailable");
        return;
      }
      setGame(data.game);
      setError(null);
    } catch {
      setError("connection_failed");
    }
  }

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 1000);
    const tick = setInterval(() => setNowMs(Date.now()), 250);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [gameId]);

  const snapshot = game?.snapshot ?? null;
  const yourPlayer = game?.yourPlayer ?? null;
  const winner = snapshot?.terminal?.winner ?? null;
  const completed = game?.completedAt != null;

  const winningLine = useMemo(() => {
    if (
      !snapshot || !snapshot.terminal ||
      snapshot.terminal.reason !== "four_in_a_row"
    ) {
      return null;
    }
    return checkWin(snapshot.board)?.line ?? null;
  }, [snapshot]);

  const isYourTurn = !!snapshot && !!yourPlayer && !completed &&
    snapshot.toMove === yourPlayer;

  async function handleIntent(move: GameMove) {
    if (!isYourTurn) {
      return;
    }

    const response = await fetch("/api/gameplay/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ gameId, move }),
    });
    const data = await response.json();
    if (!response.ok) {
      await refresh();
      return;
    }

    setGame((prev) =>
      prev
        ? {
          ...prev,
          snapshot: data.snapshot,
          result: data.result ?? prev.result,
          completedAt: data.result
            ? prev.completedAt ?? Date.now()
            : prev.completedAt,
          moves: [
            ...prev.moves,
            {
              ply: data.snapshot.ply,
              player: yourPlayer!,
              notation: data.notation,
            },
          ],
        }
        : prev
    );
  }

  async function handleResign() {
    if (resigning || completed) {
      return;
    }
    setResigning(true);
    try {
      await fetch("/api/gameplay/resign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ gameId }),
      });
    } finally {
      setResigning(false);
      await refresh();
    }
  }

  if (error) {
    return (
      <div class="text-gray-300">
        {error === "game_not_found"
          ? "This game could not be found."
          : "Unable to load the game right now."}
      </div>
    );
  }

  if (!game || !snapshot || !yourPlayer) {
    return <div class="text-gray-300">Loading game…</div>;
  }

  const displayTimeSeconds = (player: Player): number => {
    const stored = player === "X"
      ? snapshot.clock.remainingMsX
      : snapshot.clock.remainingMsO;

    if (snapshot.terminal) {
      return Math.ceil(stored / 1000);
    }

    return Math.ceil(
      remainingMs(
        stored,
        snapshot.clock.turnStartedAt,
        snapshot.toMove,
        player,
        new Date(nowMs),
      ) / 1000,
    );
  };

  const resultText = (() => {
    if (!snapshot.terminal) {
      return null;
    }
    if (snapshot.terminal.winner === null) {
      return "Draw.";
    }
    const youWon = snapshot.terminal.winner === yourPlayer;
    const reason = snapshot.terminal.reason === "timeout"
      ? "on time"
      : snapshot.terminal.reason === "resign"
      ? "by resignation"
      : "";
    return youWon ? `You won ${reason}.` : `You lost ${reason}.`;
  })();

  return (
    <div class="w-full">
      <div class="mb-3 text-gray-300 flex flex-wrap items-center gap-3">
        <span>
          You are playing as <strong class="text-white">{yourPlayer}</strong>
          {game.rated ? " · Rated" : " · Casual"}
        </span>
        {!completed && (
          <button
            type="button"
            class="px-3 py-1 bg-red-500 text-white rounded disabled:opacity-50"
            onClick={handleResign}
            disabled={resigning}
          >
            Resign
          </button>
        )}
        {resultText && <span class="font-bold text-white">{resultText}</span>}
        {!completed && !isYourTurn && (
          <span class="text-gray-400">Waiting for opponent…</span>
        )}
      </div>

      <div class="flex flex-col sm:flex-row justify-center items-start sm:space-x-4">
        <Board
          board={snapshot.board}
          currentPlayer={snapshot.toMove}
          winningLine={winningLine}
          onIntent={handleIntent}
          winState={winner}
        />
        <Sidebar
          playerX={{
            name: yourPlayer === "X" ? "You" : "Opponent",
            elo: game.players.X.rating.rating,
            isConnected: true,
          }}
          playerO={{
            name: yourPlayer === "O" ? "You" : "Opponent",
            elo: game.players.O.rating.rating,
            isConnected: true,
          }}
          ploys={movesToPloys(game.moves)}
          timeX={displayTimeSeconds("X")}
          timeO={displayTimeSeconds("O")}
          winState={winner}
        />
      </div>
    </div>
  );
}
