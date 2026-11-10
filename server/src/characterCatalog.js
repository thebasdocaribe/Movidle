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

/** Sem foto ainda — fica no banco, fora do diário até virar row() com JPG. */
function pending(name, namePt, film, aliases = []) {
  const all = [...new Set([name, namePt, ...aliases].filter(Boolean))]
  return {
    name,
    name_pt: namePt || name,
    film_title: film,
    aliases: all.filter((a) => a !== name),
    image_path: `/pending/${slug(namePt || name)}.jpg`,
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
  row('Chucky', 'Chucky', "Child's Play", ['Charles Lee Ray']),
  row('David Kessler', 'David Kessler', 'An American Werewolf in London', [
    'Kessler',
    'Lobisomem Americano em Londres',
  ]),
  row('Snake Plissken', 'Snake Plissken', 'Escape from New York', [
    'Snake',
    'Fuga de Nova York',
  ]),
  row('Jason Voorhees', 'Jason Voorhees', 'Friday the 13th', [
    'Jason',
    'Jason Vorhess',
  ]),
  row('Pamela Voorhees', 'Pamela Voorhees', 'Friday the 13th', [
    'Pamela',
    'Mrs. Voorhees',
  ]),
  row('Herbert West', 'Herbert West', 'Re-Animator', [
    'Dr. West',
    'West',
  ]),
  row('Humungus', 'Humungus', 'Mad Max 2', [
    'The Humungus',
    'Lord Humungus',
  ]),
  row('John Rambo', 'Rambo', 'First Blood', ['John Rambo', 'Rambo']),
  row('Tyler Durden', 'Tyler Durden', 'Fight Club', [
    'Tyler',
    'Clube da Luta',
  ]),
  row('Truman Burbank', 'Truman', 'The Truman Show', [
    'Truman Burbank',
    'O Show de Truman',
  ]),
  row('Forrest Gump', 'Forrest Gump', 'Forrest Gump', ['Forest Gump']),
  row('Clarice Starling', 'Clarice Starling', 'The Silence of the Lambs', [
    'Clarice',
    'O Silêncio dos Inocentes',
  ]),
  row('Hannibal Lecter', 'Hannibal Lecter', 'The Silence of the Lambs', [
    'Hannibal',
    'Hanibal',
    'Lecter',
  ]),
  row('Neo', 'Neo', 'The Matrix', ['Thomas Anderson', 'Matrix']),
  row('Morpheus', 'Morpheus', 'The Matrix', []),
  row('Trinity', 'Trinity', 'The Matrix', []),
  row('Agent Smith', 'Agente Smith', 'The Matrix', [
    'Smith',
    'Agent Smith',
  ]),
  row('Jack Dawson', 'Jack Dawson', 'Titanic', ['Jack']),
  row('Rose DeWitt Bukater', 'Rose', 'Titanic', [
    'Rose Dawson',
    'Rose DeWitt',
  ]),
  row('Sidney Prescott', 'Sidney Prescott', 'Scream', [
    'Sidney',
    'Pânico',
  ]),
  row('Ghostface', 'Ghostface', 'Scream', [
    'Ghost Face',
    'Pânico',
  ]),
  row('Billy Loomis', 'Billy Loomis', 'Scream', ['Billy']),
  row('Kevin McCallister', 'Kevin McCallister', 'Home Alone', [
    'Kevin',
    'Esqueceram de Mim',
  ]),
  row('Woody', 'Woody', 'Toy Story', []),
  row('Buzz Lightyear', 'Buzz Lightyear', 'Toy Story', ['Buzz']),
  row('Rex', 'Rex', 'Toy Story', ['Red']),
  row('Mr. Potato Head', 'Senhor Cabeça de Batata', 'Toy Story', [
    'Potato Head',
    'Cabeça de Batata',
  ]),
  row('Jessie', 'Jessie', "Toy Story 2", ['Jassie']),
  row('Slinky Dog', 'Slinky', 'Toy Story', ['Slinck', 'Slinky Dog']),
  row('Alan Grant', 'Grant', 'Jurassic Park', ['Dr. Grant']),
  row('Mima Kirigoe', 'Mima', 'Perfect Blue', ['Mima']),
  row('Jack Skellington', 'Jack Skellington', 'The Nightmare Before Christmas', [
    'Estranho Mundo de Jack',
    'Jack',
  ]),
  row('Mulan', 'Mulan', 'Mulan', []),
  row('Stanley Ipkiss', 'Stanley Ipkiss', 'The Mask', [
    'O Máscara',
    'The Mask',
    'Ipkiss',
  ]),
  row('Mushu', 'Mushu', 'Mulan', []),
  row('Agent K', 'Kay', 'Men in Black', [
    'K',
    'Agent Kay',
    'Homens de Preto',
  ]),
  row('Agent J', 'Jay', 'Men in Black', [
    'J',
    'Agent Jay',
    'Homens de Preto',
  ]),
  row('Darth Maul', 'Darth Maul', 'Star Wars: Episode I', ['Maul']),
  row('Hercules', 'Hércules', 'Hercules', ['Hercules']),
  row('Matilda Wormwood', 'Matilda', 'Matilda', ['Matilda Wormwood']),
  row('Belle', 'Bela', 'Beauty and the Beast', [
    'A Bela',
    'A Bela e a Fera',
  ]),
  row('Beast', 'Fera', 'Beauty and the Beast', [
    'A Fera',
    'A Bela e a Fera',
  ]),
  row('Flik', 'Flik', "A Bug's Life", [
    'Flink',
    'Vida de Inseto',
    'Vida de Insetos',
  ]),
  row('Gomez Addams', 'Gomez Addams', 'The Addams Family', [
    'Gomez',
    'Família Addams',
  ]),
  row('Morticia Addams', 'Morticia Addams', 'The Addams Family', [
    'Morticia',
    'Família Addams',
  ]),
  row('Wednesday Addams', 'Wednesday', 'The Addams Family', [
    'Wednesday Addams',
    'Wandinha',
    'Família Addams',
  ]),
  row('The Penguin', 'Penguin', 'Batman Returns', [
    'Pinguim',
    'Oswald Cobblepot',
  ]),
  row('Catwoman', 'Catwoman', 'Batman Returns', [
    'Mulher-Gato',
    'Selina Kyle',
  ]),
  row('Blade', 'Blade', 'Blade', ['Eric Brooks']),
  row('Kermit the Frog', 'Kermit', 'The Muppet Movie', [
    'Kermit',
    'Sapo Kermit',
  ]),
  row('Tarzan', 'Tarzan', 'Tarzan', []),
  row('Jane Porter', 'Jane', 'Tarzan', ['Jane Porter']),
  row('Kala', 'Kala', 'Tarzan', []),
  row('Candyman', 'Candyman', 'Candyman', ['Daniel Robitaille']),
  row('The Riddler', 'Charada', 'Batman Forever', [
    'Riddler',
    'Edward Nygma',
  ]),
  row('Two-Face', 'Duas Caras', 'Batman Forever', [
    'Harvey Dent',
    'Two Face',
  ]),
  row('Bugs Bunny', 'Pernalonga', 'Space Jam', ['Bugs']),
  row('Daffy Duck', 'Patolino', 'Space Jam', ['Daffy']),
  row('Ace Ventura', 'Ace Ventura', 'Ace Ventura: Pet Detective', [
    'Ace',
  ]),
  row('Pennywise', 'Pennywise', 'It', [
    'It',
    'Pennywise the Dancing Clown',
  ]),
  row('Samara Morgan', 'Samara', 'The Ring', [
    'Samara',
    'O Chamado',
  ]),
  row('Mr. Freeze', 'Dr. Frio', 'Batman & Robin', [
    'Victor Fries',
    'Mr Freeze',
  ]),
  row('Stuart Little', 'Stuart Little', 'Stuart Little', ['Stuart']),
  row('Casper', 'Gasparzinho', 'Casper', ['Casper the Friendly Ghost']),
  row('Eric Cartman', 'Cartman', 'South Park: Bigger, Longer & Uncut', [
    'Cartman',
    'South Park',
  ]),
  row('Stan Marsh', 'Stan', 'South Park: Bigger, Longer & Uncut', [
    'Stan',
    'South Park',
  ]),
  row('Kenny McCormick', 'Kenny', 'South Park: Bigger, Longer & Uncut', [
    'Kenny',
    'South Park',
  ]),
  row('Kyle Broflovski', 'Kyle', 'South Park: Bigger, Longer & Uncut', [
    'Kyle',
    'South Park',
  ]),
  row('Howard Langston', 'Howard Langston', 'Jingle All the Way', [
    'Um Herói de Brinquedo',
  ]),
  row('Tiffany Valentine', 'Tiffany', 'Bride of Chucky', [
    'Tiffany',
    'A Noiva do Chucky',
  ]),
  row('Lionel Cosgrove', 'Lionel', 'Braindead', [
    'Lionel',
    'Dead Alive',
  ]),
  row('Z', 'Z', 'Antz', ['Formiguinhas', 'Formiginhaz']),
  row('Zorro', 'Zorro', 'The Mask of Zorro', ['Don Diego']),
  row('Mufasa', 'Mufasa', 'The Lion King', ['O Rei Leão']),
  row('Simba', 'Simba', 'The Lion King', ['O Rei Leão']),
  row('Timon', 'Timão', 'The Lion King', ['Timon', 'O Rei Leão']),
  row('Pumbaa', 'Pumba', 'The Lion King', ['Pumbaa', 'O Rei Leão']),
  row('Liu Kang', 'Liu Kang', 'Mortal Kombat', []),
  row('Raiden', 'Raiden', 'Mortal Kombat', ['Rayden']),
  row('Sub-Zero', 'Sub-Zero', 'Mortal Kombat', ['Sub Zero']),
  row('Scorpion', 'Scorpion', 'Mortal Kombat', [
    'Scorpian',
    'Hanzo Hasashi',
  ]),
  row('Darkman', 'Darkman', 'Darkman', ['Peyton Westlake']),
  row('Sherman Klump', 'Sherman Klump', 'The Nutty Professor', [
    'Professor Aloprado',
    'Buddy Love',
  ]),
  row('Wallace', 'Wallace', 'Wallace & Gromit', []),
  row('Gromit', 'Gromit', 'Wallace & Gromit', []),
  row('Leprechaun', 'Leprechaun', 'Leprechaun', []),
  row('Spawn', 'Spawn', 'Spawn', ['Al Simmons']),
  row('Judge Dredd', 'Juiz Dredd', 'Judge Dredd', [
    'Dredd',
    'Joseph Dredd',
  ]),
  row('Leonardo', 'Leonardo', 'Teenage Mutant Ninja Turtles', [
    'Leo',
    'Tartarugas Ninja',
  ]),
  row('Raphael', 'Raphael', 'Teenage Mutant Ninja Turtles', [
    'Raph',
    'Tartarugas Ninja',
  ]),
  row('Donatello', 'Donatello', 'Teenage Mutant Ninja Turtles', [
    'Donnie',
    'Tartarugas Ninja',
  ]),
  row('Michelangelo', 'Michelangelo', 'Teenage Mutant Ninja Turtles', [
    'Mikey',
    'Miquelangelo',
    'Tartarugas Ninja',
  ]),
  row('The Djinn', 'Djinn', 'Wishmaster', [
    'Djin',
    'Mestre dos Desejos',
  ]),
  row('Aladdin', 'Aladin', 'Aladdin', ['Aladdin']),
  row('Genie', 'Gênio', 'Aladdin', [
    'Djin Aladin',
    'Genie',
    'Gênio da Lâmpada',
  ]),
  row('Chihiro', 'Chihiro', 'Spirited Away', [
    'Sen',
    'A Viagem de Chihiro',
  ]),
  row('Haku', 'Haku', 'Spirited Away', [
    'A Viagem de Chihiro',
  ]),
  row('Frank', 'Frank', 'Donnie Darko', ['Frank the Rabbit']),
  row('Donnie Darko', 'Donnie Darko', 'Donnie Darko', ['Donnie']),
  row('WALL-E', 'WALL-E', 'WALL-E', ['Wall-E', 'Walle']),
  row('EVE', 'EVA', 'WALL-E', ['Eve', 'EVA']),
  row('Remy', 'Remy', 'Ratatouille', ['Remy Ratatouille']),
  row('Linguini', 'Linguini', 'Ratatouille', ['Alfredo Linguini']),
  row('Coraline Jones', 'Coraline', 'Coraline', ['Coraline']),
  row('Other Mother', 'Outra Mãe', 'Coraline', [
    'Beldam',
    'Outra Mae',
  ]),
  row('Frodo Baggins', 'Frodo', 'The Lord of the Rings', [
    'Frodo',
    'Senhor dos Anéis',
  ]),
  row('Samwise Gamgee', 'Sam', 'The Lord of the Rings', [
    'Sam',
    'Samwise',
    'Senhor dos Anéis',
  ]),
  row('Gandalf', 'Gandalf', 'The Lord of the Rings', [
    'Gandalf the Grey',
    'Senhor dos Anéis',
  ]),
  row('Aragorn', 'Aragorn', 'The Lord of the Rings', [
    'Strider',
    'Senhor dos Anéis',
  ]),
  row('Saruman', 'Saruman', 'The Lord of the Rings', [
    'Saruman the White',
    'Senhor dos Anéis',
  ]),
  row('Legolas', 'Legolas', 'The Lord of the Rings', [
    'Senhor dos Anéis',
  ]),
  row('Gimli', 'Gimli', 'The Lord of the Rings', [
    'Senhor dos Anéis',
  ]),
  row('Sauron', 'Sauron', 'The Lord of the Rings', [
    'Senhor dos Anéis',
  ]),
  row('Harry Potter', 'Harry Potter', 'Harry Potter', ['Harry']),
  row('Ron Weasley', 'Ron Weasley', 'Harry Potter', [
    'Ron',
    'Ron Wesley',
  ]),
  row('Hermione Granger', 'Hermione', 'Harry Potter', [
    'Hermione Granger',
  ]),
  row('Albus Dumbledore', 'Dumbledore', 'Harry Potter', [
    'Dumbledor',
    'Albus Dumbledore',
  ]),
  row('Sirius Black', 'Sirius Black', 'Harry Potter', ['Sirius']),
  row('Lord Voldemort', 'Voldemort', 'Harry Potter', [
    'Voldemort',
    'Tom Riddle',
  ]),
  row('Peter Parker', 'Peter Parker', 'Spider-Man', [
    'Spider-Man',
    'Homem-Aranha',
  ]),
  row('Mary Jane Watson', 'Mary Jane', 'Spider-Man', [
    'MJ',
    'Mary Jane',
  ]),
  row('Harry Osborn', 'Harry Osborn', 'Spider-Man', [
    'Harry Osbon',
  ]),
  row('Doctor Octopus', 'Doc Otto', 'Spider-Man 2', [
    'Doc Ock',
    'Otto Octavius',
  ]),
  row('Shrek', 'Shrek', 'Shrek', []),
  row('Puss in Boots', 'Gato de Botas', 'Shrek 2', [
    'Gato',
    'Puss',
  ]),
  row('Donkey', 'Burro', 'Shrek', []),
  row('Fiona', 'Fiona', 'Shrek', ['Princesa Fiona']),
  row('Lightning McQueen', 'Relâmpago McQueen', 'Cars', [
    'McQueen',
    'Relampago Macquin',
    'Carros',
  ]),
  row('James P. Sullivan', 'Sullivan', 'Monsters, Inc.', [
    'Sulley',
    'Sulli',
    'Sully',
    'Monstros S.A.',
  ]),
  row('Mike Wazowski', 'Mike Wazowski', 'Monsters, Inc.', [
    'Mike',
    'Mick Wasalski',
    'Monstros S.A.',
  ]),
  row('Rocket', 'Buscapé', 'City of God', [
    'Buscapé',
    'Cidade de Deus',
  ]),
  row('Lil Zé', 'Zé Pequeno', 'City of God', [
    'Ze Pequeno',
    'Cidade de Deus',
  ]),
  row('Benny', 'Bené', 'City of God', [
    'Bene',
    'Cidade de Deus',
  ]),
  row('Patrick Bateman', 'Patrick Bateman', 'American Psycho', [
    'Patrick Betman',
    'Psicopata Americano',
  ]),
  row('Jake Sully', 'Jake Sully', 'Avatar', ['Sully']),
  row('Bella Swan', 'Bella Swan', 'Twilight', [
    'Bela Swan',
    'Crepúsculo',
  ]),
  row('Edward Cullen', 'Edward Cullen', 'Twilight', [
    'Edward',
    'Crepúsculo',
  ]),
  row('Anton Chigurh', 'Anton Chigurh', 'No Country for Old Men', [
    'Chigurh',
  ]),
  row('Tony Stark', 'Tony Stark', 'Iron Man', [
    'Iron Man',
    'Homem de Ferro',
  ]),
  row('Oh Dae-su', 'Oh Dae-su', 'Oldboy', [
    'Oh Dae Su',
    'Old Boy',
  ]),
  row('Maximus', 'Maximus', 'Gladiator', [
    'Maximus Decimus Meridius',
    'Gladiador',
  ]),
  row('Commodus', 'Commodus', 'Gladiator', ['Gladiador']),
  row('Bob Parr', 'Beto Pêra', 'The Incredibles', [
    'Mr. Incredible',
    'Sr. Incrível',
    'Os Incríveis',
  ]),
  row('Violet Parr', 'Violeta', 'The Incredibles', [
    'Violet',
    'Os Incríveis',
  ]),
  row('Dash Parr', 'Flecha', 'The Incredibles', [
    'Dash',
    'Flasha',
    'Os Incríveis',
  ]),
  row('Helen Parr', 'Helena Pêra', 'The Incredibles', [
    'Elastigirl',
    'Mulher-Elástica',
    'Os Incríveis',
  ]),
  row('Jack-Jack Parr', 'Zezé', 'The Incredibles', [
    'Jack-Jack',
    'Zeze',
    'Os Incríveis',
  ]),
  row('Syndrome', 'Síndrome', 'The Incredibles', [
    'Buddy Pine',
    'Os Incríveis',
  ]),
  row('Carl Fredricksen', 'Carl Fredricksen', 'Up', [
    'Carl',
    'Up - Altas Aventuras',
  ]),
  row('Russell', 'Russell', 'Up', [
    'Russel',
    'Up - Altas Aventuras',
  ]),
  row('Sara Goldfarb', 'Sara Goldfarb', 'Requiem for a Dream', [
    'Réquiem para um Sonho',
  ]),
  row('Seth', 'Seth', 'Superbad', ['Super Bad']),
  row('Evan', 'Evan', 'Superbad', []),
  row('Fogell', 'Fogell', 'Superbad', ['McLovin']),
  row('Amélie Poulain', 'Amélie Poulain', 'Amélie', [
    'Amelie',
    'Amelie Poulan',
    'O Fabuloso Destino de Amélie Poulain',
  ]),
  row('Victor Van Dort', 'Victor Van Dort', 'Corpse Bride', [
    'Victor van Dorf',
    'A Noiva Cadáver',
  ]),
  row('Beatrix Kiddo', 'A Noiva', 'Kill Bill', [
    'The Bride',
    'Black Mamba',
    'A Noiva Kill Bill',
  ]),
  row('Jack Sparrow', 'Jack Sparrow', 'Pirates of the Caribbean', [
    'Capitão Jack Sparrow',
    'Piratas do Caribe',
  ]),
  row('Will Turner', 'Will Turner', 'Pirates of the Caribbean', [
    'William Turner',
    'Piratas do Caribe',
  ]),
  row('Davy Jones', 'Davy Jones', 'Pirates of the Caribbean', [
    'Piratas do Caribe',
  ]),
]

/**
 * Sem foto ainda — fora do diário até virar row() com JPG.
 */
export const CHARACTER_PENDING = [
  pending('Juno MacGuff', 'Juno', 'Juno', ['Juno MacGuff']),
]

/** Dia 1 do modo Personagem = Odeo (BRT). */
export const CHARACTER_EPOCH = '2026-10-30'

async function upsertCharacter(client, c, sortOrder) {
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
    return 'inserted'
  }
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
  return 'updated'
}

export async function seedCharacterCatalog(client) {
  let inserted = 0
  let updated = 0

  await client.query(`
    ALTER TABLE characters
      ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0
  `)

  const keepNames = [...CHARACTER_CATALOG, ...CHARACTER_PENDING].map((c) =>
    c.name.toLowerCase(),
  )

  // Tira dailies e personagens fora do catálogo ativo + pendente
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
    const result = await upsertCharacter(client, CHARACTER_CATALOG[i], i + 1)
    if (result === 'inserted') inserted += 1
    else updated += 1
  }

  for (let i = 0; i < CHARACTER_PENDING.length; i++) {
    const result = await upsertCharacter(
      client,
      CHARACTER_PENDING[i],
      10000 + i,
    )
    if (result === 'inserted') inserted += 1
    else updated += 1
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

  return {
    inserted,
    updated,
    total: CHARACTER_CATALOG.length,
    pending: CHARACTER_PENDING.length,
  }
}
