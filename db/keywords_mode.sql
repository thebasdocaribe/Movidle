-- Modo Palavra-chave (diário)

ALTER TABLE user_progress DROP CONSTRAINT IF EXISTS user_progress_mode_check;
ALTER TABLE user_progress
  ADD CONSTRAINT user_progress_mode_check
  CHECK (mode IN ('daily', 'classic', 'cast', 'character', 'whoami', 'keywords'));

CREATE TABLE IF NOT EXISTS keywords_daily (
  puzzle_date  date PRIMARY KEY,
  movie_id     uuid NOT NULL REFERENCES movies(id)
);

CREATE TABLE IF NOT EXISTS user_keywords_daily_plays (
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  puzzle_date  date NOT NULL,
  won          boolean NOT NULL,
  guesses      int NOT NULL DEFAULT 0,
  points       int NOT NULL DEFAULT 0,
  played_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, puzzle_date)
);

ALTER TABLE daily_pool_used DROP CONSTRAINT IF EXISTS daily_pool_used_mode_check;
ALTER TABLE daily_pool_used
  ADD CONSTRAINT daily_pool_used_mode_check
  CHECK (mode IN ('classic', 'cast', 'character', 'whoami', 'keywords'));
