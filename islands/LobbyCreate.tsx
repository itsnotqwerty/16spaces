import { useState } from "preact/hooks";
import { TIME_CONTROLS } from "../lib/game/index.ts";

export default function LobbyCreate() {
  const [privacy, setPrivacy] = useState<"private" | "public">("private");
  const [rated, setRated] = useState(false);
  const [timeControlId, setTimeControlId] = useState("classic");
  const [colorAssignment, setColorAssignment] = useState<
    "random" | "host_x" | "host_o"
  >("random");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/lobbies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          privacy,
          rated,
          timeControlId,
          colorAssignment,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Failed to create lobby.");
        return;
      }
      globalThis.location.href = `/l/${data.lobby.code}`;
    } catch {
      setMessage("Failed to create lobby.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="rounded border border-white/10 bg-white/5 p-4 space-y-4 max-w-xl">
      <label class="block space-y-1">
        <span class="text-xs text-gray-300">Time control</span>
        <select
          value={timeControlId}
          onChange={(e) =>
            setTimeControlId((e.currentTarget as HTMLSelectElement).value)}
          class="w-full rounded bg-[#23211d] border border-white/20 px-3 py-2 text-white"
        >
          {Object.values(TIME_CONTROLS).map((control) => (
            <option key={control.id} value={control.id}>
              {control.label}
            </option>
          ))}
        </select>
      </label>

      <label class="block space-y-1">
        <span class="text-xs text-gray-300">Privacy</span>
        <select
          value={privacy}
          onChange={(e) =>
            setPrivacy(
              (e.currentTarget as HTMLSelectElement).value as
                | "private"
                | "public",
            )}
          class="w-full rounded bg-[#23211d] border border-white/20 px-3 py-2 text-white"
        >
          <option value="private">Private (join by code)</option>
          <option value="public">Public (listed)</option>
        </select>
      </label>

      <label class="block space-y-1">
        <span class="text-xs text-gray-300">Your pieces</span>
        <select
          value={colorAssignment}
          onChange={(e) =>
            setColorAssignment(
              (e.currentTarget as HTMLSelectElement).value as
                | "random"
                | "host_x"
                | "host_o",
            )}
          class="w-full rounded bg-[#23211d] border border-white/20 px-3 py-2 text-white"
        >
          <option value="random">Random</option>
          <option value="host_x">I play X (first)</option>
          <option value="host_o">I play O</option>
        </select>
      </label>

      <label class="flex items-center gap-2 text-sm text-gray-200">
        <input
          type="checkbox"
          checked={rated}
          onChange={(e) => setRated(e.currentTarget.checked)}
        />
        Rated game (affects ELO)
      </label>

      <button
        type="button"
        disabled={busy}
        onClick={create}
        class="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-60"
      >
        Create Lobby
      </button>

      {message && <p class="text-sm text-rose-300">{message}</p>}
    </div>
  );
}
