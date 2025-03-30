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
  timeX: number; // Remaining time for player X in seconds
  timeO: number; // Remaining time for player O in seconds
  winState: "X" | "O" | null; // The winner of the game
};

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export default function Sidebar({ playerX, playerO, ploys, timeX, timeO, winState }: SidebarProps) {
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
            <div
            class={`text-xs ${
              timeX < 20 ? "text-red-600" : "text-gray-600"
            }`}
            >
            Time: {formatTime(timeX)}
            </div>
        </div>
        <div>
          <span
            class={`inline-block w-2 h-2 rounded-full mr-1 ${
              playerO.isConnected ? "bg-green-500" : "bg-gray-400"
            }`}
          ></span>
          <span class="font-bold">O:</span> {playerO.name} ({playerO.elo})
          <div
          class={`text-xs ${
            timeO < 20 ? "text-red-600" : "text-gray-600"
          }`}
          >
          Time: {formatTime(timeO)}
          </div>
        </div>
      </div>

      {/* Winner Announcement */}
      {winState && (
        <div class="mt-4 p-2 bg-green-100 text-green-800 text-center rounded">
          Player {winState} wins!
        </div>
      )}

      {/* Ploys */}
      <div>
        <h2 class="font-bold mb-2">Moves</h2>
        <div ref={movesContainerRef} class="max-h-48 overflow-y-auto">
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
                  index={ploy.index + 1} // Display 1-based index
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