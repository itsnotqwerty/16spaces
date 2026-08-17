import { Handlers, PageProps } from "$fresh/server.ts";
import Layout from "../components/Layout.tsx";
import AuthForm from "../islands/AuthForm.tsx";
import type { AppState } from "./_middleware.ts";

type SignupData = {
  isAuthenticated: boolean;
};

export const handler: Handlers<SignupData, AppState> = {
  GET(_req, ctx) {
    return ctx.render({ isAuthenticated: Boolean(ctx.state.user) });
  },
};

export default function SignupPage({ data }: PageProps<SignupData>) {
  return (
    <Layout isAuthenticated={data.isAuthenticated}>
      <div class="space-y-4 max-w-2xl flex flex-col items-center justify-center">
        <h1 class="text-3xl font-bold">Create account</h1>
        <p class="text-gray-300">
          Create an account, choose a username, and prepare for rated play.
        </p>
        <AuthForm mode="signup" />
      </div>
    </Layout>
  );
}
