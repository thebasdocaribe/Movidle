-- Modo Personagem: crop progressivo (perna → braço → cabelo → rosto…)

CREATE TABLE IF NOT EXISTS characters (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  name_pt     text,
  aliases     text[] NOT NULL DEFAULT '{}',
  film_title  text,
  image_path  text NOT NULL,
  attribution text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS characters_name_lower_idx
  ON characters (lower(name));

CREATE TABLE IF NOT EXISTS character_daily (
  puzzle_date   date PRIMARY KEY,
  character_id  uuid NOT NULL REFERENCES characters(id)
);

CREATE TABLE IF NOT EXISTS user_character_daily_plays (
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  puzzle_date  date NOT NULL,
  won          boolean NOT NULL,
  take         int,
  points       int NOT NULL DEFAULT 0,
  played_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, puzzle_date)
);

ALTER TABLE user_progress DROP CONSTRAINT IF EXISTS user_progress_mode_check;
ALTER TABLE user_progress
  ADD CONSTRAINT user_progress_mode_check
  CHECK (mode IN ('daily', 'classic', 'cast', 'character'));

-- Seed de teste: posters PD como foto do personagem (trocar por stills depois)
INSERT INTO characters (name, name_pt, aliases, film_title, image_path, attribution)
SELECT v.name, v.name_pt, v.aliases, v.film_title, v.image_path, v.attribution
FROM (VALUES
  ('Count Orlok', 'Conde Orlok', ARRAY['Orlok','Nosferatu','Conde Orlok'], 'Nosferatu', '/posters/23.jpg', 'Nosferatu (1922) PD'),
  ('Maria', 'Maria', ARRAY['Maria','Maschinenmensch','False Maria'], 'Metropolis', '/posters/24.jpg', 'Metropolis (1927) PD'),
  ('Cesare', 'Cesare', ARRAY['Cesare','Sonambulo','The Somnambulist'], 'The Cabinet of Dr. Caligari', '/posters/25.jpg', 'Caligari (1920) PD'),
  ('The Tramp', 'O Vagabundo', ARRAY['The Tramp','Charlie','Chaplin','O Vagabundo','Carlitos'], 'The Kid', '/posters/27.jpg', 'Chaplin PD'),
  ('Erik', 'Erik', ARRAY['Erik','The Phantom','Fantasma','O Fantasma'], 'The Phantom of the Opera', '/posters/26.jpg', 'Phantom (1925) PD'),
  ('Gwynplaine', 'Gwynplaine', ARRAY['Gwynplaine','The Man Who Laughs','Homem que Ri'], 'The Man Who Laughs', '/posters/34.jpg', 'The Man Who Laughs (1928) PD'),
  ('Georges Méliès astronaut', 'Astronauta de Méliès', ARRAY['Astronauta','Moon traveler','Viagem a Lua'], 'A Trip to the Moon', '/posters/30.jpg', 'Méliès PD')
) AS v(name, name_pt, aliases, film_title, image_path, attribution)
WHERE NOT EXISTS (
  SELECT 1 FROM characters c WHERE lower(c.name) = lower(v.name)
);
