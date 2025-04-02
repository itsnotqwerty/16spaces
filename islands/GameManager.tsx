import { useState, useEffect, useRef } from "preact/hooks";
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
  const [maxTime, setMaxTime] = useState(150); // Max time for each player in seconds
  const [timeX, setTimeX] = useState(maxTime); // Initial time for player X
  const [timeO, setTimeO] = useState(maxTime); // Initial time for player O
  const [currentPlayer, setCurrentPlayer] = useState<"X" | "O">("X");
  const [winState, setWinState] = useState<"X" | "O" | null>(null); // Track the winner
  const [timerActive, setTimerActive] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8000/ws"); // Replace with your WebSocket server URL
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connection established");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Handle incoming WebSocket messages
      if (data.type === "state") {
        setPloys(data.ploys);
        setCurrentPlayer(data.currentPlayer);
        setTimeX(data.timeX);
        setTimeO(data.timeO);
        setWinState(data.winner);
      } else if (data.type === "move") {
        setPloys(data.ploys);
        setCurrentPlayer(data.currentPlayer);
        setTimeX(data.timeX);
        setTimeO(data.timeO);
      } else if (data.type === "win") {
        setWinState(data.winner);
        setTimerActive(false);
      } else if (data.type === "reset") {
        handleReset();
      }
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    return () => {
      socket.close();
    };
  }, []);

  const sendMessage = (message: object) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  };

  const handleMove = (index: number, xMove: string | null, oMove: string | null) => {
    if (winState) return; // Prevent moves if the game is over

    const newPloys = [...ploys];
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

    setPloys(newPloys);

    // Switch the current player
    const nextPlayer = currentPlayer === "X" ? "O" : "X";
    setCurrentPlayer(nextPlayer);

    // Send move to the server
    sendMessage({
      type: "move",
      ploys: newPloys,
      currentPlayer: nextPlayer,
      timeX,
      timeO,
    });
  };

  const handleWin = (winner: "X" | "O") => {
    setWinState(winner);
    setTimerActive(false);

    // Notify the server about the win
    sendMessage({
      type: "win",
      winner,
    });
  };

  const handleReset = () => {
    setPloys([]);
    setTimeX(maxTime); // Reset to initial time
    setTimeO(maxTime); // Reset to initial time
    setCurrentPlayer("X");
    setTimerActive(false);
    setWinState(null); // Clear the winner

    // Notify the server about the reset
    sendMessage({
      type: "reset",
    });
  };

  return (
    <div class="flex flex-col sm:flex-row justify-center items-start sm:space-x-4">
      <Board
        moveHook={handleMove}
        resetHook={handleReset}
        winHook={handleWin}
        winState={winState}
        currentPlayer={currentPlayer}
        ploys={ploys}
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