-- Perguntas de aprofundamento (nicho) liberadas após SIM em pergunta-pai

ALTER TABLE whoami_questions
  ADD COLUMN IF NOT EXISTS unlock_json jsonb;

CREATE INDEX IF NOT EXISTS whoami_questions_unlock_idx
  ON whoami_questions ((unlock_json IS NULL));
