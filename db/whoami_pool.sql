-- Pool curada do Quem Sou Eu (sobrevive a updates de cast_json do catálogo)

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS whoami_pool boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS movies_whoami_pool_idx
  ON movies (whoami_pool)
  WHERE whoami_pool = true;
