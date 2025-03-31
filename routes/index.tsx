import GameManager from "../islands/GameManager.tsx";

export default function Home() {
  return (
    <div class="p-4 mx-auto h-screen bg-[#161512]">
      <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2088911413615580"
        crossorigin="anonymous"></script>
        <ins class="adsbygoogle block"
            data-ad-client="ca-pub-2088911413615580"
            data-ad-slot="1847367891"
            data-ad-format="auto"
            data-full-width-responsive="true"></ins>
        <script>
            (adsbygoogle = window.adsbygoogle || []).push({});
        </script>
      <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
        <h1 class="text-4xl text-white font-bold">Welcome to 16spaces</h1>
        <div class="flex flex-row items-center justify-center w-full mt-4 space-x-4">
          <GameManager />
        </div>
      </div>
      <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2088911413615580"
        crossorigin="anonymous"></script>
        <ins class="adsbygoogle block"
            data-ad-client="ca-pub-2088911413615580"
            data-ad-slot="1847367891"
            data-ad-format="auto"
            data-full-width-responsive="true"></ins>
        <script>
            (adsbygoogle = window.adsbygoogle || []).push({});
        </script>
    </div>
  );
}
