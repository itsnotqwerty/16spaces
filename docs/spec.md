# 16spaces product and game spec

| Field | Value |
| --- | --- |
| **Status** | Draft / planning |
| **Date** | 2026-08-16 |
| **Live** | https://16space.deno.dev |
| **Companion** | [design.md](design.md) (architecture), [roadmap.md](roadmap.md) (PR plan) |

This is the product + game specification. Implement UX and copy from this file. Technical APIs, schema, and RLS live in [design.md](design.md). No new product decisions beyond the approved design.

---

## What it is

16spaces is a 4×4 two-player abstract game (a Tic-Tac-Toe variant with a stone cap and sliding). Today it is a **single-browser hot-seat prototype** (`routes/index.tsx` → `islands/GameManager.tsx`). The planned product is a complete multiplayer game: auth, private/public lobbies, ELO matchmaking, and host-set options — still a Deno Fresh app on Deno Deploy.

The in-game chrome already pretends at multiplayer (names, ELO 1000, connection dots, move list, clocks). Player O is hardcoded disconnected. That chrome becomes real in later PRs.

---

## Goals (v1)

- Playable **rated** and **unrated** online games, two humans, server-validated rules and clocks.
- **Auth:** email/password, magic link, GitHub, Google, anonymous guest.
- **Profiles:** unique username, created_at, rating, W/L/D, match history. Avatar is initials / generated, not uploaded.
- **Lobbies:** private code/link, public list, host options, ready, presence, host transfer, idle expiry.
- **ELO matchmaking** with expanding window, serverless pairing.
- **Game options** locked at start (time, increment, rated, color, privacy).
- **Local hot-seat** remains on `/local` (and linked from home).
- **Leaderboard** (top 50, min 5 rated games).
- AdSense remains on marketing/home surfaces; no PII in ad slots or client env.

## Non-goals (v1)

- Spectators, tournament brackets, bots, analysis board, puzzles.
- Changing board size, stone cap, adjacency, or win length.
- Draw by repetition / insufficient material / 50-move.
- Account linking / guest upgrade (Phase 2; technically feasible).
- Avatar uploads / Supabase Storage.
- Custom domains, native apps, i18n.
- Chat (presence is enough; chat is a moderation problem).
- Redis, Deno KV as source of truth, Fly machines, Socket.io, long-lived WS game servers.
- Fresh 2 migration.

## Phase 2 (not scheduled in v1 PRs)

- Link guest → email/OAuth (`linkIdentity` / `updateUser`).
- Spectators (read-only RLS + no input).
- Optional in-game chat with report/block.
- Puzzle / daily + bot opponent using `lib/game`.
- Avatar upload.

---

## Full rules

As implemented in `islands/Board.tsx` / `islands/GameManager.tsx`, plus online/draw/ply-cap decisions. The two long diagonals in `checkWin` are **correct** on 4×4 — they are the only 4-long diagonals. Core rules are frozen.

