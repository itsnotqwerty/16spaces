import { useState } from "preact/hooks";

export default function LogoutButton() {
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      globalThis.location.href = "/";
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      class="hover:text-gray-300 disabled:opacity-60"
    >
      Log out
    </button>
  );
}
