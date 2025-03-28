import { useState } from "preact/hooks";
import Space from "../components/Space.tsx";

type Player = "X" | "O" | null;

export default function Board() {
  const [board, setBoard] = useState<Player[][]>(
    Array(4).fill(Array(4).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<Player>("X");
  const [selectedStone, setSelectedStone] = useState<{ x: number; y: number } | null>(null);

  const handleCellClick = (x: number, y: number) => {
    if (selectedStone) {
      // Move an existing stone
      if (board[x][y] === null && isAdjacent(selectedStone, { x, y })) {
        const newBoard = board.map((row, i) =>
          row.map((cell, j) =>
            i === x && j === y
              ? currentPlayer
              : i === selectedStone.x && j === selectedStone.y
              ? null
              : cell
          )
        );
        setBoard(newBoard);
        setSelectedStone(null);
        setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
      }
    } else {
      // Place a new stone
      if (board[x][y] === null && countStones(currentPlayer) < 5) {
        const newBoard = board.map((row, i) =>
          row.map((cell, j) => (i === x && j === y ? currentPlayer : cell))
        );
        setBoard(newBoard);
        setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
      } else if (board[x][y] === currentPlayer) {
        // Select an existing stone
        setSelectedStone({ x, y });
      }
    }
  };

  const isAdjacent = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = Math.abs(from.x - to.x);
    const dy = Math.abs(from.y - to.y);
    return dx <= 1 && dy <= 1 && (dx + dy > 0);
  };

  const countStones = (player: Player) =>
    board.flat().filter((cell) => cell === player).length;

  const checkWin = () => {
    // Check rows, columns, and diagonals for a win
    const lines = [
      ...board, // Rows
      ...board[0].map((_, col) => board.map((row) => row[col])), // Columns
      board.map((_, i) => board[i][i]), // Main diagonal
      board.map((_, i) => board[i][3 - i]), // Anti-diagonal
    ];
    return lines.some((line) => line.every((cell) => cell === currentPlayer));
  };

  return (
    <div>
      {/* Top labels */}
      <div class="grid grid-cols-5 gap-1 mb-2">
        <div></div> {/* Empty corner */}
        {["A", "B", "C", "D"].map((label) => (
          <div key={label} class="text-center font-bold">
            {label}
          </div>
        ))}
      </div>
      {/* Board with side labels */}
      <div class="grid grid-rows-4 gap-1">
        {board.map((row, x) => (
          <div key={x} class="grid grid-cols-5 gap-1">
            <div class="text-center font-bold">{x + 1}</div> {/* Side label */}
            {row.map((cell, y) => (
              <Space
                key={`${x}-${y}`}
                x={x}
                y={y}
                value={cell}
                isSelected={selectedStone?.x === x && selectedStone?.y === y}
                onClick={() => handleCellClick(x, y)}
              />
            ))}
          </div>
        ))}
      </div>
      {checkWin() && <p class="mt-4 text-xl">Player {currentPlayer} wins!</p>}
    </div>
  );
}