# 16spaces

16spaces is a 4×4 two-player abstract game — a Tic-Tac-Toe variant with a five-stone cap and sliding. Play it live at [https://16space.deno.dev](https://16space.deno.dev).

**Status (2026-08-16):** local hot-seat is live at `/local`, with a menu-first home page at `/`. Multiplayer (auth, lobbies, ELO matchmaking) is planned; see [docs/](docs/README.md).

Source: [github.com/itsnotqwerty/16spaces](https://github.com/itsnotqwerty/16spaces)

## Rules (short)

- Two players, **X** and **O**, on a 4×4 board. Cells are `A1`–`D4` (files A–D left→right, ranks 1–4 top→bottom). X moves first.
- On your turn, **place** a stone on an empty cell if you have fewer than 5 stones on the board, or **slide** one of your stones to an adjacent empty cell (including diagonally). No capture, no jumping.
- First to **four** in a row — horizontally, vertically, or either long diagonal — wins.
- Each player has a clock. If your clock hits zero on your turn, you lose. If you have no legal place or slide, you lose.
- A game that reaches **400** half-moves without a four-in-a-row is a draw.
- **Local:** both colors share one browser; clocks start after the first move.
- **Online (planned):** clocks start when both players have loaded the game. If someone never shows up within 45 seconds, the game is aborted and does not affect rating.

Full rules, modes, and options: [docs/spec.md](docs/spec.md).

## Current app

Today the site uses a menu-first home page (`routes/index.tsx`) and a dedicated local route (`routes/local.tsx`) that mounts `islands/GameManager.tsx`. Local mode supports shared-preset clocks and both sides are still played in one browser. There is no auth, database, or network play yet. The sidebar shows names, ELO, connection dots, and clocks as a preview of the multiplayer UI.

## Usage

Install [Deno](https://docs.deno.com). Then:

```bash
deno task start
```

Dev server: http://localhost:8000 (`dev.ts`, watches `static/` and `routes/`).

`deno task start|build|preview` now loads `.env` automatically via `--env-file=.env`.

Other tasks from `deno.json`:

| Task | Command purpose |
| --- | --- |
| `deno task start` | Fresh dev server |
| `deno task build` | Production build (`dev.ts build`) |
| `deno task preview` | Serve the built app (`main.ts`) |
| `deno task check` | `deno fmt --check`, lint, and typecheck |

Engine tests are available via `deno task test` for the shared rules module (`lib/game`).

Basic health check is available at `/api/health` and returns app readiness, `FEATURE_*` flag values, plus a Supabase `healthcheck` RPC probe when env/secrets are configured.

Session scaffold endpoint is available at `/api/auth/session` and currently returns a no-store placeholder envelope for upcoming auth integration.

Auth scaffold routes are available:

- Pages: `/login`, `/signup`
- API: `/api/auth/login`, `/api/auth/signup`, `/api/auth/magic`, `/api/auth/guest`, `/api/auth/logout`, `/api/auth/session`, `/api/auth/callback`

Create auth endpoints are gated by `FEATURE_AUTH`; existing cookie sessions can still be read via middleware + `/api/auth/session`.
Magic-link callback now exchanges auth params and sets httpOnly session cookies before redirecting back into the app.
Signup now accepts a `username` field (validated against spec format/reserved names) and stores it in Supabase auth user metadata.

## Stack and deploy

- **Runtime:** Deno (CI uses Deno 2.x)
- **Framework:** [Fresh 1.7.3](https://fresh.deno.dev) + Preact 10.22 + Tailwind 3.4.1
- **Live:** Deno Deploy project `16spaces` (`.github/workflows/deploy.yml` → `main.ts` on push to `main` and on PRs)
- **Planned DB / auth / realtime:** Postgres + Auth + Realtime through [Supabase](https://supabase.com). No long-lived game server, Redis, or worker.

Supabase wiring is now scaffolded (`lib/supabase.ts` and `supabase/migrations/0001_init.sql`).
Copy `.env.example` to `.env` (already gitignored). High-level variables:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — public client config
- `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` — server secrets (Deno Deploy only)
- `SITE_URL` — `http://localhost:8000` locally, `https://16space.deno.dev` in production
- `FEATURE_AUTH`, `FEATURE_ONLINE`, `FEATURE_MATCHMAKING`, `FEATURE_RATED` — all default **off** unless set to the string `true`
	- Accepted truthy values: `true`, `"true"`, `1`, `yes` (case-insensitive)

Important: `.env` only affects local runs. On Deno Deploy, set these variables in the project Environment Variables UI.

Production: push to `main` → deploy workflow → https://16space.deno.dev.

Architecture and APIs: [docs/design.md](docs/design.md). Incremental PR plan: [docs/roadmap.md](docs/roadmap.md).

## Docs

| Doc | Contents |
| --- | --- |
| [docs/spec.md](docs/spec.md) | Product and game spec (rules, modes, options, UX) |
| [docs/design.md](docs/design.md) | Technical architecture |
| [docs/roadmap.md](docs/roadmap.md) | Implementation / PR plan |

Current transitional routes:

- `/` home menu
- `/local` hot-seat gameplay
- `/leaderboard` placeholder page for rated rollout
- `/login` and `/signup` auth scaffold pages
- `/queue` and `/l/new` queue/lobby scaffold pages

Deployment scaffolding lives in [deploy/](deploy/): nginx example config, systemd unit example, and an install script.
Example:

```bash
sudo ./deploy/install.sh -d /opt/16spaces -n 16space.example.com -p 8000 -e /opt/16spaces/.env
```

## License

© Samuel Roux. See the site footer. Code: [github.com/itsnotqwerty/16spaces](https://github.com/itsnotqwerty/16spaces).
