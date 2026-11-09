-- Catálogo editável de categorias/perguntas do Quem Sou Eu

CREATE TABLE IF NOT EXISTS whoami_categories (
  id          text PRIMARY KEY,
  label       text NOT NULL,
  sort_order  int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS whoami_questions (
  id          text PRIMARY KEY,
  category_id text NOT NULL REFERENCES whoami_categories(id) ON DELETE CASCADE,
  text        text NOT NULL,
  rule_json   jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order  int NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whoami_questions_category_idx
  ON whoami_questions (category_id, sort_order);
