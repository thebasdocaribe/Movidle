-- Duelo 1v1 (desafie um amigo)

CREATE TABLE IF NOT EXISTS duels (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,
  status      text NOT NULL CHECK (status IN ('waiting', 'playing', 'finished')),
  host_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guest_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  state       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS duels_code_idx ON duels (code);
CREATE INDEX IF NOT EXISTS duels_host_idx ON duels (host_id);
