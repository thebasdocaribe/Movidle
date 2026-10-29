-- Contadores estilo Loldle: quem acertou o daily + chutes populares do dia

CREATE TABLE IF NOT EXISTS daily_guesses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_date  date NOT NULL,
  user_id      uuid REFERENCES users(id) ON DELETE SET NULL,
  guess_norm   text NOT NULL,
  guess_raw    text NOT NULL,
  correct      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Uma contagem por pessoa por chute normalizado no dia
CREATE UNIQUE INDEX IF NOT EXISTS daily_guesses_unique_user_norm
  ON daily_guesses (puzzle_date, user_id, guess_norm)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS daily_guesses_date_norm_idx
  ON daily_guesses (puzzle_date, guess_norm);
