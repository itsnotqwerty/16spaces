import Layout from "../../components/Layout.tsx";

export default function CreateLobbyPage() {
  return (
    <Layout>
      <div class="space-y-4 max-w-2xl">
        <h1 class="text-3xl font-bold">Create Lobby</h1>
        <p class="text-gray-300">
          Lobby creation UI is scaffolded and will be connected to backend
          lobby APIs in the next roadmap phases.
        </p>
        <div class="rounded border border-white/10 bg-white/5 p-4">
          <a href="/login" class="inline-block px-3 py-2 rounded bg-blue-600 hover:bg-blue-500">
            Sign in to continue
          </a>
        </div>
      </div>
    </Layout>
  );
}
