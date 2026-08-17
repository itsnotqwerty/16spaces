import { useState } from "preact/hooks";
import Space from "../components/Space.tsx";
import {
  type Board as GameBoard,
  isAdjacent,
  type Move,
  type Player,
} from "../lib/game/index.ts";

type BoardProps = {
  board: GameBoard;
  currentPlayer: Player;
  winningLine: [number, number][] | null;
  onIntent: (move: Move) => void;
  onReset?: () => void;
  winState: Player | null;
};

export default function Board(props: BoardProps) {
  const [selectedStone, setSelectedStone] = useState<
    { x: number; y: number } | null
  >(null);

  const handleCellClick = (x: number, y: number) => {
    if (props.winState) return; // Ignore clicks if the game is over

    const cell = props.board[x][y];

    if (selectedStone) {
      // Deselect the currently selected stone if clicked again
      if (selectedStone.x === x && selectedStone.y === y) {
        setSelectedStone(null);
        return;
      }

      if (cell === props.currentPlayer) {
        setSelectedStone({ x, y });
        return;
      }

      if (cell === null && isAdjacent(selectedStone, { x, y })) {
        props.onIntent({ kind: "slide", from: selectedStone, to: { x, y } });
        setSelectedStone(null);
      }
    } else {
      if (cell === null) {
        props.onIntent({ kind: "place", to: { x, y } });
      } else if (cell === props.currentPlayer) {
        setSelectedStone({ x, y });
      }
    }
  };

  const resetGame = () => {
    setSelectedStone(null); // Clear selected stone
    props.onReset?.(); // Call the reset hook
  };

  const [rulesShowing, setRulesShowing] = useState(false);
  const toggleRules = () => {
    setRulesShowing(!rulesShowing);
  };

  return (
    <div class="my-2 w-full max-w-[34rem] mr-0 sm:mr-4">
      {/* Top labels */}
      <div class="grid grid-cols-[2rem_repeat(4,minmax(0,1fr))] sm:grid-cols-[2.25rem_repeat(4,minmax(0,1fr))] gap-1 mb-2">
        <div></div> {/* Empty corner */}
        {["A", "B", "C", "D"].map((label) => (
          <div
            key={label}
            class="text-center text-xl sm:text-2xl text-white font-bold"
          >
            {label}
          </div>
        ))}
      </div>
      {/* Board with side labels */}
      <div class="grid grid-rows-4 gap-1">
        {props.board.map((row, x) => (
          <div
            key={x}
            class="grid grid-cols-[2rem_repeat(4,minmax(0,1fr))] sm:grid-cols-[2.25rem_repeat(4,minmax(0,1fr))] gap-1"
          >
            <div class="flex items-center justify-center text-xl sm:text-2xl text-white font-bold">
              {x + 1}
            </div>
            {/* Side label */}
            {row.map((cell, y) => (
              <Space
                key={`${x}-${y}`}
                x={x}
                y={y}
                value={cell}
                isSelected={selectedStone?.x === x && selectedStone?.y === y}
                isWinning={props.winningLine?.some(([wx, wy]) =>
                  wx === x && wy === y
                ) || false}
                onClick={() => handleCellClick(x, y)}
              />
            ))}
          </div>
        ))}
      </div>
      <div class="flex flex-row justify-center sm:justify-start items-center space-x-4">
        {props.onReset && (
          <button
            type="button"
            class="mt-4 p-2 bg-red-500 text-white rounded"
            onClick={resetGame}
          >
            Reset Game
          </button>
        )}
        <button
          type="button"
          class="mt-4 p-2 bg-blue-500 text-white rounded"
          onClick={toggleRules}
        >
          Show Rules
        </button>
      </div>
      {rulesShowing && (
        <div class="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 min-w-[80%] mt-4 text-white bg-[#161512] border-2 border-white rounded p-4 z-50 sm:block">
          <h2 class="text-lg font-bold mb-2">Game Rules:</h2>
          <ul class="list-disc list-inside">
            <li>
              Players take turns placing or moving their stones on the 4x4
              board.
            </li>
            <li>
              Each player can have a maximum of 5 stones on the board at any
              time.
            </li>
            <li>
              To place a stone, click on an empty space. To move a stone, click
              on your stone and then on an adjacent empty space.
            </li>
            <li>
              The first player to align 4 of their stones horizontally,
              vertically, or diagonally wins the game.
            </li>
            <li>If a player's time runs out, their opponent wins the game.</li>
          </ul>
          <button
            type="button"
            class="mt-4 p-2 bg-red-500 text-white rounded"
            onClick={toggleRules}
          >
            Close Rules
          </button>
        </div>
      )}
    </div>
  );
}
