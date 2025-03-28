import { useSignal } from "@preact/signals";
import Board from "../islands/Board.tsx";

export default function Home() {
  const count = useSignal(3);
  return (
    <div class="px-4 py-8 mx-auto bg-[#86efac]">
      <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
        <h1 class="text-4xl font-bold">Welcome to 16spaces</h1>
        <Board />
      </div>
    </div>
  );
}
