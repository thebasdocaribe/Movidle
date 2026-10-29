-- E-mail obrigatório + tokens de recuperação de senha

DELETE FROM users;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE users
  ALTER COLUMN email SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx
  ON users (lower(email));

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_user_idx
  ON password_reset_tokens (user_id);
