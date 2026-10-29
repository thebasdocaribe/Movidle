-- Seed a partir de web/public/posters/{n}.jpg
-- license: public_domain = ok p/ build pública · needs_review = conferir antes de daily real

TRUNCATE daily_puzzles, movies RESTART IDENTITY CASCADE;

INSERT INTO movies (title, title_pt, year, aliases, license, poster_path, attribution) VALUES
('Night of the Living Dead', 'A Noite dos Mortos-Vivos', 1968,
 ARRAY['Night of the Living Dead','A Noite dos Mortos Vivos','A Noite dos Mortos-Vivos','Noite dos Mortos Vivos'],
 'public_domain', '/posters/1.jpg', 'George A. Romero — PD (EUA, missing notice)'),

('Carnival of Souls', 'Carnaval das Almas', 1962,
 ARRAY['Carnival of Souls','Carnaval das Almas'],
 'public_domain', '/posters/2.jpg', 'Herk Harvey'),

('Charade', 'Charade', 1963,
 ARRAY['Charade','Charada'],
 'public_domain', '/posters/3.jpg', 'Stanley Donen — filme PD; trilha pode ser ©'),

('The Brain That Wouldn''t Die', 'O Cérebro Que Não Queria Morrer', 1962,
 ARRAY['The Brain That Wouldn''t Die','The Head That Wouldn''t Die','O Cerebro Que Nao Queria Morrer'],
 'public_domain', '/posters/4.jpg', 'Joseph Green'),

('Santa Claus Conquers the Martians', 'Papai Noel Conquista os Marcianos', 1964,
 ARRAY['Santa Claus Conquers the Martians','Papai Noel Contra os Marcianos','Papai Noel Conquista os Marcianos'],
 'public_domain', '/posters/5.jpg', 'Nicholas Webster'),

('Dementia 13', 'Demência 13', 1963,
 ARRAY['Dementia 13','Demencia 13','Demência 13'],
 'public_domain', '/posters/6.jpg', 'Francis Ford Coppola'),

('Little Shop of Horrors', 'A Pequena Loja dos Horrores', 1986,
 ARRAY['Little Shop of Horrors','A Pequena Loja dos Horrores'],
 'needs_review', '/posters/7.jpg', 'Musical 1986 — NÃO é o B&W 1960 PD; só teste UI'),

('McLintock!', 'Quando um Homem é Homem', 1963,
 ARRAY['McLintock!','McLintock','Quando um Homem e Homem'],
 'public_domain', '/posters/8.jpg', 'Andrew V. McLaglen'),

('His Girl Friday', 'His Girl Friday', 1940,
 ARRAY['His Girl Friday','A Reporter de Sexta','A Repórter de Sexta-feira'],
 'public_domain', '/posters/9.jpg', 'Howard Hawks'),

('Detour', 'Desvio', 1945,
 ARRAY['Detour','Desvio','Encontro com o Destino'],
 'public_domain', '/posters/10.jpg', 'Edgar G. Ulmer'),

('D.O.A.', 'Com as Horas Contadas', 1950,
 ARRAY['D.O.A.','DOA','Dead on Arrival','Com as Horas Contadas'],
 'public_domain', '/posters/11.jpg', 'Rudolph Maté'),

('Beat the Devil', 'O Tesouro da África', 1953,
 ARRAY['Beat the Devil','O Tesouro da Africa','O Tesouro de África'],
 'public_domain', '/posters/12.jpg', 'John Huston'),

('The Stranger', 'O Estranho', 1946,
 ARRAY['The Stranger','O Estranho'],
 'public_domain', '/posters/13.jpg', 'Orson Welles'),

('Fear and Desire', 'Medo e Desejo', 1953,
 ARRAY['Fear and Desire','Medo e Desejo'],
 'public_domain', '/posters/14.jpg', 'Stanley Kubrick'),

('Angel and the Badman', 'O Anjo e o Pistoleiro', 1947,
 ARRAY['Angel and the Badman','O Anjo e o Pistoleiro','O Anjo e o Malvado'],
 'public_domain', '/posters/15.jpg', 'James Edward Grant'),

