-- Progresso do Poster infinito por faixa de dificuldade (gate + conquistas)

CREATE TABLE IF NOT EXISTS user_cast_endless (
  user_id     uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  easy_wins   int NOT NULL DEFAULT 0,
  mid_wins    int NOT NULL DEFAULT 0,
  hard_wins   int NOT NULL DEFAULT 0,
  elite_wins  int NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
