-- Modo Elenco: metadados + capa larga opcional + progresso

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS director text,
  ADD COLUMN IF NOT EXISTS cast_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS poster_wide_path text;

ALTER TABLE user_progress DROP CONSTRAINT IF EXISTS user_progress_mode_check;
ALTER TABLE user_progress
  ADD CONSTRAINT user_progress_mode_check
  CHECK (mode IN ('daily', 'classic', 'cast', 'character'));

CREATE TABLE IF NOT EXISTS user_cast_daily_plays (
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  puzzle_date  date NOT NULL,
  won          boolean NOT NULL,
  take         int,
  points       int NOT NULL DEFAULT 0,
  played_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, puzzle_date)
);

-- Fotos: image_url local em /cast/*.jpg (você pode dropar arquivos em web/public/cast/)
-- Enquanto não houver arquivo, o front usa avatar gerado com o nome.

UPDATE movies SET
  director = 'George A. Romero',
  poster_wide_path = NULL,
  cast_json = '{
    "screenwriter":{"name":"John A. Russo","image_url":"/cast/john-russo.jpg"},
    "protagonist":{"name":"Duane Jones","image_url":"/cast/duane-jones.jpg"},
    "antagonist":null,
    "secondary":{"name":"Karl Hardman","image_url":"/cast/karl-hardman.jpg"},
    "region":"EUA"
  }'::jsonb
WHERE title = 'Night of the Living Dead';

UPDATE movies SET
  director = 'Herk Harvey',
  cast_json = '{
    "screenwriter":{"name":"John Clifford","image_url":"/cast/john-clifford.jpg"},
    "protagonist":{"name":"Candace Hilligoss","image_url":"/cast/candace-hilligoss.jpg"},
    "antagonist":null,
    "secondary":{"name":"Frances Feist","image_url":"/cast/frances-feist.jpg"},
    "region":"EUA"
  }'::jsonb
WHERE title = 'Carnival of Souls';

UPDATE movies SET
  director = 'Stanley Donen',
  cast_json = '{
    "screenwriter":{"name":"Peter Stone","image_url":"/cast/peter-stone.jpg"},
    "protagonist":{"name":"Audrey Hepburn","image_url":"/cast/audrey-hepburn.jpg"},
    "antagonist":{"name":"Walter Matthau","image_url":"/cast/walter-matthau.jpg"},
    "secondary":{"name":"James Coburn","image_url":"/cast/james-coburn.jpg"},
    "region":"EUA"
  }'::jsonb
WHERE title = 'Charade';

UPDATE movies SET
  director = 'Edgar G. Ulmer',
  cast_json = '{
    "screenwriter":{"name":"Martin Goldsmith","image_url":"/cast/martin-goldsmith.jpg"},
    "protagonist":{"name":"Tom Neal","image_url":"/cast/tom-neal.jpg"},
    "antagonist":null,
    "secondary":{"name":"Ann Savage","image_url":"/cast/ann-savage.jpg"},
    "region":"EUA"
  }'::jsonb
WHERE title = 'Detour';

UPDATE movies SET
  director = 'Rudolph Maté',
  cast_json = '{
    "screenwriter":{"name":"Russell Rouse","image_url":"/cast/russell-rouse.jpg"},
    "protagonist":{"name":"Edmond O''Brien","image_url":"/cast/edmond-obrien.jpg"},
    "antagonist":{"name":"Luther Adler","image_url":"/cast/luther-adler.jpg"},
    "secondary":{"name":"Pamela Britton","image_url":"/cast/pamela-britton.jpg"},
    "region":"EUA"
  }'::jsonb
WHERE title = 'D.O.A.';

UPDATE movies SET
  director = 'Joseph Green',
  cast_json = '{
    "screenwriter":{"name":"Joseph Green","image_url":"/cast/joseph-green.jpg"},
    "protagonist":{"name":"Jason Evers","image_url":"/cast/jason-evers.jpg"},
    "antagonist":{"name":"Virginia Leith","image_url":"/cast/virginia-leith.jpg"},
    "secondary":{"name":"Anthony Eisley","image_url":"/cast/anthony-eisley.jpg"},
    "region":"EUA"
  }'::jsonb
WHERE title = 'The Brain That Wouldn''t Die';

UPDATE movies SET
  director = 'Ubaldo Ragona',
  cast_json = '{
    "screenwriter":{"name":"William Leicester","image_url":"/cast/william-leicester.jpg"},
    "protagonist":{"name":"Vincent Price","image_url":"/cast/vincent-price.jpg"},
    "antagonist":null,
    "secondary":{"name":"Franca Bettoia","image_url":"/cast/franca-bettoia.jpg"},
    "region":"Itália / EUA"
  }'::jsonb
WHERE title = 'The Last Man on Earth';

UPDATE movies SET
  director = 'James Edward Grant',
  cast_json = '{
    "screenwriter":{"name":"James Edward Grant","image_url":"/cast/james-grant.jpg"},
    "protagonist":{"name":"John Wayne","image_url":"/cast/john-wayne.jpg"},
    "antagonist":{"name":"Bruce Cabot","image_url":"/cast/bruce-cabot.jpg"},
    "secondary":{"name":"Gail Russell","image_url":"/cast/gail-russell.jpg"},
    "region":"EUA"
  }'::jsonb
WHERE title = 'Angel and the Badman';

UPDATE movies SET
  director = 'John Huston',
  cast_json = '{
    "screenwriter":{"name":"Truman Capote","image_url":"/cast/truman-capote.jpg"},
    "protagonist":{"name":"Humphrey Bogart","image_url":"/cast/humphrey-bogart.jpg"},
    "antagonist":null,
    "secondary":{"name":"Gina Lollobrigida","image_url":"/cast/gina-lollobrigida.jpg"},
    "region":"Reino Unido / Itália"
  }'::jsonb
WHERE title = 'Beat the Devil';

UPDATE movies SET
  director = 'William A. Wellman',
  cast_json = '{
    "screenwriter":{"name":"Ben Hecht","image_url":"/cast/ben-hecht.jpg"},
    "protagonist":{"name":"Carole Lombard","image_url":"/cast/carole-lombard.jpg"},
    "antagonist":null,
    "secondary":{"name":"Fredric March","image_url":"/cast/fredric-march.jpg"},
    "region":"EUA"
  }'::jsonb
WHERE title = 'Nothing Sacred';

UPDATE movies SET
  director = 'Louis J. Gasnier',
  cast_json = '{
    "screenwriter":{"name":"Arthur Hoerl","image_url":"/cast/arthur-hoerl.jpg"},
    "protagonist":{"name":"Dorothy Short","image_url":"/cast/dorothy-short.jpg"},
    "antagonist":null,
    "secondary":{"name":"Kenneth Craig","image_url":"/cast/kenneth-craig.jpg"},
    "region":"EUA"
  }'::jsonb
WHERE title ILIKE 'Reefer Madness%';
