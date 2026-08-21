import { useState } from "preact/hooks";

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordsMatch = password === confirm;
  const canSubmit = password.length >= 8 && passwordsMatch && !isSubmitting;

  async function submitNewPassword() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Password update failed.");
      } else {
        globalThis.location.assign("/");
      }
    } catch {
      setMessage("Password update failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div class="max-w-md rounded border border-white/10 bg-white/5 p-4 space-y-3">
      <div>
        <label class="block text-sm text-gray-300 mb-1" for="new-password">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onInput={(e) =>
            setPassword((e.currentTarget as HTMLInputElement).value)}
          class="w-full px-3 py-2 rounded bg-[#23211d] border border-white/20 text-white"
        />
        <p class="text-xs text-gray-400 mt-1">At least 8 characters.</p>
      </div>

      <div>
        <label class="block text-sm text-gray-300 mb-1" for="confirm-password">
          Confirm new password
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onInput={(e) =>
            setConfirm((e.currentTarget as HTMLInputElement).value)}
          class="w-full px-3 py-2 rounded bg-[#23211d] border border-white/20 text-white"
        />
        {confirm && !passwordsMatch && (
          <p class="text-xs text-red-400 mt-1">Passwords do not match.</p>
        )}
      </div>

      <button
        type="button"
        onClick={submitNewPassword}
        disabled={!canSubmit}
        class="w-full px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-60"
      >
        Set new password
      </button>

      {message && <p class="text-sm text-gray-200">{message}</p>}
    </div>
  );
}
