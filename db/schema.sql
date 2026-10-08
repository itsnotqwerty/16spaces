CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY,
  email text,
  password_hash text,
  is_anonymous boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_idx ON app_users (lower(email));

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  username text,
  is_guest boolean NOT NULL DEFAULT false,
  rating integer NOT NULL DEFAULT 1000,
  rated_games integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_idx ON profiles (lower(username));

CREATE TABLE IF NOT EXISTS app_sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS app_sessions_user_idx ON app_sessions(user_id);
CREATE INDEX IF NOT EXISTS app_sessions_expiry_idx ON app_sessions(expires_at);

CREATE TABLE IF NOT EXISTS app_email_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('magiclink', 'recovery')),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS app_email_tokens_expiry_idx ON app_email_tokens(expires_at);

CREATE TABLE IF NOT EXISTS games (
  id text PRIMARY KEY,
  match_id text UNIQUE,
  player_x_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player_o_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rated boolean NOT NULL DEFAULT false,
  time_control_id text NOT NULL,
  snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  result text CHECK (result IN ('a_win', 'b_win', 'draw')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS games_player_x_id_idx ON games(player_x_id);
CREATE INDEX IF NOT EXISTS games_player_o_id_idx ON games(player_o_id);

CREATE TABLE IF NOT EXISTS game_moves (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_id text NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  ply integer NOT NULL,
  player text NOT NULL CHECK (player IN ('X', 'O')),
  notation text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, ply)
);

CREATE TABLE IF NOT EXISTS lobbies (
  id text PRIMARY KEY,
  code text NOT NULL UNIQUE,
  host_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  privacy text NOT NULL DEFAULT 'private' CHECK (privacy IN ('public', 'private')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'started', 'cancelled', 'expired')),
  rated boolean NOT NULL DEFAULT false,
  time_control_id text NOT NULL,
  color_assignment text NOT NULL DEFAULT 'random' CHECK (color_assignment IN ('random', 'host_x', 'host_o')),
  game_id text REFERENCES games(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lobby_members (
  lobby_id text NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_host boolean NOT NULL DEFAULT false,
  ready boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lobby_id, user_id)
);