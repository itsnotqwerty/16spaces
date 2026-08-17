import { Handlers, PageProps } from "$fresh/server.ts";
import Layout from "../components/Layout.tsx";
import QueueWait from "../islands/QueueWait.tsx";
import type { AppState } from "./_middleware.ts";

type QueueData = {
  isAuthenticated: boolean;
  matchmakingEnabled: boolean;
};

export const handler: Handlers<QueueData, AppState> = {
  GET(_req, ctx) {
    return ctx.render({
      isAuthenticated: Boolean(ctx.state.user),
      matchmakingEnabled: ctx.state.flags.FEATURE_MATCHMAKING,
    });
  },
};

export default function QueuePage({ data }: PageProps<QueueData>) {
  return (
    <Layout>
      <div class="space-y-4 max-w-2xl">
        <h1 class="text-3xl font-bold">Queue</h1>
        <p class="text-gray-300">
          Join unrated or rated matchmaking pools and track your queue state.
        </p>
        {data.isAuthenticated
          ? (
            <div class="rounded border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
              <p class="text-sm text-emerald-200">Signed in. Queue entry is available for this session.</p>
              <p class="text-xs text-emerald-100/80">
                Queue matching is live for this MVP; game handoff is still a placeholder.
              </p>
            </div>
          )
          : (
            <div class="rounded border border-white/10 bg-white/5 p-4 space-y-3">
              <p class="text-sm text-gray-300">
                To continue now, sign in or start as guest.
              </p>
              <div class="flex gap-3">
                <a href="/login" class="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500">
                  Sign in
                </a>
                <a href="/signup" class="px-3 py-2 rounded bg-white/10 hover:bg-white/20">
                  Create account
                </a>
              </div>
            </div>
          )}
        <div class="rounded border border-white/10 bg-white/5 p-4">
          {data.isAuthenticated
            ? (
              data.matchmakingEnabled
                ? <QueueWait />
                : (
                  <p class="text-sm text-gray-300">
                    Matchmaking is currently disabled by feature flag.
                  </p>
                )
            )
            : (
              <p class="text-sm text-gray-300">
                Sign in or start a guest session to access queue controls.
              </p>
            )}
        </div>
      </div>
    </Layout>
  );
}
