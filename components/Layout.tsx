import type { ComponentChildren } from "preact";

type LayoutProps = {
  children: ComponentChildren;
};

export default function Layout({ children }: LayoutProps) {
  return (
    <div class="min-h-screen bg-[#161512] text-white">
      <header class="border-b border-white/10">
        <div class="max-w-screen-lg mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" class="text-2xl font-bold tracking-tight">16spaces</a>
          <nav class="flex items-center gap-4 text-sm">
            <a href="/" class="hover:text-gray-300">Play</a>
            <a href="/local" class="hover:text-gray-300">Local</a>
            <a href="/leaderboard" class="hover:text-gray-300">Leaderboard</a>
            <a href="/login" class="hover:text-gray-300">Sign in</a>
            <a href="/signup" class="hover:text-gray-300">Sign up</a>
          </nav>
        </div>
      </header>

      <main class="max-w-screen-lg mx-auto px-4 py-8">
        {children}
      </main>

      <footer class="max-w-screen-lg mx-auto px-4 pb-8 text-center text-sm text-gray-300">
        <p>©2025 Samuel Roux - All rights reserved</p>
        <a href="https://github.com/itsnotqwerty/16spaces/" class="text-blue-400 hover:text-blue-300">
          View the Code
        </a>
      </footer>
    </div>
  );
}