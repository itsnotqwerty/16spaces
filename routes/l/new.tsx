import { Handlers, PageProps } from "$fresh/server.ts";
import Layout from "../../components/Layout.tsx";
import LobbyCreate from "../../islands/LobbyCreate.tsx";
import type { AppState } from "../_middleware.ts";

type LobbyData = {
  isAuthenticated: boolean;
};

export const handler: Handlers<LobbyData, AppState> = {
  GET(_req, ctx) {
    return ctx.render({ isAuthenticated: Boolean(ctx.state.user) });
  },
};

export default function CreateLobbyPage({ data }: PageProps<LobbyData>) {
  return (
    <Layout isAuthenticated={data.isAuthenticated}>
      <div class="space-y-4 max-w-2xl">
        <h1 class="text-3xl font-bold">Create Lobby</h1>
        <p class="text-gray-300">
          Pick your options, then share the lobby code with a friend.
        </p>
        {data.isAuthenticated
          ? <LobbyCreate />
          : (
            <div class="rounded border border-white/10 bg-white/5 p-4">
              <a
                href="/login"
                class="inline-block px-3 py-2 rounded bg-blue-600 hover:bg-blue-500"
              >
                Sign in to continue
              </a>
            </div>
          )}
      </div>
    </Layout>
  );
}