('Nothing Sacred', 'Nada Sagrado', 1937,
 ARRAY['Nothing Sacred','Nada Sagrado','Nada é Sagrado'],
 'public_domain', '/posters/16.jpg', 'William A. Wellman'),

('A Star Is Born', 'Nasce uma Estrela', 1937,
 ARRAY['A Star Is Born','Nasce uma Estrela'],
 'public_domain', '/posters/17.jpg', 'William A. Wellman — versão 1937'),

('The Last Man on Earth', 'O Último Homem na Terra', 1964,
 ARRAY['The Last Man on Earth','O Ultimo Homem na Terra','O Último Homem da Terra'],
 'public_domain', '/posters/18.jpg', 'Ubaldo Ragona / Sidney Salkow'),

('Reefer Madness: The Movie Musical', 'Reefer Madness: O Musical', 2005,
 ARRAY['Reefer Madness: The Movie Musical','Reefer Madness Musical'],
 'needs_review', '/posters/19.jpg', 'Musical 2005 — NÃO é o PD 1936; só teste UI'),

('Africa Screams', 'África Grita', 1949,
 ARRAY['Africa Screams','Africa Grita','África Grita'],
 'public_domain', '/posters/20.jpg', 'Charles Barton'),

('A Bucket of Blood', 'Um Balde de Sangue', 1959,
 ARRAY['A Bucket of Blood','Um Balde de Sangue'],
 'public_domain', '/posters/21.jpg', 'Roger Corman'),

('The Deadly Companions', 'Companheiros Mortais', 1961,
 ARRAY['The Deadly Companions','Companheiros Mortais','Parceiros da Morte'],
 'public_domain', '/posters/22.jpg', 'Sam Peckinpah'),

('Nosferatu', 'Nosferatu', 1922,
 ARRAY['Nosferatu','Nosferatu: A Symphony of Horror','Nosferatu uma Sinfonia do Horror'],
 'public_domain', '/posters/23.jpg', 'F. W. Murnau'),

('Metropolis', 'Metrópolis', 1927,
 ARRAY['Metropolis','Metropolis','Metrópolis'],
 'public_domain', '/posters/24.jpg', 'Fritz Lang'),

('The Cabinet of Dr. Caligari', 'O Gabinete do Dr. Caligari', 1920,
 ARRAY['The Cabinet of Dr. Caligari','Das Cabinet des Dr. Caligari','O Gabinete do Dr. Caligari','Caligari'],
 'public_domain', '/posters/25.jpg', 'Robert Wiene'),

('The Phantom of the Opera', 'O Fantasma da Ópera', 1925,
 ARRAY['The Phantom of the Opera','O Fantasma da Opera','O Fantasma da Ópera'],
 'public_domain', '/posters/26.jpg', 'Rupert Julian — versão 1925'),

('The Kid', 'O Garoto', 1921,
 ARRAY['The Kid','O Garoto','Charlie Chaplin The Kid'],
 'public_domain', '/posters/27.jpg', 'Charlie Chaplin'),

('The Gold Rush', 'Em Busca do Ouro', 1925,
 ARRAY['The Gold Rush','Em Busca do Ouro'],
 'public_domain', '/posters/28.jpg', 'Charlie Chaplin'),

('Steamboat Willie', 'Steamboat Willie', 1928,
 ARRAY['Steamboat Willie','Vapor Willie','O Vapor Willie'],
 'public_domain', '/posters/29.jpg', 'Disney curto 1928 — cuidado marca Mickey'),

('A Trip to the Moon', 'Viagem à Lua', 1902,
 ARRAY['A Trip to the Moon','Le Voyage dans la Lune','Viagem a Lua','Viagem à Lua'],
 'public_domain', '/posters/30.jpg', 'Georges Méliès'),

('The Great Train Robbery', 'O Grande Roubo do Trem', 1903,
 ARRAY['The Great Train Robbery','O Grande Roubo do Trem'],
 'public_domain', '/posters/31.jpg', 'Edwin S. Porter'),

