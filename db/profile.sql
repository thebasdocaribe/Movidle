-- Perfil: avatar, bio, top 5 favoritos

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS favorite_movies jsonb NOT NULL DEFAULT '[]'::jsonb;
