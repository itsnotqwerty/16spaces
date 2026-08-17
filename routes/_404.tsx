import { Head } from "$fresh/runtime.ts";
import Layout from "../components/Layout.tsx";

export default function Error404() {
  return (
    <Layout>
      <Head>
        <title>404 - Page not found</title>
      </Head>
      <div class="max-w-screen-md mx-auto py-8 text-center">
        <h1 class="text-5xl font-bold">404</h1>
        <p class="my-4 text-gray-300">The page you were looking for does not exist.</p>
        <a href="/" class="inline-block mt-2 px-4 py-2 rounded bg-white/10 hover:bg-white/20">
          Go back home
        </a>
      </div>
    </Layout>
  );
}
