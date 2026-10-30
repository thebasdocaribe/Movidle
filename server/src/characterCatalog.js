/** Curadoria CineBlitz — só personagens COM foto em web/public/characters/{slug}.jpg */

function slug(s) {
  return String(s)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function row(name, namePt, film, aliases = []) {
  const all = [...new Set([name, namePt, ...aliases].filter(Boolean))]
  return {
    name,
    name_pt: namePt || name,
    film_title: film,
    aliases: all.filter((a) => a !== name),
    image_path: `/characters/${slug(namePt || name)}.jpg`,
    attribution: film,
  }
}

/**
 * Ordem = sequência do diário (dia 1 = Odeo).
 * Só entra quem tem JPG em public/characters.
 */
export const CHARACTER_CATALOG = [
  row('Odeo', 'Odeo', 'The Dancing Pig', ['The Dancing Pig']),
  row('Count Orlok', 'Conde Orlok', 'Nosferatu', ['Orlok', 'Nosferatu']),
  row('Maria', 'Maria', 'Metropolis', ['Maschinenmensch', 'False Maria']),
  row('Gwynplaine', 'Gwynplaine', 'The Man Who Laughs', [
    'O Homem que Ri',
    'Homem que Ri',
  ]),
  row('The Golem', 'Golem', 'The Golem: How He Came into the World', [
    'Der Golem',
  ]),
  row('Mephisto', 'Mephisto', 'Faust', [
    'Mefisto',
    'Mephistopheles',
    'Fausto',
  ]),
  row('Erik', 'Erik', 'The Phantom of the Opera', [
    'The Phantom',
    'Fantasma da Ópera',
    'O Fantasma',
  ]),
  row('Dorothy Gale', 'Dorothy', 'The Wizard of Oz', ['Dorothy Gale']),
  row('Tin Man', 'Homem de Lata', 'The Wizard of Oz', [
    'Tin Woodman',
    'Homem de lata',
  ]),
  row('Cowardly Lion', 'Homem-Leão', 'The Wizard of Oz', [
    'Leão Covarde',
    'Homem leao',
  ]),
  row('Scarecrow', 'Espantalho', 'The Wizard of Oz', []),
  row('Charlie Chaplin', 'Charlie Chaplin', 'The Kid', [
    'The Tramp',
    'Carlitos',
    'O Vagabundo',
  ]),
  row('Snow White', 'Branca de Neve', 'Snow White and the Seven Dwarfs', [
    'A Branca de Neve',
  ]),
  row('Evil Queen', 'Rainha Má', 'Snow White and the Seven Dwarfs', [
    'Queen',
    'Quenn',
    'Rainha',
  ]),
  row("Frankenstein's Monster", 'Monstro de Frankenstein', 'Frankenstein', [
    'Frankenstein',
    'O Monstro',
  ]),
  row('The Bride', 'Noiva de Frankenstein', 'Bride of Frankenstein', [
    'A Noiva do Frankenstein',
    'Bride',
  ]),
  row('Count Dracula', 'Conde Drácula', 'Dracula (1931)', [
    'Dracula',
    'Drácula',
  ]),
  row('Van Helsing', 'Van Helsing', 'Dracula (1931)', []),
  row('Jack Griffin', 'Dr. Jack Griffin', 'The Invisible Man', [
    'Invisible Man',
    'Homem Invisível',
  ]),
  row('King Kong', 'Kong', 'King Kong', ['Kong']),
  row('Dr. Jekyll', 'Dr. Jekyll', 'Dr. Jekyll and Mr. Hyde', ['Jekyll']),
  row('Mr. Hyde', 'Mr. Hyde', 'Dr. Jekyll and Mr. Hyde', ['Hyde']),
  row('Robin Hood', 'Robin Hood', 'The Adventures of Robin Hood', []),
  row('Charles Foster Kane', 'Charles Foster Kane', 'Citizen Kane', [
    'Kane',
    'Cidadão Kane',
  ]),
  row('Bambi', 'Bambi', 'Bambi', []),
  row('Pinocchio', 'Pinóquio', 'Pinocchio', ['Pinocchio']),
  row('Jiminy Cricket', 'Grilo Falante', 'Pinocchio', ['Jiminy']),
  row('Geppetto', 'Geppetto', 'Pinocchio', ['Gepeto']),
  row('Mickey Mouse', 'Mickey Mouse', 'Fantasia', [
    'Mickey',
    'Sorcerer Mickey',
    'Steamboat Willie',
  ]),
  row('Dumbo', 'Dumbo', 'Dumbo', []),
  row('Larry Talbot', 'Larry Talbot', 'The Wolf Man', [
    'Wolf Man',
    'Lobisomem',
  ]),
  row('L.B. Jefferies', 'L.B. Jefferies', 'Rear Window', [
    'Jeff',
    'Jefferies',
    'Janela Indiscreta',
  ]),
  row('Kikuchiyo', 'Kikuchiyo', 'Seven Samurai', [
    'Os Sete Samurais',
    '7 Samurais',
  ]),
  row('Death', 'A Morte', 'The Seventh Seal', [
    'Death',
    'Morte',
    'A Morte',
    'O Sétimo Selo',
  ]),
  row('Tajōmaru', 'Tajomaru', 'Rashomon', ['Tajomaru', 'Rashômon']),
  row('Harry Powell', 'Harry Powell', 'The Night of the Hunter', [
    'A Noite do Caçador',
  ]),
  row('Cinderella', 'Cinderela', 'Cinderella', ['Cinderella']),
  row('Fairy Godmother', 'Fada Madrinha', 'Cinderella', []),
  row('Princess Aurora', 'Princesa Aurora', 'Sleeping Beauty', [
    'Bela Adormecida',
    'Aurora',
  ]),
  row('Peter Pan', 'Peter Pan', 'Peter Pan', []),
  row('Captain Hook', 'Capitão Gancho', 'Peter Pan', ['Gancho']),
  row('Alice', 'Alice', 'Alice in Wonderland', [
    'Alice no País das Maravilhas',
  ]),
  row('Mad Hatter', 'Chapeleiro Maluco', 'Alice in Wonderland', [
    'Chapeleiro',
  ]),
  row('Queen of Hearts', 'Rainha de Copas', 'Alice in Wonderland', []),
  row('Godzilla', 'Godzilla', 'Godzilla', ['Gojira']),
  row('Ethan Edwards', 'Ethan Edwards', 'The Searchers', [
    'The Searchers',
    'Rastros de Ódio',
  ]),
  row('Judah Ben-Hur', 'Judah Ben-Hur', 'Ben-Hur', ['Ben-Hur', 'Judan']),
  row('Don Lockwood', 'Don Lockwood', "Singin' in the Rain", [
    'Cantando na Chuva',
    'Dançando na Chuva',
  ]),
  row('Norman Bates', 'Norman Bates', 'Psycho', ['Psicose']),
  row('Blondie', 'Blondie', 'The Good, the Bad and the Ugly', [
    'O Bom, o Mau e o Feio',
    'Man with No Name',
  ]),
  row('Tuco Ramirez', 'Tuco', 'The Good, the Bad and the Ugly', [
    'Tuco Ramirez',
    'O Feio',
  ]),
  row('Angel Eyes', 'Angel Eyes', 'The Good, the Bad and the Ugly', [
    'Sentenza',
    'O Mau',
  ]),
  row('Rosemary Woodhouse', 'Rosemary', "Rosemary's Baby", [
    'O Bebê de Rosemary',
  ]),
  row('Hanshirō Tsugumo', 'Hanshiro Tsugumo', 'Harakiri', [
    'Hanshiro',
    'Seppuku',
  ]),
  row('Guido Anselmi', 'Guido Anselmi', '8½', ['8 e 1/2', '8 1/2']),
  row('Ben', 'Ben', 'Night of the Living Dead', [
    'A Noite dos Mortos-Vivos',
  ]),
  row('Mary Poppins', 'Mary Poppins', 'Mary Poppins', []),
  row('Cruella de Vil', 'Cruela de Vil', 'One Hundred and One Dalmatians', [
    'Cruella',
    '101 Dálmatas',
  ]),
  row('Pongo', 'Pongo', 'One Hundred and One Dalmatians', ['101 Dálmatas']),
  row('George Taylor', 'George Taylor', 'Planet of the Apes', [
    'Planeta dos Macacos',
    'Taylor',
  ]),
  row('Cornelius', 'Cornelius', 'Planet of the Apes', [
    'Planeta dos Macacos',
  ]),
  row('Woman', 'Woman', 'Onibaba', ['Onibaba']),
  row('James Bond', 'James Bond', 'Dr. No', ['007', 'Bond']),
  row('Don Vito Corleone', 'Don Vito Corleone', 'The Godfather', [
    'Vito Corleone',
    'Poderoso Chefão',
    'Don Corleone',
  ]),
  row('Michael Corleone', 'Michael Corleone', 'The Godfather', [
    'Poderoso Chefão',
  ]),
  row('Travis Bickle', 'Travis Bickle', 'Taxi Driver', ['Travis']),
  row('Luke Skywalker', 'Luke Skywalker', 'Star Wars', ['Luke']),
  row('Han Solo', 'Han Solo', 'Star Wars', ['Han']),
  row('Princess Leia', 'Princesa Leia', 'Star Wars', ['Leia']),
  row('Grand Moff Tarkin', 'Grand Moff Tarkin', 'Star Wars', ['Tarkin']),
  row('Obi-Wan Kenobi', 'Obi-Wan Kenobi', 'Star Wars', [
    'Obi-Wan',
    'Obwain',
    'Ben Kenobi',
  ]),
  row('C-3PO', 'C-3PO', 'Star Wars', ['C3PO', 'Threepio']),
  row('R2-D2', 'R2-D2', 'Star Wars', ['R2D2', 'Artoo']),
  row('Chewbacca', 'Chewbacca', 'Star Wars', ['Chewie']),
  row('Darth Vader', 'Darth Vader', 'Star Wars', ['Vader']),
  row('Alien', 'Alien', 'Alien', ['Xenomorph', 'Xenomorfo']),
  row('Ellen Ripley', 'Ellen Ripley', 'Alien', ['Ripley']),
  row('Jaws', 'Tubarão', 'Jaws', ['Bruce', 'Shark', 'Tubarao']),
  row('Martin Brody', 'Brody', 'Jaws', ['Martin Brody', 'Chief Brody']),
  row('Alex DeLarge', 'Alex DeLarge', 'A Clockwork Orange', [
    'Alex',
    'Laranja Mecânica',
  ]),
  row('Frank-N-Furter', 'Frank-N-Furter', 'The Rocky Horror Picture Show', [
    'Frank N Furter',
    'Dr. Frank-N-Furter',
  ]),
  row('Laurie Strode', 'Laurie Strode', 'Halloween', ['Laurie']),
  row('Michael Myers', 'Michael Myers', 'Halloween', ['Myers', 'The Shape']),
  row('Carrie White', 'Carrie White', 'Carrie', ['Carrie', 'Carrie a Estranha']),
  row('Leatherface', 'Leatherface', 'The Texas Chain Saw Massacre', [
    'O Massacre da Serra Elétrica',
  ]),
  row('Chris MacNeil', 'Chris MacNeil', 'The Exorcist', ['Chris']),
  row('Regan MacNeil', 'Regan MacNeil', 'The Exorcist', ['Regan']),
  row('Father Karras', 'Father Karras', 'The Exorcist', [
    'Karras',
    'Damien Karras',
  ]),
  row('Father Merrin', 'Father Merrin', 'The Exorcist', [
    'Merrin',
    'Lankester Merrin',
    'Marrie',
  ]),
  row('Sandy Olsson', 'Sandy', 'Grease', ['Sandy Olsson']),
  row('Danny Zuko', 'Danny Zuko', 'Grease', ['Danny', 'Danny Zuko']),
  row('Rocky Balboa', 'Rocky Balboa', 'Rocky', ['Rocky']),
  row('Apollo Creed', 'Apollo Creed', 'Rocky', ['Apollo']),
  row('Henry Spencer', 'Henry Spencer', 'Eraserhead', ['Henry']),
  row('Suzy Bannion', 'Suzy Bannion', 'Suspiria', ['Suzy']),
  row('King Arthur', 'Rei Arthur', 'Monty Python and the Holy Grail', [
    'Arthur',
  ]),
  row('Black Knight', 'Cavaleiro Negro', 'Monty Python and the Holy Grail', [
    'Cavaleiro Negro',
  ]),
  row('Willy Wonka', 'Willy Wonka', 'Willy Wonka & the Chocolate Factory', [
    'Wonka',
  ]),
  row('Winslow Leach', 'Winslow Leach', 'Phantom of the Paradise', [
    'Winslow',
  ]),
  row('Divine', 'Divine', 'Pink Flamingos', []),
  row('Superman', 'Superman', 'Superman', ['Clark Kent']),
  row('Lex Luthor', 'Lex Luthor', 'Superman', ['Lex Luther', 'Lex']),
  row('Lois Lane', 'Lois Lane', 'Superman', ['Lois']),
  row('Jor-El', 'Jor-El', 'Superman', ['Jor El']),
  row('Max Rockatansky', 'Max Rockatansky', 'Mad Max', ['Max', 'Mad Max']),
  row('Jack Torrance', 'Jack Torrance', 'The Shining', [
    'Jack',
    'O Iluminado',
  ]),
  row('Marty McFly', 'Marty McFly', 'Back to the Future', [
    'Marty',
    'De Volta para o Futuro',
  ]),
  row('Emmett Brown', 'Emmett Brown', 'Back to the Future', [
    'Doc Brown',
    'Emmett Brow',
    'Doc',
  ]),
  row('Totoro', 'Totoro', 'My Neighbor Totoro', ['Meu Amigo Totoro']),
  row('Yoda', 'Yoda', 'The Empire Strikes Back', ['Star Wars']),
  row('Boba Fett', 'Boba Fett', 'The Empire Strikes Back', ['Boba']),
  row('Tony Montana', 'Tony Montana', 'Scarface', ['Tony']),
  row('R.J. MacReady', 'MacReady', 'The Thing', ['Macready', 'The Thing']),
  row('Rick Deckard', 'Deckard', 'Blade Runner', ['Deckhard', 'Rick Deckard']),
  row('Roy Batty', 'Roy Batty', 'Blade Runner', ['Batty']),
  row('Anakin Skywalker', 'Anakin Skywalker', 'Star Wars', ['Anakin']),
  row('Emperor Palpatine', 'Emperor Palpatine', 'Star Wars', [
    'Palpatine',
    'Darth Sidious',
  ]),
  row('Beetlejuice', 'Beetlejuice', 'Beetlejuice', [
    'Adam',
    'Betelgeuse',
    'Os Fantasmas se Divertem',
  ]),
  row('John McClane', 'John McClane', 'Die Hard', [
    'McClane',
    'Duro de Matar',
  ]),
  row('Indiana Jones', 'Indiana Jones', 'Raiders of the Lost Ark', [
    'Indy',
    'Henry Jones',
  ]),
  row('E.T.', 'E.T.', 'E.T. the Extra-Terrestrial', [
    'ET',
    'Elliott',
    'Elliot',
  ]),
  row('Gunnery Sergeant Hartman', 'Sargento Hartman', 'Full Metal Jacket', [
    'Hartman',
    'Sgt. Hartman',
  ]),
  row('Kaneda', 'Kaneda', 'Akira', []),
  row('Tetsuo', 'Tetsuo', 'Akira', []),
  row('Pete Mitchell', 'Maverick', 'Top Gun', ['Maverick', 'Pete Mitchell']),
  row('T-800', 'Exterminador', 'The Terminator', [
    'Terminator',
    'Exterminador do Futuro',
    'T800',
  ]),
  row('Kyle Reese', 'Kyle Reese', 'The Terminator', [
    'Kyle Rease',
    'Reese',
  ]),
  row('Sarah Connor', 'Sarah Connor', 'The Terminator', ['Sarah']),
  row('Nancy Thompson', 'Nancy Thompson', 'A Nightmare on Elm Street', [
    'Nancy',
    'Nancy Thmopson',
  ]),
  row('Freddy Krueger', 'Freddy Krueger', 'A Nightmare on Elm Street', [
    'Freddy',
    'Freddy Kruger',
  ]),
  row('Peter Venkman', 'Peter Venkman', 'Ghostbusters', [
    'Venkman',
    'Dr. Peter Venkman',
    'Caça-Fantasmas',
  ]),
  row('John Merrick', 'John Merrick', 'The Elephant Man', [
    'O Homem Elefante',
    'Elephant Man',
  ]),
  row('Ash Williams', 'Ash Williams', 'The Evil Dead', [
    'Ash',
    'Evil Dead',
  ]),
  row('Seth Brundle', 'Seth Brundle', 'The Fly', [
    'Brundle',
    'A Mosca',
  ]),
  row('Ariel', 'Ariel', 'The Little Mermaid', ['A Pequena Sereia']),
  row('Ursula', 'Úrsula', 'The Little Mermaid', ['Ursula', 'Ursúla']),
  row('Sebastian', 'Sebastian', 'The Little Mermaid', ['Sebastião']),
  row('Batman', 'Batman', 'Batman', ['Bruce Wayne']),
  row('Joker', 'Joker', 'Batman', ['The Joker']),
  row('Dutch Schaefer', 'Dutch Schaefer', 'Predator', [
    'Dutch',
    'Major Dutch',
    'Predador',
  ]),
  row('Predator', 'Predador', 'Predator', ['O Predador']),
  row('Pinhead', 'Pinhead', 'Hellraiser', []),
  row('Larry', 'Larry', 'Hellraiser', ['Cenobite Larry']),
  row('Julia Cotton', 'Julia', 'Hellraiser', ['Julia']),
  row('Kirsty Cotton', 'Kirsty Cotton', 'Hellraiser', ['Kirsty']),
  row('Butterball', 'Butterball', 'Hellraiser', []),
  row('Chatterer', 'Chatterer', 'Hellraiser', ['Chattered']),
  row('Female Cenobite', 'Female Cenobite', 'Hellraiser', []),
  row('Roger Rabbit', 'Roger Rabbit', "Who Framed Roger Rabbit", [
    'Roger',
  ]),
  row('RoboCop', 'RoboCop', 'RoboCop', ['Alex Murphy']),
  row('Stripe', 'Stripe', 'Gremlins', ['Gremlin']),
  row('Gizmo', 'Gizmo', 'Gremlins', ['Mogwai']),
]

/** Dia 1 do modo Personagem = Odeo (BRT). */
export const CHARACTER_EPOCH = '2026-10-30'

export async function seedCharacterCatalog(client) {
  let inserted = 0
  let updated = 0

  await client.query(`
    ALTER TABLE characters
      ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0
  `)

  const keepNames = CHARACTER_CATALOG.map((c) => c.name.toLowerCase())

  // Tira dailies e personagens sem foto / fora do catálogo ativo
  await client.query(
    `DELETE FROM character_daily d
     USING characters c
     WHERE d.character_id = c.id
       AND NOT (lower(c.name) = ANY($1::text[]))`,
    [keepNames],
  )
  await client.query(
    `DELETE FROM characters WHERE NOT (lower(name) = ANY($1::text[]))`,
    [keepNames],
  )

  for (let i = 0; i < CHARACTER_CATALOG.length; i++) {
    const c = CHARACTER_CATALOG[i]
    const sortOrder = i + 1
    const { rows } = await client.query(
      `SELECT id FROM characters WHERE lower(name) = lower($1)`,
      [c.name],
    )
    if (rows.length === 0) {
      await client.query(
        `INSERT INTO characters
           (name, name_pt, aliases, film_title, image_path, attribution, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          c.name,
          c.name_pt,
          c.aliases,
          c.film_title,
          c.image_path,
          c.attribution,
          sortOrder,
        ],
      )
      inserted += 1
    } else {
      await client.query(
        `UPDATE characters
         SET name_pt = $2, aliases = $3, film_title = $4,
             image_path = $5, attribution = $6, sort_order = $7
         WHERE id = $1`,
        [
          rows[0].id,
          c.name_pt,
          c.aliases,
          c.film_title,
          c.image_path,
          c.attribution,
          sortOrder,
        ],
      )
      updated += 1
    }
  }

  // Uma vez: zera dailies/plays antigos (placeholders) e começa do epoch
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key text PRIMARY KEY,
      value text NOT NULL
    )
  `)
  const { rows: meta } = await client.query(
    `SELECT value FROM app_meta WHERE key = 'character_photo_seq_v1'`,
  )
  if (!meta[0]) {
    await client.query(`DELETE FROM character_daily`)
    await client.query(`DELETE FROM user_character_daily_plays`)
    await client.query(
      `INSERT INTO app_meta (key, value) VALUES ('character_photo_seq_v1', '1')
       ON CONFLICT (key) DO NOTHING`,
    )
  }

  return { inserted, updated, total: CHARACTER_CATALOG.length }
}
