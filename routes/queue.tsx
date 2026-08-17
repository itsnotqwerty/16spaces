import Layout from "../components/Layout.tsx";

export default function QueuePage() {
  return (
    <Layout>
      <div class="space-y-4 max-w-2xl">
        <h1 class="text-3xl font-bold">Queue</h1>
        <p class="text-gray-300">
          Matchmaking queue UI is scaffolded and will be connected in the next
          roadmap phases.
        </p>
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
      </div>
    </Layout>
  );
}
