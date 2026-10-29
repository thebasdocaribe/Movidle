-- CineBlitz / movidle — schema protótipo
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS movies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  title_pt      text,
  year          int,
  aliases       text[] NOT NULL DEFAULT '{}',
  license       text NOT NULL DEFAULT 'public_domain',
  source_url    text,
  attribution   text,
  poster_path   text NOT NULL,
  clip_path     text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_puzzles (
  puzzle_date   date PRIMARY KEY,
  movie_id      uuid NOT NULL REFERENCES movies(id)
);

CREATE INDEX IF NOT EXISTS movies_title_idx ON movies (lower(title));
