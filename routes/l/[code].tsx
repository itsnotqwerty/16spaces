import { Handlers, PageProps } from "$fresh/server.ts";
import Layout from "../../components/Layout.tsx";
import LobbyRoom from "../../islands/LobbyRoom.tsx";
import type { AppState } from "../_middleware.ts";

type LobbyPageData = {
  userId: string | null;
};

export const handler: Handlers<LobbyPageData, AppState> = {
  GET(_req, ctx) {
    return ctx.render({ userId: ctx.state.user?.id ?? null });
  },
};

export default function LobbyPage(props: PageProps<LobbyPageData>) {
  return (
    <Layout>
      <div class="space-y-4">
        <h1 class="text-3xl font-bold">Lobby</h1>
        {props.data.userId
          ? <LobbyRoom code={props.params.code} userId={props.data.userId} />
          : (
            <div class="rounded border border-white/10 bg-white/5 p-4">
              <a
                href="/login"
                class="inline-block px-3 py-2 rounded bg-blue-600 hover:bg-blue-500"
              >
                Sign in to join this lobby
              </a>
            </div>
          )}
      </div>
    </Layout>
  );
}
