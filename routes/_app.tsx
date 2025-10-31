import { type PageProps } from "$fresh/server.ts";
export default function App({ Component }: PageProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="google-adsense-account" content="ca-pub-2088911413615580" />
        <title>16spaces</title>
        <link rel="stylesheet" href="/styles.css" />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2088911413615580" crossorigin="anonymous"></script>
        <title>16spaces | Multiplayer Web Game</title>
        
        <meta name="title" content="16spaces | Multiplayer Web Game" />
        <meta name="description" content="16spaces is a web game and variant of Tic-Tac-Toe" />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://16space.deno.dev" />
        <meta property="og:title" content="16spaces | Multiplayer Web Game" />
        <meta property="og:description" content="16spaces is a web game and variant of Tic-Tac-Toe" />
        <meta property="og:image" content="/embed.png" />

        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://16space.deno.dev" />
        <meta property="twitter:title" content="16spaces | Multiplayer Web Game" />
        <meta property="twitter:description" content="16spaces is a web game and variant of Tic-Tac-Toe" />
        <meta property="twitter:image" content="/embed.png" />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
