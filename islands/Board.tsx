import { useState } from "preact/hooks";
import Space from "../components/Space.tsx";

type Player = "X" | "O" | null;

type Ploy = {
  index: number; // e.g., 0, 1, 2, etc.
  xMove: string | null; // e.g., "A1"
  oMove: string | null; // e.g., "B2"
};

type BoardProps = {
  moveHook: (index: number, xMove: string | null, oMove: string | null) => void;
  resetHook: () => void;
  winHook: (winner: "X" | "O") => void;
  winState: "X" | "O" | null;
};

export default function Board(props: BoardProps) {
  const [board, setBoard] = useState<Player[][]>(
    Array(4).fill(Array(4).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<Player>("X");
  const [selectedStone, setSelectedStone] = useState<{ x: number; y: number } | null>(null);
  const [winningLine, setWinningLine] = useState<number[][] | null>(null);
  const [currentPloy, setCurrentPloy] = useState<Ploy | null>({
    index: 0,
    xMove: null,
    oMove: null,
  });

  const handleCellClick = (x: number, y: number) => {
    if (props.winState) return; // Ignore clicks if the game is over

    if (selectedStone) {
      // Deselect the currently selected stone if clicked again
      if (selectedStone.x === x && selectedStone.y === y) {
        setSelectedStone(null);
        return;
      }

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

        const moveRepresentation = `${String.fromCharCode(65 + selectedStone.y)}${selectedStone.x + 1}->${String.fromCharCode(65 + y)}${x + 1}`;
        if (currentPlayer === "X") {
          setCurrentPloy({index: currentPloy!.index, xMove: moveRepresentation, oMove: null});
          props.moveHook(currentPloy!.index, moveRepresentation, null); // Notify GameManager of the move
        } else if (currentPlayer === "O") {
          setCurrentPloy({ index: currentPloy!.index, xMove: currentPloy!.xMove, oMove: moveRepresentation });
          props.moveHook(currentPloy!.index, currentPloy!.xMove, moveRepresentation); // Notify GameManager of the move
          setCurrentPloy({ index: currentPloy!.index + 1, xMove: null, oMove: null }); // Increment the index for the next move
        }

        setBoard(newBoard);
        setSelectedStone(null);

        const winResult = checkWin(newBoard);
        if (winResult) {
          props.winHook(winResult.winner); // Notify GameManager of the winner
          setWinningLine(winResult.line);
        }

        setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
      }
    } else {
      // Place a new stone
      if (board[x][y] === null && countStones(currentPlayer) < 5) {
        const newBoard = board.map((row, i) =>
          row.map((cell, j) => (i === x && j === y ? currentPlayer : cell))
        );

        const moveRepresentation = `${String.fromCharCode(65 + y)}${x + 1}`;
        if (currentPlayer === "X") {
          setCurrentPloy({index: currentPloy!.index, xMove: moveRepresentation, oMove: null});
          props.moveHook(currentPloy!.index, moveRepresentation, null); // Notify GameManager of the move
        } else if (currentPlayer === "O") {
          setCurrentPloy({ index: currentPloy!.index, xMove: currentPloy!.xMove, oMove: moveRepresentation });
          props.moveHook(currentPloy!.index, currentPloy!.xMove, moveRepresentation); // Notify GameManager of the move
          setCurrentPloy({ index: currentPloy!.index + 1, xMove: null, oMove: null }); // Increment the index for the next move
        }

        setBoard(newBoard);

        const winResult = checkWin(newBoard);
        if (winResult) {
          props.winHook(winResult.winner); // Notify GameManager of the winner
          setWinningLine(winResult.line);
        }

        setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
      } else if (board[x][y] === currentPlayer) {
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

  const checkWin = (boardPos: Player[][]): { winner: "X" | "O"; line: number[][] } | null => {
    const lines = [
      ...boardPos.map((row, i) => row.map((_, j) => [i, j])), // Rows
      ...boardPos[0].map((_, col) => boardPos.map((_, row) => [row, col])), // Columns
      boardPos.map((_, i) => [i, i]), // Main diagonal
      boardPos.map((_, i) => [i, boardPos.length - 1 - i]), // Anti-diagonal
    ];

    for (const line of lines) {
      const cells = line.map(([x, y]) => boardPos[x][y]);
      if (cells.every((cell) => cell === "X")) return { winner: "X", line };
      if (cells.every((cell) => cell === "O")) return { winner: "O", line };
    }

    return null;
  };

  const resetGame = () => {
    setBoard(Array(4).fill(Array(4).fill(null))); // Clear the board
    setCurrentPlayer("X"); // Reset to player X
    setSelectedStone(null); // Clear selected stone
    setWinningLine(null); // Clear winning line
    setCurrentPloy({ index: 0, xMove: null, oMove: null }); // Reset ploy
    props.resetHook(); // Call the reset hook
  };

  return (
    <div>
      {/* Top labels */}
      <div class="grid grid-cols-5 gap-1 mb-2">
        <div></div> {/* Empty corner */}
        {["A", "B", "C", "D"].map((label) => (
          <div key={label} class="text-center text-white font-bold">
            {label}
          </div>
        ))}
      </div>
      {/* Board with side labels */}
      <div class="grid grid-rows-4 gap-1">
        {board.map((row, x) => (
          <div key={x} class="grid grid-cols-5 gap-1">
            <div class="flex items-center justify-center text-white font-bold">{x + 1}</div> {/* Side label */}
            {row.map((cell, y) => (
              <Space
                key={`${x}-${y}`}
                x={x}
                y={y}
                value={cell}
                isSelected={selectedStone?.x === x && selectedStone?.y === y}
                isWinning={winningLine?.some(([wx, wy]) => wx === x && wy === y) || false}
                onClick={() => handleCellClick(x, y)}
              />
            ))}
          </div>
        ))}
      </div>
      <div class="flex flex-row justify-start items-center space-x-4">
        <button class="mt-4 p-2 bg-red-500 text-white rounded" onClick={resetGame}>
          Reset Game
        </button>
      </div>
    </div>
  );
}