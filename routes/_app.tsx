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
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
