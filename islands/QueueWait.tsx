import { useEffect, useMemo, useState } from "preact/hooks";

type QueueTicket = {
  ticketId: string;
  rated: boolean;
  timeControlId: string;
  status: "idle" | "queued" | "matched";
  matchId: string | null;
  createdAt: number;
  updatedAt: number;
};

type QueueStatusResponse = {
  status: "idle" | "queued" | "matched";
  ticket: QueueTicket | null;
  match: {
    matchId: string;
    rated: boolean;
    result: "a_win" | "b_win" | "draw" | null;
    ratingUpdate: {
      deltaA: number;
      deltaB: number;
      profileA: { rating: number };
      profileB: { rating: number };
    } | null;
  } | null;
  rating: {
    rating: number;
    ratedGames: number;
    wins: number;
    losses: number;
    draws: number;
  };
};

export default function QueueWait() {
  const [timeControlId, setTimeControlId] = useState("classic");
  const [rated, setRated] = useState(false);
  const [ratedEligible, setRatedEligible] = useState(true);
  const [status, setStatus] = useState<QueueStatusResponse["status"]>("idle");
  const [ticket, setTicket] = useState<QueueTicket | null>(null);
  const [match, setMatch] = useState<QueueStatusResponse["match"]>(null);
  const [rating, setRating] = useState<QueueStatusResponse["rating"] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const queueStartedAt = useMemo(() => {
    if (!ticket) {
      return null;
    }
    return new Date(ticket.createdAt);
  }, [ticket]);

  async function refreshStatus() {
    const response = await fetch("/api/matchmaking/status", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "status_failed");
    }

    setStatus(data.status);
    setTicket(data.ticket);
    setMatch(data.match ?? null);
    setRating(data.rating ?? null);
  }

  async function joinQueue() {
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/matchmaking/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ rated, timeControlId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Failed to join queue.");
        return;
      }

      setTicket(data.ticket);
      setStatus(data.ticket?.status ?? "queued");
      setMatch(data.match ?? null);
      setMessage("Joined queue.");
    } catch {
      setMessage("Failed to join queue.");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelQueue() {
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/matchmaking/cancel", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Failed to cancel queue.");
        return;
      }

      setStatus("idle");
      setTicket(null);
      setMatch(null);
      setMessage(data.cancelled ? "Queue cancelled." : "No queue ticket to cancel.");
    } catch {
      setMessage("Failed to cancel queue.");
    } finally {
      setSubmitting(false);
    }
  }

  async function completeMatch(result: "win" | "loss" | "draw") {
    if (!ticket?.matchId) {
      setMessage("No active match to complete.");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/matchmaking/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ matchId: ticket.matchId, result }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Failed to complete match.");
        return;
      }

      setMessage("Match completed.");
      await refreshStatus();
    } catch {
      setMessage("Failed to complete match.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.json())
      .then((data) => {
        if (typeof data?.ratedEligible === "boolean") {
          setRatedEligible(data.ratedEligible);
          if (!data.ratedEligible) {
            setRated(false);
          }
        }
      })
      .catch(() => {
        // No-op: enqueue endpoint also enforces this server-side.
      });

    refreshStatus().catch(() => {
      setMessage("Unable to load queue status.");
    });
  }, []);

  useEffect(() => {
    if (status !== "queued") {
      return;
    }

    const timer = setInterval(() => {
      refreshStatus().catch(() => {
        setMessage("Unable to refresh queue status.");
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [status]);

  return (
    <div class="rounded border border-white/10 bg-white/5 p-4 space-y-4">
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="space-y-1">
          <span class="block text-xs text-gray-300">Time control</span>
          <select
            value={timeControlId}
            onChange={(e) => setTimeControlId((e.currentTarget as HTMLSelectElement).value)}
            disabled={status === "queued" || submitting}
            class="w-full rounded bg-[#23211d] border border-white/20 px-3 py-2 text-white"
          >
            <option value="classic">Classic 2:30</option>
            <option value="3+0">3+0</option>
            <option value="3+2">3+2</option>
            <option value="5+0">5+0</option>
          </select>
        </label>

        <label class="space-y-1">
          <span class="block text-xs text-gray-300">Mode</span>
          <select
            value={rated ? "rated" : "unrated"}
            onChange={(e) => setRated((e.currentTarget as HTMLSelectElement).value === "rated")}
            disabled={status === "queued" || submitting}
            class="w-full rounded bg-[#23211d] border border-white/20 px-3 py-2 text-white"
          >
            <option value="unrated">Unrated</option>
            <option value="rated" disabled={!ratedEligible}>Rated</option>
          </select>
        </label>
      </div>

      {!ratedEligible && (
        <p class="text-xs text-amber-200">
          Rated queue requires a non-guest account with a non-placeholder username.
        </p>
      )}

      <div class="flex items-center gap-3">
        {status === "idle"
          ? (
            <button
              type="button"
              onClick={joinQueue}
              disabled={submitting}
              class="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-60"
            >
              Join Queue
            </button>
          )
          : status === "queued"
          ? (
            <button
              type="button"
              onClick={cancelQueue}
              disabled={submitting}
              class="px-3 py-2 rounded bg-white/10 hover:bg-white/20 disabled:opacity-60"
            >
              Cancel Queue
            </button>
          )
          : null}

        <span class="text-sm text-gray-300">
          {status === "idle" && "Not queued"}
          {status === "queued" && "Searching for an opponent..."}
          {status === "matched" && "Match found. Submit result to apply ELO."}
        </span>
      </div>

      {status === "matched" && ticket?.matchId && (
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => completeMatch("win")}
            disabled={submitting}
            class="px-3 py-2 rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60"
          >
            Report Win
          </button>
          <button
            type="button"
            onClick={() => completeMatch("draw")}
            disabled={submitting}
            class="px-3 py-2 rounded bg-white/10 hover:bg-white/20 disabled:opacity-60"
          >
            Report Draw
          </button>
          <button
            type="button"
            onClick={() => completeMatch("loss")}
            disabled={submitting}
            class="px-3 py-2 rounded bg-rose-700 hover:bg-rose-600 disabled:opacity-60"
          >
            Report Loss
          </button>
        </div>
      )}

      {ticket && (
        <div class="text-xs text-gray-400 space-y-1">
          <p>Ticket: {ticket.ticketId}</p>
          <p>Queue: {ticket.rated ? "rated" : "unrated"} / {ticket.timeControlId}</p>
          {queueStartedAt && <p>Joined: {queueStartedAt.toLocaleTimeString()}</p>}
          {ticket.matchId && <p>Match ID: {ticket.matchId}</p>}
        </div>
      )}

      {match?.ratingUpdate && (
        <div class="text-xs text-emerald-200 space-y-1">
          <p>ELO updated for rated match.</p>
          <p>
            Deltas: A {match.ratingUpdate.deltaA > 0 ? "+" : ""}{match.ratingUpdate.deltaA}, B
            {" "}
            {match.ratingUpdate.deltaB > 0 ? "+" : ""}{match.ratingUpdate.deltaB}
          </p>
        </div>
      )}

      {rating && (
        <div class="text-xs text-gray-300 space-y-1">
          <p>
            Rating: {rating.rating} ({rating.wins}-{rating.losses}-{rating.draws})
          </p>
          <p>Rated games: {rating.ratedGames}</p>
        </div>
      )}

      {message && <p class="text-sm text-gray-200">{message}</p>}
    </div>
  );
}
