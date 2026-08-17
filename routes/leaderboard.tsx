import type { Handlers, PageProps } from "$fresh/server.ts";
import Layout from "../components/Layout.tsx";
import { allFlags } from "../lib/flags.ts";
import type { AppState } from "./_middleware.ts";

type LeaderboardData = {
  ratedEnabled: boolean;
  isAuthenticated: boolean;
};

export const handler: Handlers<LeaderboardData, AppState> = {
  GET(_req, ctx) {
    return ctx.render({
      ratedEnabled: allFlags().FEATURE_RATED,
      isAuthenticated: Boolean(ctx.state.user),
    });
  },
};

export default function LeaderboardPage({ data }: PageProps<LeaderboardData>) {
  return (
    <Layout isAuthenticated={data.isAuthenticated}>
      <div class="space-y-4 max-w-2xl">
        <h1 class="text-3xl font-bold">Leaderboard</h1>
        <p class="text-gray-300">
          Leaderboard data will appear when rated multiplayer launches.
        </p>
        <div class="rounded border border-white/10 bg-white/5 p-4">
          <p class="text-sm text-gray-300">Rated feature flag</p>
          <p class="text-lg font-semibold">
            {data.ratedEnabled ? "Enabled" : "Disabled"}
          </p>
        </div>
      </div>
    </Layout>
  );
}
