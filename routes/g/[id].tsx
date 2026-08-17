import { Handlers, PageProps } from "$fresh/server.ts";
import Layout from "../../components/Layout.tsx";
import OnlineGame from "../../islands/OnlineGame.tsx";
import type { AppState } from "../_middleware.ts";

export const handler: Handlers<unknown, AppState> = {
  GET(_req, ctx) {
    if (!ctx.state.user) {
      return new Response(null, {
        status: 302,
        headers: { location: "/login" },
      });
    }
    return ctx.render();
  },
};

export default function GamePage(props: PageProps) {
  return (
    <Layout isAuthenticated>
      <div class="space-y-4">
        <h1 class="text-3xl font-bold">Match</h1>
        <div class="flex items-center justify-center sm:justify-start">
          <OnlineGame gameId={props.params.id} />
        </div>
      </div>
    </Layout>
  );
}
