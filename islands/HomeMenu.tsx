type MenuButtonProps = {
  href?: string;
  label: string;
  description: string;
  disabled?: boolean;
};

function MenuButton({ href, label, description, disabled = false }: MenuButtonProps) {
  if (disabled) {
    return (
      <button
        type="button"
        disabled
        class="w-full text-left p-4 rounded border border-white/10 bg-white/5 opacity-60 cursor-not-allowed"
      >
        <p class="text-lg font-semibold">{label}</p>
        <p class="text-sm text-gray-300 mt-1">{description}</p>
      </button>
    );
  }

  return (
    <a
      href={href}
      class="block w-full p-4 rounded border border-white/10 bg-white/5 hover:bg-white/10 transition"
    >
      <p class="text-lg font-semibold">{label}</p>
      <p class="text-sm text-gray-300 mt-1">{description}</p>
    </a>
  );
}

export default function HomeMenu() {
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
        description="Join the unrated queue flow (scaffold route)."
      />
      <MenuButton
        href="/queue?rated=1"
        label="Play Rated"
        description="Join the rated queue flow (scaffold route)."
      />
      <MenuButton
        href="/l/new"
        label="Create Lobby"
        description="Open the lobby creation flow (scaffold route)."
      />
    </section>
  );
}