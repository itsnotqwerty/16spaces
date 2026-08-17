import { Handlers, PageProps } from "$fresh/server.ts";
import Layout from "../components/Layout.tsx";
import AuthForm from "../islands/AuthForm.tsx";
import type { AppState } from "./_middleware.ts";

type LoginData = {
  isAuthenticated: boolean;
};

export const handler: Handlers<LoginData, AppState> = {
  GET(_req, ctx) {
    return ctx.render({ isAuthenticated: Boolean(ctx.state.user) });
  },
};

export default function LoginPage({ data }: PageProps<LoginData>) {
  return (
    <Layout isAuthenticated={data.isAuthenticated}>
      <div class="space-y-4 max-w-2xl flex flex-col items-center justify-center">
        <h1 class="text-3xl font-bold">Sign in</h1>
        <p class="text-gray-300">
          Sign in with email/password, request a magic link, or start as a
          guest.
        </p>
        <AuthForm mode="login" />
      </div>
    </Layout>
  );
}
