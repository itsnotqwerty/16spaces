import Layout from "../components/Layout.tsx";
import GameManager from "../islands/GameManager.tsx";

export default function Local() {
  return (
    <Layout>
      <div class="space-y-4">
        <h1 class="text-3xl font-bold">Play Local</h1>
        <p class="text-gray-300">
          Two players share this browser. Pick a time preset, then play with X
          moving first. Clocks start after the first move.
        </p>
        <div class="flex items-center justify-center sm:justify-start">
          <GameManager />
        </div>
      </div>
    </Layout>
  );
}