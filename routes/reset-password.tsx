import { Handlers, PageProps } from "$fresh/server.ts";
import Layout from "../components/Layout.tsx";
import ResetPasswordForm from "../islands/ResetPasswordForm.tsx";
import type { AppState } from "./_middleware.ts";

type ResetPasswordData = {
  isAuthenticated: boolean;
};

export const handler: Handlers<ResetPasswordData, AppState> = {
  GET(_req, ctx) {
    return ctx.render({ isAuthenticated: Boolean(ctx.state.user) });
  },
};

export default function ResetPasswordPage(
  { data }: PageProps<ResetPasswordData>,
) {
  return (
    <Layout isAuthenticated={data.isAuthenticated}>
      <div class="space-y-4 max-w-2xl flex flex-col items-center justify-center">
        <h1 class="text-3xl font-bold">Reset password</h1>
        <p class="text-gray-300">Choose a new password for your account.</p>
        <ResetPasswordForm />
      </div>
    </Layout>
  );
}
