-- 0003_lobbies.sql
-- Lobby persistence. Writes go through the service role only; clients act via API routes.

create table if not exists public.lobbies (
  id text primary key,
  code text not null unique,
  host_user_id uuid not null references public.profiles (id) on delete cascade,
  privacy text not null default 'private' check (privacy in ('public', 'private')),
  status text not null default 'open' check (status in ('open', 'started', 'cancelled', 'expired')),
  rated boolean not null default false,
  time_control_id text not null,
  color_assignment text not null default 'random' check (color_assignment in ('random', 'host_x', 'host_o')),
  game_id text null references public.games (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lobby_members (
  lobby_id text not null references public.lobbies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  is_host boolean not null default false,
  ready boolean not null default false,
  last_seen_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  primary key (lobby_id, user_id)
);

alter table public.lobbies enable row level security;
alter table public.lobby_members enable row level security;

-- No anon/authenticated policies: all access is via service role API routes.
