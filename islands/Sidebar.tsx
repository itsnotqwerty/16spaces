type PlayerInfo = {
  name: string;
  elo: number;
  isConnected: boolean;
};

type Ploy = {
  xMove: string | null; // e.g., "A1"
  oMove: string | null; // e.g., "B2"
};

type SidebarProps = {
  playerX: PlayerInfo;
  playerO: PlayerInfo;
  ploys: Ploy[];
};

export default function Sidebar({ playerX, playerO, ploys }: SidebarProps) {
  return (
    <div class="w-64 p-4 border-l bg-gray-100">
      {/* Player Information */}
      <div class="mb-6">
        <h2 class="text-lg font-bold mb-2">Players</h2>
        <div class="flex items-center mb-4">
          <span
            class={`w-3 h-3 rounded-full mr-2 ${
              playerX.isConnected ? "bg-green-500" : "bg-gray-400"
            }`}
          ></span>
          <div>
            <p class="font-bold">X: {playerX.name}</p>
            <p class="text-sm text-gray-600">ELO: {playerX.elo}</p>
          </div>
        </div>
        <div class="flex items-center">
          <span
            class={`w-3 h-3 rounded-full mr-2 ${
              playerO.isConnected ? "bg-green-500" : "bg-gray-400"
            }`}
          ></span>
          <div>
            <p class="font-bold">O: {playerO.name}</p>
            <p class="text-sm text-gray-600">ELO: {playerO.elo}</p>
          </div>
        </div>
      </div>

      {/* Ploys */}
      <div>
        <h2 class="text-lg font-bold mb-2">Moves</h2>
        <ul class="space-y-2">
          {ploys.map((ploy, index) => (
            <li key={index} class="p-2 border rounded bg-white">
              <p class="text-sm">
                <span class="font-bold">X:</span> {ploy.xMove || "—"}
              </p>
              <p class="text-sm">
                <span class="font-bold">O:</span> {ploy.oMove || "—"}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}