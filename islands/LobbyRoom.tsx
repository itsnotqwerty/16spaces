import { useEffect, useState } from "preact/hooks";

type LobbyMember = {
  userId: string;
  username: string | null;
  isHost: boolean;
  ready: boolean;
};

type Lobby = {
  code: string;
  hostUserId: string;
  privacy: "public" | "private";
  status: "open" | "started" | "cancelled" | "expired";
  options: {
    rated: boolean;
    boardSize: number;
    timeControlId: string;
    colorAssignment: "random" | "host_x" | "host_o";
  };
  gameId: string | null;
  members: LobbyMember[];
};

type LobbyPeek = {
  code: string;
  status: Lobby["status"];
  options: Lobby["options"];
  memberCount: number;
  full: boolean;
};

export default function LobbyRoom(
  { code, userId }: { code: string; userId: string },
) {
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [peek, setPeek] = useState<LobbyPeek | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isMember = lobby !== null &&
    lobby.members.some((m) => m.userId === userId);
  const me = lobby?.members.find((m) => m.userId === userId) ?? null;
  const isHost = lobby !== null && lobby.hostUserId === userId;

  async function refresh() {
    try {
      const response = await fetch(`/api/lobbies/${code}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await response.json();
      if (!response.ok) {
        setNotFound(true);
        return;
      }
      if (data.lobby.members) {
        setLobby(data.lobby);
        setPeek(null);
      } else {
        setPeek(data.lobby);
        setLobby(null);
      }
    } catch {
      // transient; next poll retries
    }
  }

  async function post(path: string, body?: unknown) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/lobbies/${code}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "request_failed");
      } else if (data.lobby?.members) {
        setLobby(data.lobby);
      }
    } finally {
      setBusy(false);
    }
  }

  async function cancelLobby() {
    setBusy(true);
    try {
      await fetch(`/api/lobbies/${code}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      globalThis.location.href = "/";
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 2000);
    const heartbeat = setInterval(() => {
      fetch(`/api/lobbies/${code}/heartbeat`, {
        method: "POST",
        credentials: "same-origin",
      }).catch(() => {});
    }, 15000);
    return () => {
      clearInterval(poll);
      clearInterval(heartbeat);
    };
  }, [code]);

  useEffect(() => {
    if (lobby?.status === "started" && lobby.gameId && isMember) {
      globalThis.location.href = `/g/${lobby.gameId}`;
    }
  }, [lobby?.status, lobby?.gameId, isMember]);

  if (notFound) {
    return (
      <p class="text-gray-300">This lobby does not exist or has expired.</p>
    );
  }

  if (!lobby && !peek) {
    return <p class="text-gray-300">Loading lobby…</p>;
  }

  if (!isMember) {
    return (
      <div class="rounded border border-white/10 bg-white/5 p-4 space-y-3">
        <p class="text-gray-200">
          {peek?.full
            ? "This lobby is full."
            : "You have been invited to this lobby."}
        </p>
        {peek && !peek.full && peek.status === "open" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => post("/join")}
            class="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-60"
          >
            Join Lobby
          </button>
        )}
        {message && <p class="text-sm text-rose-300">{message}</p>}
      </div>
    );
  }

  const canStart = isHost && lobby !== null &&
    lobby.members.length === 2 &&
    lobby.members.every((m) => m.ready || m.isHost);

  return (
    <div class="rounded border border-white/10 bg-white/5 p-4 space-y-4 max-w-xl">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-400">Share code</p>
          <p class="text-2xl font-mono font-bold tracking-widest">
            {lobby?.code}
          </p>
        </div>
        <div class="text-sm text-gray-300 text-right">
          <p>
            {lobby?.options.timeControlId} ·{" "}
            {lobby?.options.boardSize}×{lobby?.options.boardSize} {" "}
            {lobby?.options.rated ? "Rated" : "Casual"}
          </p>
          <p>{lobby?.privacy}</p>
        </div>
      </div>

      <div class="space-y-2">
        {lobby?.members.map((m) => (
          <div
            key={m.userId}
            class="flex items-center justify-between rounded bg-white/5 px-3 py-2"
          >
            <span>
              {m.username ?? "Guest"} {m.userId === userId && "(you)"}
              {m.isHost && (
                <span class="ml-2 text-xs text-amber-300">
                  host
                </span>
              )}
            </span>
            <span class={m.ready ? "text-emerald-300" : "text-gray-400"}>
              {m.isHost ? "—" : m.ready ? "Ready" : "Not ready"}
            </span>
          </div>
        ))}
        {lobby && lobby.members.length < 2 && (
          <p class="text-sm text-gray-400">Waiting for an opponent to join…</p>
        )}
      </div>

      <div class="flex flex-wrap gap-2">
        {!isHost && (
          <button
            type="button"
            disabled={busy}
            onClick={() => post("/ready", { ready: !(me?.ready ?? false) })}
            class="px-3 py-2 rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60"
          >
            {me?.ready ? "Unready" : "Ready"}
          </button>
        )}
        {isHost && lobby?.status === "open" && (
          <button
            type="button"
            disabled={busy || !canStart}
            onClick={() => post("/start")}
            class="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-60"
          >
            Start Game
          </button>
        )}
        {isHost && (
          <button
            type="button"
            disabled={busy}
            onClick={cancelLobby}
            class="px-3 py-2 rounded bg-white/10 hover:bg-white/20 disabled:opacity-60"
          >
            Cancel Lobby
          </button>
        )}
        {!isHost && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              post("/leave").then(() => {
                globalThis.location.href = "/";
              });
            }}
            class="px-3 py-2 rounded bg-white/10 hover:bg-white/20 disabled:opacity-60"
          >
            Leave
          </button>
        )}
      </div>

      {message && <p class="text-sm text-rose-300">{message}</p>}
    </div>
  );
}
