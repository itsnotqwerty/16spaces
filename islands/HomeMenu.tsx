import { useEffect, useState } from "preact/hooks";
import { shouldShowAiTutorial } from "../lib/tutorial.ts";

type MenuButtonProps = {
  href?: string;
  label: string;
  description: string;
  disabled?: boolean;
  highlight?: boolean;
};

function MenuButton(
  { href, label, description, disabled = false, highlight = false }: MenuButtonProps,
) {
  const highlightClasses = highlight
    ? "ring-4 ring-yellow-300 ring-offset-2 ring-offset-[#171612] shadow-[0_0_0_3px_rgba(250,204,21,0.35)]"
    : "";

  const content = (
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-lg font-semibold">{label}</p>
        <p class="text-sm text-gray-300 mt-1">{description}</p>
      </div>
      {highlight && (
        <span class="shrink-0 rounded-full bg-yellow-300 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-black">
          Try the Tutorial
        </span>
      )}
    </div>
  );

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        class={`w-full text-left p-4 rounded border border-white/10 bg-white/5 opacity-60 cursor-not-allowed ${highlightClasses}`}
      >
        {content}
      </button>
    );
  }

  return (
    <a
      href={href}
      class={`block w-full p-4 rounded border border-white/10 bg-white/5 hover:bg-white/10 transition ${highlightClasses}`}
    >
      {content}
    </a>
  );
}

export default function HomeMenu() {
  const [showAiTutorialHighlight, setShowAiTutorialHighlight] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setShowAiTutorialHighlight(shouldShowAiTutorial(globalThis.localStorage));
  }, []);

  return (
    <section class="space-y-4">
      <MenuButton
        href="/local"
        label="Play Local"
        description="Hot-seat mode in one browser with the shared game engine."
      />
      <MenuButton
        href="/queue?rated=0"
        label="Play Unrated"
        description="Join the unrated queue flow."
      />
      <MenuButton
        href="/queue?rated=1"
        label="Play Rated"
        description="Join the rated queue flow."
      />
      <MenuButton
        href="/ai"
        label="Play vs AI"
        description="Practice against the computer with five difficulty levels."
        highlight={showAiTutorialHighlight}
      />
      <MenuButton
        href="/l/new"
        label="Create Lobby"
        description="Create a private or public room and share the code with a friend."
      />
      <MenuButton
        href="/l/public"
        label="Browse Lobbies"
        description="View public rooms that are available to join"
      />
    </section>
  );
}
