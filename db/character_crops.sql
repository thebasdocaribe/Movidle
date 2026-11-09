-- Crops por estágio do modo Personagem (editáveis no dashboard admin)

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS crop_json jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS movie_id uuid REFERENCES movies(id);

CREATE INDEX IF NOT EXISTS characters_movie_id_idx
  ON characters (movie_id)
  WHERE movie_id IS NOT NULL;
