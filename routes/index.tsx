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
          Update: 16spaces is now in open beta! You can play unrated games without signing in, but you will need to create an account to play rated games. Sign up or log in to get started.
        </p>
        <HomeMenu />
      </div>
    </Layout>
  );
}
