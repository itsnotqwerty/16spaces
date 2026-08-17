import Layout from "../components/Layout.tsx";
import HomeMenu from "../islands/HomeMenu.tsx";

export default function Home() {
  return (
    <Layout>
      <div class="space-y-6">
        <h1 class="text-4xl font-bold">Welcome to 16spaces</h1>
        <p class="text-gray-300 max-w-2xl">
          The multiplayer transition is underway. Start with local hot-seat now,
          and online play, auth, lobbies, and matchmaking will roll out in phases.
        </p>

        <ins class="adsbygoogle block"
            data-ad-client="ca-pub-2088911413615580"
            data-ad-slot="1847367891"
            data-ad-format="auto"
            data-full-width-responsive="true"></ins>
        <script>
            (adsbygoogle = window.adsbygoogle || []).push({});
        </script>

        <HomeMenu />

        <ins class="adsbygoogle block"
            data-ad-client="ca-pub-2088911413615580"
            data-ad-slot="1847367891"
            data-ad-format="auto"
            data-full-width-responsive="true"></ins>
        <script>
            (adsbygoogle = window.adsbygoogle || []).push({});
        </script>
      </div>
    </Layout>
  );
}
