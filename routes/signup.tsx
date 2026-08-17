import Layout from "../components/Layout.tsx";
import AuthForm from "../islands/AuthForm.tsx";

export default function SignupPage() {
  return (
    <Layout>
      <div class="space-y-4 max-w-2xl">
        <h1 class="text-3xl font-bold">Create account</h1>
        <p class="text-gray-300">
          Create an account, choose a username, and prepare for rated play.
        </p>
        <AuthForm mode="signup" />
      </div>
    </Layout>
  );
}
