-- Modo Personagem: crop progressivo (perna → braço → cabelo → rosto…)

CREATE TABLE IF NOT EXISTS characters (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  name_pt     text,
  aliases     text[] NOT NULL DEFAULT '{}',
  film_title  text,
  image_path  text NOT NULL,
  attribution text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS characters_name_lower_idx
  ON characters (lower(name));

CREATE TABLE IF NOT EXISTS character_daily (
  puzzle_date   date PRIMARY KEY,
  character_id  uuid NOT NULL REFERENCES characters(id)
);

CREATE TABLE IF NOT EXISTS user_character_daily_plays (
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  puzzle_date  date NOT NULL,
  won          boolean NOT NULL,
  take         int,
  points       int NOT NULL DEFAULT 0,
  played_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, puzzle_date)
);

ALTER TABLE user_progress DROP CONSTRAINT IF EXISTS user_progress_mode_check;
ALTER TABLE user_progress
  ADD CONSTRAINT user_progress_mode_check
  CHECK (mode IN ('daily', 'classic', 'cast', 'character'));

-- Catálogo completo semeado em server/src/characterCatalog.js no migrate.
