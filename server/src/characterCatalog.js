/** Curadoria CineBlitz — fotos em web/public/characters/{slug}.jpg */

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

/** @type {Array<{name:string,name_pt:string,film_title:string,aliases:string[],image_path:string,attribution:string}>} */
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
  row('Mickey Mouse', 'Mickey Mouse', 'Steamboat Willie', ['Mickey']),
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
  row('Jöns', 'Jöns', 'The Seventh Seal', ['Jons', 'O Sétimo Selo']),
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
  row('Don Lockwood', 'Don Lockwood', 'Singin\' in the Rain', [
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
  row('Pongo', 'Pongo', 'One Hundred and One Dalmatians', []),
  row('George Taylor', 'George Taylor', 'Planet of the Apes', [
    'Planeta dos Macacos',
    'Taylor',
  ]),
  row('Cornelius', 'Cornelius', 'Planet of the Apes', []),
  row('Woman (Onibaba)', 'Woman', 'Onibaba', ['Onibaba']),
  row('James Bond', 'James Bond', 'Dr. No', ['007', 'Bond']),
  row('Don Vito Corleone', 'Don Corleone', 'The Godfather', [
    'Vito Corleone',
    'Poderoso Chefão',
  ]),
  row('Michael Corleone', 'Michael Corleone', 'The Godfather', []),
  row('Travis Bickle', 'Travis', 'Taxi Driver', ['Travis Bickle']),
  row('Luke Skywalker', 'Luke Skywalker', 'Star Wars', ['Luke']),
  row('Han Solo', 'Han Solo', 'Star Wars', []),
  row('Princess Leia', 'Princesa Leia', 'Star Wars', ['Leia']),
  row('Grand Moff Tarkin', 'Grand Moff Tarkin', 'Star Wars', ['Tarkin']),
  row('Obi-Wan Kenobi', 'Obi-Wan', 'Star Wars', ['Obi-Wan Kenobi', 'Obwain']),
  row('C-3PO', 'C-3PO', 'Star Wars', ['C3PO', 'Threepio']),
  row('R2-D2', 'R2-D2', 'Star Wars', ['R2D2', 'Artoo']),
  row('Chewbacca', 'Chewbacca', 'Star Wars', ['Chewie']),
  row('Darth Vader', 'Darth Vader', 'Star Wars', ['Vader']),
  row('Xenomorph', 'Alien', 'Alien', ['Xenomorph', 'Alien']),
  row('Ellen Ripley', 'Ripley', 'Alien', ['Ellen Ripley']),
  row('Bruce', 'Tubarão', 'Jaws', ['Jaws', 'Shark']),
  row('Martin Brody', 'Brody', 'Jaws', ['Martin Brody']),
  row('Alex DeLarge', 'Alex', 'A Clockwork Orange', [
    'Laranja Mecânica',
    'Alex DeLarge',
  ]),
  row('Frank-N-Furter', 'Dr. Frank-N-Furter', 'The Rocky Horror Picture Show', [
    'Frank N Furter',
  ]),
  row('Laurie Strode', 'Laurie', 'Halloween', ['Laurie Strode']),
  row('Michael Myers', 'Michael Myers', 'Halloween', ['Myers']),
  row('Carrie White', 'Carrie', 'Carrie', ['Carrie a Estranha']),
  row('Leatherface', 'Leatherface', 'The Texas Chain Saw Massacre', [
    'O Massacre da Serra Elétrica',
  ]),
  row('Chris MacNeil', 'Chris MacNeil', 'The Exorcist', ['O Exorcista']),
  row('Regan MacNeil', 'Regan', 'The Exorcist', ['Regan']),
  row('Father Karras', 'Karras', 'The Exorcist', ['Damien Karras']),
  row('Father Merrin', 'Merrin', 'The Exorcist', ['Marrie', 'Lankester Merrin']),
  row('Sandy Olsson', 'Sandy', 'Grease', ['Sandy Olsson']),
  row('Danny Zuko', 'Danny', 'Grease', ['Danny Zuko']),
  row('Rocky Balboa', 'Rocky Balboa', 'Rocky', ['Rocky']),
  row('Apollo Creed', 'Apollo Creed', 'Rocky', ['Apollo']),
  row('Henry Spencer', 'Henry Spencer', 'Eraserhead', ['Henry']),
  row('Suzy Bannion', 'Suzy', 'Suspiria', ['Suzy Bannion']),
  row('King Arthur', 'Rei Arthur', 'Monty Python and the Holy Grail', [
    'Arthur',
  ]),
  row('Black Knight', 'Cavaleiro Negro', 'Monty Python and the Holy Grail', []),
  row('Willy Wonka', 'Willy Wonka', 'Willy Wonka & the Chocolate Factory', [
    'Wonka',
  ]),
  row('Winslow Leach', 'Winslow Leach', 'Phantom of the Paradise', []),
  row('Divine', 'Divine', 'Pink Flamingos', []),
  row('Superman', 'Superman', 'Superman (1978)', ['Clark Kent']),
  row('Lex Luthor', 'Lex Luthor', 'Superman (1978)', ['Lex Luther']),
  row('Lois Lane', 'Lois Lane', 'Superman (1978)', []),
  row('Jor-El', 'Jor-El', 'Superman (1978)', []),
  row('Max Rockatansky', 'Mad Max', 'Mad Max', ['Max', 'Mad Max']),
  row('Jack Torrance', 'Jack Torrance', 'The Shining', [
    'O Iluminado',
    'Torrance',
  ]),
  row('Marty McFly', 'Marty McFly', 'Back to the Future', [
    'De Volta para o Futuro',
  ]),
  row('Emmett Brown', 'Emmett Brown', 'Back to the Future', [
    'Doc Brown',
    'Emmett Brow',
  ]),
  row('Totoro', 'Totoro', 'My Neighbor Totoro', ['Meu Amigo Totoro']),
  row('Yoda', 'Yoda', 'The Empire Strikes Back', []),
  row('Boba Fett', 'Boba Fett', 'The Empire Strikes Back', []),
  row('Tony Montana', 'Tony Montana', 'Scarface', ['Scarface']),
  row('R.J. MacReady', 'MacReady', 'The Thing', ['Macready', 'O Enigma de Outro Mundo']),
  row('Rick Deckard', 'Deckard', 'Blade Runner', ['Deckhard']),
  row('Roy Batty', 'Batty', 'Blade Runner', ['Roy Batty']),
  row('Anakin Skywalker', 'Anakin Skywalker', 'Star Wars', ['Anakin']),
  row('Emperor Palpatine', 'Palpatine', 'Star Wars', [
    'Darth Sidious',
    'Palpatine',
  ]),
  row('Adam Maitland', 'Adam', 'Beetlejuice', ['Adam Maitland']),
  row('John McClane', 'John McClane', 'Die Hard', [
    'Duro de Matar',
    'McClane',
  ]),
  row('Indiana Jones', 'Indiana Jones', 'Raiders of the Lost Ark', [
    'Indy',
    'Henry Jones Jr.',
  ]),
  row('Elliott', 'Elliott', 'E.T. the Extra-Terrestrial', ['Elliot', 'E.T.']),
  row('Gunnery Sergeant Hartman', 'Sargento Hartman', 'Full Metal Jacket', [
    'Hartman',
  ]),
  row('Kaneda', 'Kaneda', 'Akira', []),
  row('Tetsuo', 'Tetsuo', 'Akira', []),
  row('Pete Mitchell', 'Maverick', 'Top Gun', ['Maverick']),
  row('T-800', 'Exterminador', 'The Terminator', [
    'Terminator',
    'Exterminador do Futuro',
  ]),
  row('Kyle Reese', 'Kyle Reese', 'The Terminator', ['Kyle Rease']),
  row('Sarah Connor', 'Sarah Connor', 'The Terminator', []),
  row('Nancy Thompson', 'Nancy Thompson', 'A Nightmare on Elm Street', [
    'Nancy Thmopson',
    'A Hora do Pesadelo',
  ]),
  row('Freddy Krueger', 'Freddy Krueger', 'A Nightmare on Elm Street', [
    'Freddy Kruger',
    'Freddy',
  ]),
  row('Peter Venkman', 'Dr. Peter Venkman', 'Ghostbusters', [
    'Venkman',
    'Caça-Fantasmas',
  ]),
  row('John Merrick', 'John Merrick', 'The Elephant Man', [
    'O Homem Elefante',
  ]),
  row('Ash Williams', 'Ash', 'The Evil Dead', ['Ash Williams', 'Evil Dead']),
  row('Seth Brundle', 'Seth Brundle', 'The Fly', ['A Mosca', 'Brundlefly']),
  row('Ariel', 'Ariel', 'The Little Mermaid', ['A Pequena Sereia']),
  row('Ursula', 'Úrsula', 'The Little Mermaid', ['Ursula']),
  row('Sebastian', 'Sebastian', 'The Little Mermaid', []),
  row('Batman', 'Batman', 'Batman (1989)', ['Bruce Wayne']),
  row('Joker', 'Joker', 'Batman (1989)', ['Coringa']),
  row('Dutch Schaefer', 'Major Dutch', 'Predator', [
    'Dutch',
    'Predador',
  ]),
  row('Predator', 'Predador', 'Predator', ['Yautja']),
  row('Pinhead', 'Pinhead', 'Hellraiser', []),
  row('Larry Cotton', 'Larry', 'Hellraiser', []),
  row('Julia Cotton', 'Julia', 'Hellraiser', []),
  row('Kirsty Cotton', 'Kirsty', 'Hellraiser', []),
  row('Butterball', 'Butterball', 'Hellraiser', ['Butterbal']),
  row('Chatterer', 'Chatterer', 'Hellraiser', ['Chattered']),
  row('Female Cenobite', 'Female Cenobite', 'Hellraiser', []),
  row('Roger Rabbit', 'Roger Rabbit', 'Who Framed Roger Rabbit', []),
  row('RoboCop', 'RoboCop', 'RoboCop', ['Alex Murphy']),
  row('Stripe', 'Stripe', 'Gremlins', []),
  row('Gizmo', 'Gizmo', 'Gremlins', ['Gsemo']),
  row('Chucky', 'Chucky', "Child's Play", ['Brinquedo Assassino']),
  row('David Kessler', 'David Kessler', 'An American Werewolf in London', [
    'Lobisomen Americano em Londres',
  ]),
  row('Snake Plissken', 'Snake Plissken', 'Escape from New York', [
    'Fuga de Nova York',
  ]),
  row('Jason Voorhees', 'Jason Voorhees', 'Friday the 13th', [
    'Jason Vorhess',
    'Sexta-Feira 13',
  ]),
  row('Pamela Voorhees', 'Pamela Voorhees', 'Friday the 13th', [
    'Pamela Vorhess',
  ]),
  row('Herbert West', 'Herbert West', 'Re-Animator', ['Reanimator']),
  row('Humungus', 'Humungus', 'Mad Max 2', ['The Humungus']),
  row('John Rambo', 'Rambo', 'First Blood', ['Rambo']),
  row('Tyler Durden', 'Tyler Durden', 'Fight Club', ['Clube da Luta']),
  row('Truman Burbank', 'Truman', 'The Truman Show', [
    'O Show de Truman',
    'Truman Burbank',
  ]),
  row('Forrest Gump', 'Forrest Gump', 'Forrest Gump', ['Forest Gump']),
  row('Clarice Starling', 'Clarice', 'The Silence of the Lambs', [
    'O Silêncio dos Inocentes',
    'Clarice Starling',
  ]),
  row('Hannibal Lecter', 'Hannibal', 'The Silence of the Lambs', [
    'Hanibal',
    'Lecter',
  ]),
  row('Neo', 'Neo', 'The Matrix', ['Thomas Anderson']),
  row('Morpheus', 'Morpheus', 'The Matrix', []),
  row('Trinity', 'Trinity', 'The Matrix', []),
  row('Agent Smith', 'Agente Smith', 'The Matrix', ['Smith']),
  row('Jack Dawson', 'Jack', 'Titanic', ['Jack Dawson']),
  row('Rose DeWitt Bukater', 'Rose', 'Titanic', ['Rose']),
  row('Sidney Prescott', 'Sidney', 'Scream', ['Pânico', 'Sidney Prescott']),
  row('Billy Loomis', 'Billy', 'Scream', ['Billy Loomis']),
  row('Kevin McCallister', 'Kevin', 'Home Alone', [
    'Esqueceram de Mim',
    'Kevin McCallister',
  ]),
  row('Woody', 'Woody', 'Toy Story', []),
  row('Buzz Lightyear', 'Buzz', 'Toy Story', ['Buzz Lightyear']),
  row('Jessie', 'Jessie', 'Toy Story 2', ['Jassie']),
  row('Mr. Potato Head', 'Senhor Cabeça de Batata', 'Toy Story', [
    'Potato Head',
  ]),
  row('Slinky Dog', 'Slinky', 'Toy Story', ['Slinck']),
  row('Rex', 'Rex', 'Toy Story', ['Red']),
  row('Alan Grant', 'Grant', 'Jurassic Park', ['Dr. Grant']),
  row('Mima Kirigoe', 'Mima', 'Perfect Blue', ['Mima']),
  row('Jack Skellington', 'Jack Skellington', 'The Nightmare Before Christmas', [
    'Estranho Mundo de Jack',
    'Jack',
  ]),
]

export async function seedCharacterCatalog(client) {
  let inserted = 0
  let updated = 0
  for (const c of CHARACTER_CATALOG) {
    const { rows } = await client.query(
      `SELECT id, image_path FROM characters WHERE lower(name) = lower($1)`,
      [c.name],
    )
    if (rows.length === 0) {
      await client.query(
        `INSERT INTO characters (name, name_pt, aliases, film_title, image_path, attribution)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          c.name,
          c.name_pt,
          c.aliases,
          c.film_title,
          c.image_path,
          c.attribution,
        ],
      )
      inserted += 1
    } else {
      // Atualiza aliases/filme; só troca image_path se ainda for pôster de teste
      const cur = rows[0].image_path || ''
      const nextPath = cur.startsWith('/posters/') ? c.image_path : cur
      await client.query(
        `UPDATE characters
         SET name_pt = $2, aliases = $3, film_title = $4,
             image_path = $5, attribution = $6
         WHERE id = $1`,
        [
          rows[0].id,
          c.name_pt,
          c.aliases,
          c.film_title,
          nextPath,
          c.attribution,
        ],
      )
      updated += 1
    }
  }
  return { inserted, updated, total: CHARACTER_CATALOG.length }
}
