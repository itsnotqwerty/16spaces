import { useState } from "preact/hooks";
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

  const handleMove = (index: number, xMove: string | null, oMove: string | null) => {
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
        newPloys.push({index, xMove, oMove });
      }
      return newPloys;
    });
  };

  return (
    <div class="flex flex-row items-start space-x-4">
      <Board moveHook={handleMove}/>
      <Sidebar playerX={playerX} playerO={playerO} ploys={ploys} />
    </div>
  );
}