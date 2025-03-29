import Board from "../islands/Board.tsx";
import Sidebar from "../islands/Sidebar.tsx";

export default function Home() {
  return (
    <div class="p-4 mx-auto h-screen bg-[#86efac]">
      <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
        <h1 class="text-4xl font-bold">Welcome to 16spaces</h1>
        <div class="flex flex-row items-center justify-center w-full mt-4 space-x-4">
          <Board />
          <Sidebar playerX={{name: "Anonymous", elo: 1000, isConnected: true}}  playerO={{name: "Anonymous", elo: 1000, isConnected: false}} ploys={[]} />
        </div>
      </div>
    </div>
  );
}