1. Two players, **X** and **O**, on a 4×4 board. Cells are `A1`–`D4` (files A–D left→right, ranks 1–4 top→bottom). `A1` is `(x=0, y=0)` top-left.
2. **X moves first.** First-move-as-O is color assignment, not a separate rule.
3. On your turn, either **place** a stone on an empty cell if you have fewer than **5** stones on the board, or **slide** one of your stones to an **8-adjacent** empty cell (including diagonally). You may not capture or jump.
4. First player to get **four** stones in a straight line (row, column, or either long diagonal) wins.
5. If your clock reaches zero on your turn, you lose (`timeout`).
6. If you have no legal place or slide, you lose (`no_legal_moves`). Do not skip the turn.
7. Online games may be **resigned** or **drawn by agreement**. A game that reaches **400 half-moves** without a 4-in-a-row is a draw (`ply_cap`). This is the only automatic draw. Rated games update ELO except handshake **aborts**.
8. **Local hot-seat:** both colors share one browser; clocks start after the first move (X's opening is untimed).
9. **Online:** clocks start when **both** players have loaded the game (heartbeat). If someone never shows up within **45 seconds**, the game is aborted and does not affect rating.

Notation stays as `Board.tsx` formats it: `A1` for a place, `A1->B2` for a slide.

### Example legal / illegal moves

Starting empty board, X to move:

- `place A1` → legal, notation `A1`
- `place A1` again → illegal (occupied)
- After 5 X stones on the board, further `place` by X → illegal; X must slide
- `slide A1 → B3` → illegal (not adjacent)
- `slide A1 → B2` if B2 empty and A1 is X → legal, notation `A1->B2`
- Four X on `A1..A4` → `four_in_a_row`
- Four X on `B1,C2,D3` only → **not** a win (length 3)
- Four X on `A1,B2,C3,D4` → win (main diagonal)
- Four X on `A4,B3,C2,D1` → win (anti-diagonal)

### How a game ends

| Reason | Winner | Rated? |
| --- | --- | --- |
| `four_in_a_row` | the line owner | yes if `games.rated` |
| `timeout` | opponent | yes if rated |
| `resign` | opponent | yes if rated (clocks must have started) |
| `no_legal_moves` | the mover who left the opponent with none | yes if rated |
| `draw_agreement` | none | yes if rated (`S = 0.5`) |
| `ply_cap` (400 half-moves) | none | yes if rated (`S = 0.5`) |
| `abort` (handshake miss) | none | **never** |

Sidebar `winState`: `"X" | "O" | "draw" | "aborted" | null`. `draw` covers `draw_agreement` and `ply_cap`.

Reset exists **only** on `/local`. Online games never reset in place; "Play again" returns to the lobby (same code, new game) or re-queues.

---

## Modes

### Local hot-seat (`/local`)

- Both colors in one browser. No account required.
- Same rules and time-preset list. No rated / privacy / color options.
- Clocks start after the first committed move. Display interval is cosmetic.
- Never persisted. `islands/GameManager.tsx` stays local-only and never depends on Supabase.
- Kept working for the entire multiplayer rollout.

### Challenge (pre-lobby online)

- Unrated only. Challenger picks an opponent username and optional time control (default Classic).
- Share URL `/c/{id}`. Inbox: incoming and outgoing pending challenges on home.
- Expires after **5 minutes** (expiry-on-read).
- Challenger occupies an engagement slot until the challenge leaves `pending`. The opponent does **not**, until they accept.
- Accept creates a game and starts the online handshake. If the opponent is already engaged, accept is 409 and the challenge becomes **declined** (not left pending).
- Challenger may cancel while pending. Opponent declines.
- After lobbies ship, hide challenge **create** on home; inbox + `/c/:id` stay (also used for tests).

### Lobby

- **Code:** 6 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no `0/O/1/I`). Share `https://16space.deno.dev/l/ABC234`.
- **Privacy:** `public` listed on the public lobby browse; `private` join-by-code only.
- **Capacity:** 2 players. No spectators in v1.
- Host sets options while `open`. Both members ready; host starts.
- Play again: when the current game is `completed` or `aborted` and both still in the lobby, host starts a new game (same options unless changed while `open` — options are locked on the **game** at insert).
- Leave: remaining member becomes host. Zero members → expired.
- Idle: open lobby expires after 15 minutes with no member heartbeat, or 2 minutes if empty. A **started** lobby is **not** expired while its current game is `active`.
- Cancel: host marks the lobby cancelled.

### Queue (matchmaking)

- Separate queues for `(rated, time_control_id)`. A 3+0 player never pairs with Classic 150.
- Color is **random**. Handshake clocks still apply after a match.
- Expanding rating window: start ±50, +50 every 10s, cap ±400.
- One queued ticket per user. Second enqueue returns the existing ticket.
- Cancel anytime while queued. Ticket expires 60s after the last tick if the client disappears.
- Rated queue requires a non-guest, non-`user_*` account.

### One engagement at a time

A user occupies exactly one of:

- this lobby **and** its current game (one slot),
- a standalone active game (match or challenge),
- a queued ticket,
- an open lobby with no game,
- an **outgoing** pending challenge.

Start/rematch is allowed when the only slot is **this** lobby. Incoming pending challenges do not occupy the opponent.

---

## Game options

Host (lobby) or queue picker. Copied onto the game at start and **immutable**.

| Option | Values | Default | Matchmaking? |
| --- | --- | --- | --- |
| Time control | presets below | `classic` (150+0) | yes, queue key |
| Rated | `true` / `false` | lobby: false; home buttons choose | yes, queue key |
| Color | `random` / `host_x` / `host_o` | `random` | always `random` |
| Privacy | `public` / `private` | create-private / browse-public | n/a |
| First move | X always | — | not configurable |

### Time presets

| `id` | Label | Initial | Increment (Fischer) |
| --- | --- | --- | --- |
| `bullet30` | 30s | 30s | 0 |
| `1+0` | 1+0 | 60s | 0 |
| `2+1` | 2+1 | 120s | 1s |
| `classic` | Classic 2:30 | **150s** | 0 |
| `3+0` | 3+0 | 180s | 0 |
| `3+2` | 3+2 | 180s | 2s |
| `5+0` | 5+0 | 300s | 0 |
| `5+3` | 5+3 | 300s | 3s |

Increment is added to the mover's remaining **after** a legal move, not after flag-fall.

**Rated lobby invariants:** cannot set `rated=true` if any member is a guest or still has a `user_*` placeholder. Guests cannot join a rated lobby. Start re-checks both members.

---

## Clocks and handshake (player-facing)

### Local

Clocks start after the first committed move. Each player has a bank (default Classic 150s). The clock ticks only for the player to move. At 0, the opponent wins.

### Online

