import { useState, useEffect, useRef } from "preact/hooks";
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
  currentPlayer: "X" | "O";
  ploys: Ploy[];
};

export default function Board(props: BoardProps) {
  const [board, setBoard] = useState<Player[][]>(
    Array(4).fill(Array(4).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<"X" | "O">("X");
  const [selectedStone, setSelectedStone] = useState<{ x: number; y: number } | null>(null);
  const [winningLine, setWinningLine] = useState<number[][] | null>(null);
  const [moves, setMoves] = useState<Ploy[]>([]); // Initialize moves with the ploys from props

  const socketRef = useRef<WebSocket | null>(null);

  // Reconstruct the board whenever ploys are updated
  useEffect(() => {
    reconstructBoard(props.ploys);
  }, [props.ploys]);

  const reconstructBoard = (ploys: Ploy[]) => {
    const newBoard: Player[][] = Array(4).fill(null).map(() => Array(4).fill(null));
    let currentPlayer: Player = "X";

    for (const ploy of ploys) {
      if (ploy.xMove) {
        const [from, to] = ploy.xMove.split("->");
        if (to) {
          // Move stone
          const [fromCol, fromRow] = [from.charCodeAt(0) - 65, parseInt(from[1]) - 1];
          const [toCol, toRow] = [to.charCodeAt(0) - 65, parseInt(to[1]) - 1];
          newBoard[fromRow][fromCol] = null;
          newBoard[toRow][toCol] = "X";
        } else {
          // Place stone
          const [col, row] = [from.charCodeAt(0) - 65, parseInt(from[1]) - 1];
          newBoard[row][col] = "X";
        }
      }

      if (ploy.oMove) {
        const [from, to] = ploy.oMove.split("->");
        if (to) {
          // Move stone
          const [fromCol, fromRow] = [from.charCodeAt(0) - 65, parseInt(from[1]) - 1];
          const [toCol, toRow] = [to.charCodeAt(0) - 65, parseInt(to[1]) - 1];
          newBoard[fromRow][fromCol] = null;
          newBoard[toRow][toCol] = "O";
        } else {
          // Place stone
          const [col, row] = [from.charCodeAt(0) - 65, parseInt(from[1]) - 1];
          newBoard[row][col] = "O";
        }
      }

      currentPlayer = currentPlayer === "X" ? "O" : "X";
    }

    setBoard(newBoard);
    setCurrentPlayer(currentPlayer);
  };

  const resetGame = () => {
    setBoard(Array(4).fill(Array(4).fill(null))); // Clear the board
    setCurrentPlayer("X"); // Reset to player X
    setSelectedStone(null); // Clear selected stone
    setWinningLine(null); // Clear winning line
    setMoves([]); // Clear moves
    props.resetHook(); // Call the reset hook
  };

  const handleMove = (move: string) => {
    const [from, to] = move.split("->");
    if (to) {
      // Move stone
      const [fromCol, fromRow] = [from.charCodeAt(0) - 65, parseInt(from[1]) - 1];
      const [toCol, toRow] = [to.charCodeAt(0) - 65, parseInt(to[1]) - 1];
      setBoard((prevBoard) => {
        const newBoard = prevBoard.map((row) => [...row]); // Deep copy of the board
        newBoard[fromRow][fromCol] = null;
        newBoard[toRow][toCol] = currentPlayer;
        return newBoard;
      });
    } else {
      // Place stone
      const [col, row] = [from.charCodeAt(0) - 65, parseInt(from[1]) - 1];
      setBoard((prevBoard) => {
        const newBoard = prevBoard.map((row) => [...row]); // Deep copy of the board
        newBoard[row][col] = currentPlayer;
        return newBoard;
      });
    }
  };

  const handleClick = (x: number, y: number) => {
    if (props.winState) return; // Prevent moves if the game is over

    if (selectedStone) {
      // If a stone is already selected, move it
      if (selectedStone.x === x && selectedStone.y === y) {
        // Deselect the stone if clicked again
        setSelectedStone(null);
        return;
      }

      if (board[x][y] === null) {
        // Move the stone to an empty space
        const move = `${String.fromCharCode(selectedStone.y + 65)}${selectedStone.x + 1}->${String.fromCharCode(y + 65)}${x + 1}`;
        handleMove(move);
        setSelectedStone(null); // Deselect the stone after moving
      }
    } else {
      if (board[x][y] === null) {
        // Place a new stone if the clicked space is empty
        const move = `${String.fromCharCode(y + 65)}${x + 1}`;
        handleMove(move);
        setMoves((prevMoves) => [
          ...prevMoves,
          { index: moves.length, xMove: currentPlayer === "X" ? move : null, oMove: currentPlayer === "O" ? move : null },
        ]);
      } else if (board[x][y] === currentPlayer) {
        // Select the stone if it belongs to the current player
        setSelectedStone({ x, y });
      }
    }
  };

  return (
    <div class="my-2 ml-0 mr-4">
      {/* Top labels */}
      <div class="grid grid-cols-5 gap-1 mb-2">
        <div></div> {/* Empty corner */}
        {["A", "B", "C", "D"].map((label) => (
          <div key={label} class="text-center text-2xl text-white font-bold">
            {label}
          </div>
        ))}
      </div>
      {/* Board with side labels */}
      <div class="grid grid-rows-4 gap-1">
        {board.map((row, x) => (
          <div key={x} class="grid grid-cols-5 gap-1">
            <div class="flex items-center justify-center text-2xl text-white font-bold">{x + 1}</div> {/* Side label */}
            {row.map((cell, y) => (
              <Space
                key={`${x}-${y}`}
                x={x}
                y={y}
                value={cell}
                isSelected={selectedStone?.x === x && selectedStone?.y === y}
                isWinning={winningLine?.some(([wx, wy]) => wx === x && wy === y) || false}
                onClick={() => handleClick(x, y)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}