import { Handlers, PageProps } from "$fresh/server.ts";
import Layout from "../components/Layout.tsx";
import AiGame from "../islands/AiGame.tsx";
import type { AppState } from "./_middleware.ts";

type AiData = {
  isAuthenticated: boolean;
};

export const handler: Handlers<AiData, AppState> = {
  GET(_req, ctx) {
    return ctx.render({ isAuthenticated: Boolean(ctx.state.user) });
  },
};

export default function AiPage({ data }: PageProps<AiData>) {
  return (
    <Layout isAuthenticated={data.isAuthenticated}>
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
