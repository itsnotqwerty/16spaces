import Layout from "../components/Layout.tsx";
import AiGame from "../islands/AiGame.tsx";

export default function AiPage() {
  return (
    <Layout>
      <div class="space-y-4">
        <h1 class="text-3xl font-bold">Play vs AI</h1>
        <p class="text-gray-300">
          You play X and move first. The AI thinks for a few seconds before each
          move — higher levels think a little longer.
        </p>
        <div class="flex items-center justify-center sm:justify-start">
          <AiGame />
        </div>
      </div>
    </Layout>
  );
}
