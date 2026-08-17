import { Handlers, PageProps } from "$fresh/server.ts";
import Layout from "../components/Layout.tsx";
import HomeMenu from "../islands/HomeMenu.tsx";
import type { AppState } from "./_middleware.ts";

type HomeData = {
  isAuthenticated: boolean;
};

export const handler: Handlers<HomeData, AppState> = {
  GET(_req, ctx) {
    return ctx.render({ isAuthenticated: Boolean(ctx.state.user) });
  },
};

export default function Home({ data }: PageProps<HomeData>) {
  return (
    <Layout isAuthenticated={data.isAuthenticated}>
      <div class="space-y-6">
        <h1 class="text-4xl font-bold">Welcome to 16spaces</h1>
        <p class="text-gray-300 max-w-2xl">
          The multiplayer transition is underway. Start with local hot-seat now,
          and online play, auth, lobbies, and matchmaking will roll out in
          phases.
        </p>
        <HomeMenu />
      </div>
    </Layout>
  );
}
