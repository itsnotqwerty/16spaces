import Layout from "../components/Layout.tsx";
import AuthForm from "../islands/AuthForm.tsx";

export default function LoginPage() {
  return (
    <Layout>
      <div class="space-y-4 max-w-2xl">
        <h1 class="text-3xl font-bold">Sign in</h1>
        <p class="text-gray-300">
          Sign in with email/password, request a magic link, or start as a guest.
        </p>
        <AuthForm mode="login" />
      </div>
    </Layout>
  );
}
