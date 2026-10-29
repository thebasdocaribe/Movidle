-- Contas + progresso + daily 1x/dia

CREATE TABLE IF NOT EXISTS users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username       text NOT NULL UNIQUE,
  display_name   text NOT NULL,
  email          text NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  password_hash  text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_username_len CHECK (char_length(username) BETWEEN 3 AND 32)
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx
  ON users (lower(username));

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx
  ON users (lower(email));

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_verify_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_progress (
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode              text NOT NULL CHECK (mode IN ('daily', 'classic')),
  total_score       int NOT NULL DEFAULT 0,
  first_try_streak  int NOT NULL DEFAULT 0,
  wins              int NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, mode)
);

CREATE TABLE IF NOT EXISTS user_daily_plays (
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  puzzle_date  date NOT NULL,
  won          boolean NOT NULL,
  take         int,
  points       int NOT NULL DEFAULT 0,
  played_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, puzzle_date)
);

CREATE INDEX IF NOT EXISTS user_progress_score_idx
  ON user_progress (mode, total_score DESC);
