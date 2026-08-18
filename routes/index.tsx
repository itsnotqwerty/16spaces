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
          <b>16spaces</b> is a lightweight web game of strategy and tactics 
          inspired by the ancient Roman game of <i>terni lapilli</i> (three
          stones). The game is won when a player aligns their stones horizontally, 
          vertically, or diagonally across the board or forces their opponent 
          to run out of time. Players are additionally capped on how many stones 
          that they can place (by default 5 on a 4x4 board). Instead of placing 
          more stones, you move your already placed pieces to adjacent empty squares.
        </p>
        <HomeMenu />
        <p class="text-gray-300 max-w-2xl">
          Update: 16spaces is now in open beta! You can play unrated games
          without signing in, but you will need to create an account to play 
          rated games. Sign up or log in to get started.
        </p>
      </div>
    </Layout>
  );
}