- Clocks do **not** run when the game row is created.
- Each client must heartbeat. When **both** have heartbeated, clocks start and X is on clock.
- If after **45 seconds** either player still has not heartbeated, the game **aborts** (no rating change).
- **Rated:** there is no voluntary abort button. Only the 45s miss aborts.
- **Unrated:** you may abort only if the opponent has never heartbeated (true no-show). If both have loaded, abort is refused; resign after clocks start.
- Resign and draw are refused until clocks have started.
- After the first legal move, disconnect is just the clock. Flag-fall rates if the game is rated.
- The on-screen timer is cosmetic. A sleeping tab cannot pause the server clock.

---

## Draws and resign

Anytime (not only your turn), after clocks have started:

| Outstanding offer | You do | Result |
| --- | --- | --- |
| none | offer | you offered |
| yours | offer again | no change |
| opponent's | offer | treated as **accept** |
| opponent's | accept | draw |
| anyone's | decline | cleared |
| anyone's | legal move | cleared, then the move |
| anyone's | resign | you lose; not a draw |

No 3-fold or 50-move. Ply 400 without a 4-in-a-row is the only automatic draw.

---

## Auth and guests (player-facing)

| Method | v1 |
| --- | --- |
| Email + password | yes (confirm-email **off**; password min 8) |
| Magic link | yes — open it in the **same browser** you requested it from |
| GitHub / Google | yes |
| Guest / anonymous | yes |
| Phone | no |

**Guest copy:** "Sign in to keep a rating. Guest cookies last 7 days on this browser; we cannot merge guest history if you create a new account."

Guests may play local, unrated lobby, unrated challenge, and unrated queue only. They cannot play rated.

New accounts start with a placeholder username `user_` + 8 hex characters until they pick a name at signup or `/settings`. OAuth users land on `/settings` until they pick a name. Rated play is blocked while the name still matches `user_*`.

Username: 3–20 characters, `^[a-zA-Z][a-zA-Z0-9_]{2,19}$`, unique (case-insensitive). Rename at most every 30 days. Reserved: `admin, api, play, local, login, signup, settings, leaderboard, u, l, queue, auth, guest, anonymous, 16spaces`.

Account linking (keep guest history when you sign up) is **Phase 2**. Until then, signing up creates a new user.

---

## ELO (player-facing)

- Everyone starts at **1000** (matches the current sidebar default).
- Rated games only. Unrated results do not change rating or W/L/D.
- First 10 rated games: provisional, larger swings (K=40). After that K=20.
- Floor 100. No ceiling.
- Handshake **abort** never changes rating.
- Leaderboard: top 50 by rating, at least **5** rated games, no guests or placeholders.

---

## UX routes

`_app.tsx` keeps the `#161512` dark shell, a single `<title>`, OG tags (`https://16space.deno.dev`), and the AdSense script **once**. `components/Layout.tsx` provides top nav: logo, Play, Leaderboard, username or Sign in.

| Route | Auth | Purpose |
| --- | --- | --- |
| `/` | optional | Home: Play Rated, Play Unrated, Create Lobby, Join by code, Play Local, Leaderboard. AdSense above/below. **No embedded live board.** Incoming-challenge inbox when signed in. |
| `/local` | none | Hot-seat. Time-preset select. |
| `/login` | guest | Email/password, magic link, OAuth, "Play as guest". |
| `/signup` | guest | Email/password. |
| `/l/:code` | required (guest ok) | Lobby. |
| `/c/:id` | required | Challenge accept/decline. Participants only. |
| `/queue` | required | Matchmaking wait + cancel. |
| `/play/:id` | required, must be a player | Online board + sidebar. Refresh resumes. |
| `/u/:username` | optional | Public profile + match history. |
| `/leaderboard` | optional | Top 50. |
| `/settings` | required | Change username. Link-account placeholder hidden until Phase 2. |

### Home buttons (unauthenticated)

- **Play Local** — always, no session.
- **Play Unrated / Create Lobby / Join by code** — create a guest session, then continue (one click).
- **Play Rated** — requires a non-guest, non-`user_*` account. Button goes to `/login?next=/queue?rated=1` and explains why.
- **Leaderboard / public profiles / public lobby browse** — no session, no auto-guest.

Ads stay on `/` only. No ad slots on game, lobby, queue, settings, or profile. Never pass email, user id, or tokens into ad markup.

Rules modal stays on the board (copy from this spec). Close control must not sit inside the rules `<ul>` (current markup bug in `islands/Board.tsx`).

Connection dots in the sidebar are Presence (best-effort). They are not a security boundary.

---

## Current prototype (what players see today)

- Single page at `/` with `GameManager` / `Board` / `Sidebar`.
- 150s bank, clock starts after first move, hardcoded "Anonymous" 1000, O disconnected.
- `maxTime` has no UI yet; presets will replace it on `/local`.
- Duplicate `<title>` and duplicate AdSense loader — to be cleaned up when the home menu lands.
