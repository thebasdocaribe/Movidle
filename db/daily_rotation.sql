-- Rotação dos diários: sem repetir até esgotar o pool (por modo).
-- Em dezembro (lançamento): DELETE FROM daily_pool_used; + limpar dailies futuros.

CREATE TABLE IF NOT EXISTS cast_daily (
  puzzle_date  date PRIMARY KEY,
  movie_id     uuid NOT NULL REFERENCES movies(id)
);

CREATE TABLE IF NOT EXISTS daily_pool_used (
  mode      text NOT NULL CHECK (mode IN ('classic', 'cast', 'character')),
  item_id   uuid NOT NULL,
  used_on   date NOT NULL,
  PRIMARY KEY (mode, item_id)
);

CREATE INDEX IF NOT EXISTS daily_pool_used_mode_date_idx
  ON daily_pool_used (mode, used_on);

-- Backfill: clássicos já sorteados
INSERT INTO daily_pool_used (mode, item_id, used_on)
SELECT 'classic', movie_id, puzzle_date
FROM daily_puzzles
ON CONFLICT (mode, item_id) DO NOTHING;

-- Backfill: personagens já sorteados
INSERT INTO daily_pool_used (mode, item_id, used_on)
SELECT 'character', character_id, puzzle_date
FROM character_daily
ON CONFLICT (mode, item_id) DO NOTHING;