('Un Chien Andalou', 'Um Cão Andaluz', 1929,
 ARRAY['Un Chien Andalou','An Andalusian Dog','Um Cao Andaluz','Um Cão Andaluz'],
 'public_domain', '/posters/32.jpg', 'Luis Buñuel / Salvador Dalí'),

('Häxan', 'Häxan', 1922,
 ARRAY['Häxan','Haxan','Witchcraft Through the Ages','A Bruxaria Através dos Tempos'],
 'public_domain', '/posters/33.jpg', 'Benjamin Christensen'),

('The Man Who Laughs', 'O Homem que Ri', 1928,
 ARRAY['The Man Who Laughs','O Homem que Ri'],
 'public_domain', '/posters/34.jpg', 'Paul Leni'),

('Battleship Potemkin', 'O Encouraçado Potemkin', 1925,
 ARRAY['Battleship Potemkin','Bronenosets Potyomkin','O Encouracado Potemkin','O Encouraçado Potemkin'],
 'public_domain', '/posters/35.jpg', 'Sergei Eisenstein'),

('The General', 'A General', 1926,
 ARRAY['The General','A General','A Locomotiva'],
 'public_domain', '/posters/36.jpg', 'Buster Keaton'),

('Sherlock Jr.', 'Sherlock Jr.', 1924,
 ARRAY['Sherlock Jr.','Sherlock Junior','Sherlock Jr'],
 'public_domain', '/posters/37.jpg', 'Buster Keaton'),

('Safety Last!', 'O Homem Mosca', 1923,
 ARRAY['Safety Last!','Safety Last','O Homem Mosca'],
 'public_domain', '/posters/38.jpg', 'Harold Lloyd'),

('Sunrise: A Song of Two Humans', 'Aurora', 1927,
 ARRAY['Sunrise','Sunrise: A Song of Two Humans','Aurora'],
 'public_domain', '/posters/39.jpg', 'F. W. Murnau'),

('Faust', 'Fausto', 1926,
 ARRAY['Faust','Fausto','Goethe''s Faust'],
 'public_domain', '/posters/40.jpg', 'F. W. Murnau'),

('The Lost World', 'O Mundo Perdido', 1925,
 ARRAY['The Lost World','O Mundo Perdido'],
 'public_domain', '/posters/41.jpg', 'Harry O. Hoyt — versão 1925'),

('A Page of Madness', 'Uma Página de Loucura', 1926,
 ARRAY['A Page of Madness','Kurutta Ichipeiji','Uma Pagina de Loucura','Uma Página de Loucura'],
 'public_domain', '/posters/42.jpg', 'Teinosuke Kinugasa'),

('All Quiet on the Western Front', 'Sem Novidade no Front', 1930,
 ARRAY['All Quiet on the Western Front','Sem Novidade no Front','Nada de Novo no Front'],
 'public_domain', '/posters/43.jpg', 'Lewis Milestone'),

('Robin Hood', 'Robin Hood', 1922,
 ARRAY['Robin Hood','Douglas Fairbanks Robin Hood'],
 'public_domain', '/posters/44.jpg', 'Allan Dwan — Fairbanks 1922'),

('The Mark of Zorro', 'A Marca do Zorro', 1920,
 ARRAY['The Mark of Zorro','A Marca do Zorro','Mark of Zorro'],
 'public_domain', '/posters/45.jpg', 'Fred Niblo — 1920'),

('King Kong', 'King Kong', 1933,
 ARRAY['King Kong','King Kong 1933'],
 'needs_review', '/posters/46.jpg', '1933 — PD EUA só em 2029; só teste UI'),

('The Bride of Frankenstein', 'A Noiva de Frankenstein', 1935,
 ARRAY['The Bride of Frankenstein','Bride of Frankenstein','A Noiva de Frankenstein'],
 'needs_review', '/posters/47.jpg', '1935 — ainda ©; só teste UI');

-- Daily de hoje (BRT): Night of the Living Dead
INSERT INTO daily_puzzles (puzzle_date, movie_id)
SELECT (timezone('America/Sao_Paulo', now()))::date, id
FROM movies
WHERE poster_path = '/posters/1.jpg'
ON CONFLICT (puzzle_date) DO UPDATE SET movie_id = EXCLUDED.movie_id;
