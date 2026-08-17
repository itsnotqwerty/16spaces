import { useState } from "preact/hooks";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  mode: AuthMode;
};

export default function AuthForm({ mode }: AuthFormProps) {
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";

  async function submitAuth() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSignup ? { email, password, username } : { email, password },
        ),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Request failed");
      } else {
        setMessage(mode === "login" ? "Signed in." : "Account created.");
      }
    } catch {
      setMessage("Request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function sendMagicLink() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/magic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Magic link failed.");
      } else {
        setMessage("Magic link sent.");
      }
    } catch {
      setMessage("Magic link failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signInAsGuest() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/guest", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Guest sign-in failed.");
      } else {
        setMessage("Guest session started.");
      }
    } catch {
      setMessage("Guest sign-in failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div class="max-w-md rounded border border-white/10 bg-white/5 p-4 space-y-3">
      {isSignup && (
        <div>
          <label class="block text-sm text-gray-300 mb-1" for="username">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onInput={(e) =>
              setUsername((e.currentTarget as HTMLInputElement).value)}
            class="w-full px-3 py-2 rounded bg-[#23211d] border border-white/20 text-white"
          />
          <p class="text-xs text-gray-400 mt-1">
            3-20 chars, starts with a letter, letters/numbers/_ only.
          </p>
        </div>
      )}

      <div>
        <label class="block text-sm text-gray-300 mb-1" for="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)}
          class="w-full px-3 py-2 rounded bg-[#23211d] border border-white/20 text-white"
        />
      </div>

      <div>
        <label class="block text-sm text-gray-300 mb-1" for="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onInput={(e) =>
            setPassword((e.currentTarget as HTMLInputElement).value)}
          class="w-full px-3 py-2 rounded bg-[#23211d] border border-white/20 text-white"
        />
      </div>

      <button
        type="button"
        onClick={submitAuth}
        disabled={isSubmitting || (isSignup && !username.trim())}
        class="w-full px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-60"
      >
        {mode === "login" ? "Sign in" : "Create account"}
      </button>

      {mode === "login" && (
        <>
          <button
            type="button"
            onClick={sendMagicLink}
            disabled={isSubmitting || !email}
            class="w-full px-3 py-2 rounded bg-white/10 hover:bg-white/20 disabled:opacity-60"
          >
            Send magic link
          </button>
          <button
            type="button"
            onClick={signInAsGuest}
            class="w-full px-3 py-2 rounded bg-white/10 hover:bg-white/20"
          >
            Play as guest
          </button>
        </>
      )}

      {message && <p class="text-sm text-gray-200">{message}</p>}
    </div>
  );
}
