import { useEffect, useRef } from "preact/hooks";
import Ploy from "../components/Ploy.tsx";

type PlayerInfo = {
  name: string;
  elo: number;
  isConnected: boolean;
};

type IPloy = {
  index: number; // e.g., 0, 1, 2, etc.
  xMove: string | null; // e.g., "A1"
  oMove: string | null; // e.g., "B2"
};

type SidebarProps = {
  playerX: PlayerInfo;
  playerO: PlayerInfo;
  ploys: IPloy[];
};

export default function Sidebar({ playerX, playerO, ploys }: SidebarProps) {
  const movesContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to the bottom whenever ploys are updated
  useEffect(() => {
    if (movesContainerRef.current) {
      movesContainerRef.current.scrollTop = movesContainerRef.current.scrollHeight;
    }
  }, [ploys]);

  return (
    <div class="w-48 p-2 border-l bg-gray-50 text-sm">
      {/* Player Information */}
      <div class="mb-4">
        <h2 class="font-bold mb-2">Players</h2>
        <div class="mb-2">
          <span
            class={`inline-block w-2 h-2 rounded-full mr-1 ${
              playerX.isConnected ? "bg-green-500" : "bg-gray-400"
            }`}
          ></span>
          <span class="font-bold">X:</span> {playerX.name} ({playerX.elo})
        </div>
        <div>
          <span
            class={`inline-block w-2 h-2 rounded-full mr-1 ${
              playerO.isConnected ? "bg-green-500" : "bg-gray-400"
            }`}
          ></span>
          <span class="font-bold">O:</span> {playerO.name} ({playerO.elo})
        </div>
      </div>

      {/* Ploys */}
      <div>
        <h2 class="font-bold mb-2">Moves</h2>
        <div class="max-h-48 overflow-y-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b">
                <th class="p-1 text-center">#</th>
                <th class="p-1 text-center">X</th>
                <th class="p-1 text-center">O</th>
              </tr>
            </thead>
            <tbody>
              {ploys.map((ploy, index) => (
                <Ploy
                  key={index}
                  index={ploy.index}
                  xMove={ploy.xMove}
                  oMove={ploy.oMove}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}