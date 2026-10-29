-- Username único sem diferenciar maiúsculas/minúsculas
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx
  ON users (lower(username));
