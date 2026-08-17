-- 0002_games.sql
-- Server-authoritative game sessions created from matchmaking.
-- Writes go through the service role only; clients read state via API routes.

-- Minimal profiles table; populated by auth flows as accounts are created.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username citext null unique,
  is_guest boolean not null default false,
  rating integer not null default 1000,
  rated_games integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.games (
  id text primary key,
  match_id text null unique,
  player_x_id uuid not null references public.profiles (id) on delete cascade,
  player_o_id uuid not null references public.profiles (id) on delete cascade,
  rated boolean not null default false,
  time_control_id text not null,
  snapshot jsonb not null,
  status text not null default 'active' check (status in ('active', 'completed')),
  result text null check (result in ('a_win', 'b_win', 'draw')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null
);

create index if not exists games_player_x_id_idx on public.games (player_x_id);
create index if not exists games_player_o_id_idx on public.games (player_o_id);

create table if not exists public.game_moves (
  id bigint generated always as identity primary key,
  game_id text not null references public.games (id) on delete cascade,
  ply integer not null,
  player text not null check (player in ('X', 'O')),
  notation text not null,
  created_at timestamptz not null default now(),
  unique (game_id, ply)
);

alter table public.games enable row level security;
alter table public.game_moves enable row level security;

-- No anon/authenticated policies: all access is via service role API routes.
