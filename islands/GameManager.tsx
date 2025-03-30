import { useState, useEffect } from "preact/hooks";
import Board from "./Board.tsx";
import Sidebar from "./Sidebar.tsx";

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
  const [maxTime, setMaxTime] = useState(150); // Set initial max time
  const [timeX, setTimeX] = useState(maxTime);
  const [timeO, setTimeO] = useState(maxTime);
  const [timerActive, setTimerActive] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<"X" | "O">("X");
  const [winState, setWinState] = useState<"X" | "O" | null>(null); // Track the winner

  useEffect(() => {
    let timer: number | undefined;

    if (timerActive && !winState) {
      timer = setInterval(() => {
        if (currentPlayer === "X") {
          setTimeX((prev) => {
            if (prev <= 1) {
              setWinState("O"); // Player O wins
              setTimerActive(false); // Stop the timer
              return 0;
            }
            return prev - 1;
          });
        } else {
          setTimeO((prev) => {
            if (prev <= 1) {
              setWinState("X"); // Player X wins
              setTimerActive(false); // Stop the timer
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [timerActive, currentPlayer, winState]);

  const handleMove = (index: number, xMove: string | null, oMove: string | null) => {
    if (winState) return; // Prevent moves if the game is over

    setPloys((prevPloys) => {
      const newPloys = [...prevPloys];
      if (newPloys.length > index) {
        newPloys.map((ploy, i) => {
          if (i === index) {
            ploy.xMove = xMove;
            ploy.oMove = oMove;
          }
          return ploy;
        });
      } else {
        newPloys.push({ index, xMove, oMove });
      }
      return newPloys;
    });

    // Start the timer after the first move
    if (!timerActive) {
      setTimerActive(true);
    }

    // Switch the current player
    setCurrentPlayer((prev) => (prev === "X" ? "O" : "X"));
  };

  const handleWin = (winner: "X" | "O") => {
    setWinState(winner);
    setTimerActive(false); // Stop the timer
  };

  const handleReset = () => {
    setPloys([]);
    setTimeX(maxTime); // Reset to 2:30
    setTimeO(maxTime); // Reset to 2:30
    setCurrentPlayer("X");
    setTimerActive(false);
    setWinState(null); // Clear the winner
  };

  return (
    <div class="flex flex-col sm:flex-row items-start space-x-4">
      <Board
        moveHook={handleMove}
        resetHook={handleReset}
        winHook={handleWin}
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
  );
}