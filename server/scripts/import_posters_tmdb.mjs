/**
 * Importa pôsteres + metadados TMDB para o modo Poster.
 *
 * Uso:
 *   node scripts/import_posters_tmdb.mjs --decade 2020
 *   node scripts/import_posters_tmdb.mjs --decade 2020 --dry-run
 *
 * Env: DATABASE_URL, TMDB_API_KEY (via server/.env)
 */
import dotenv from 'dotenv'
dotenv.config()

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const POSTERS_DIR = path.join(ROOT, 'web/public/posters')
const TMDB = 'https://api.themoviedb.org/3'
const IMG = 'https://image.tmdb.org/t/p/w500'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const decadeIdx = args.indexOf('--decade')
const decadeStart = decadeIdx >= 0 ? Number(args[decadeIdx + 1]) : 2020
const decadeEnd = decadeStart + 9

function apiKey() {
  const k = process.env.TMDB_API_KEY?.trim()
  if (!k) throw new Error('TMDB_API_KEY ausente')
  return k
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function tmdb(pathname, params = {}) {
  const url = new URL(`${TMDB}${pathname}`)
  url.searchParams.set('api_key', apiKey())
  url.searchParams.set('language', 'pt-BR')
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') url.searchParams.set(k, String(v))
  }
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`TMDB ${pathname} ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

function yearOf(m) {
  const d = m.release_date || m.first_air_date || ''
  const y = Number(d.slice(0, 4))
  return Number.isFinite(y) ? y : null
}

function pickInDecade(results, preferredYear = null) {
  const list = (results || []).filter((m) => m.poster_path)
  if (!list.length) return null

  const inDecade = list.filter((m) => {
    const y = yearOf(m)
    return y != null && y >= decadeStart && y <= decadeEnd
  })
  const pool = inDecade.length ? inDecade : list

  if (preferredYear != null) {
    const exact = pool.find((m) => yearOf(m) === preferredYear)
    if (exact) return exact
    pool.sort(
      (a, b) =>
        Math.abs((yearOf(a) || 0) - preferredYear) -
        Math.abs((yearOf(b) || 0) - preferredYear),
    )
    return pool[0]
  }

  pool.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
  return pool[0]
}

function regionFrom(details) {
  const c = details.production_countries?.[0]?.iso_3166_1
  const map = {
    US: 'EUA',
    BR: 'Brasil',
    GB: 'Reino Unido',
    UK: 'Reino Unido',
    FR: 'França',
    DE: 'Alemanha',
    IT: 'Itália',
    ES: 'Espanha',
    JP: 'Japão',
    KR: 'Coreia do Sul',
    CN: 'China',
    MX: 'México',
    CA: 'Canadá',
    AU: 'Austrália',
    NZ: 'Nova Zelândia',
    SE: 'Suécia',
    NO: 'Noruega',
    DK: 'Dinamarca',
    FI: 'Finlândia',
    IE: 'Irlanda',
    NL: 'Holanda',
    BE: 'Bélgica',
    PT: 'Portugal',
    AR: 'Argentina',
    CL: 'Chile',
    IN: 'Índia',
    LV: 'Letônia',
  }
  return map[c] || c || '—'
}

const PERSON_IMG = 'https://image.tmdb.org/t/p/w185'

function personSlot(p) {
  if (!p?.name) return null
  return {
    name: p.name,
    image_url: p.profile_path ? `${PERSON_IMG}${p.profile_path}` : null,
  }
}

function buildCastJson(details, credits) {
  const crew = credits.crew || []
  const cast = credits.cast || []

  const writers = crew.filter(
    (c) =>
      c.job === 'Screenplay' ||
      c.job === 'Writer' ||
      c.job === 'Story' ||
      c.department === 'Writing',
  )
  const writer = writers[0] || null
  const lead = cast[0] || null
  const secondary = cast[1] || null
  // Heurística: primeiro crédito com "antagon" no character, senão 3º do elenco
  const antHit =
    cast.find((c) => /antagon|villain|killer|monster/i.test(c.character || '')) ||
    cast[2] ||
    null
  const director = crew.find((c) => c.job === 'Director') || null

  return {
    region: regionFrom(details),
    director_image_url: director?.profile_path
      ? `${PERSON_IMG}${director.profile_path}`
      : null,
    screenwriter: personSlot(writer),
    protagonist: personSlot(lead),
    antagonist: antHit ? personSlot(antHit) : { none: true },
    secondary: personSlot(secondary),
  }
}

function directorOf(credits) {
  return credits.crew?.find((c) => c.job === 'Director')?.name || null
}

function aliasesFor(details, label) {
  const set = new Set()
  if (details.title) set.add(details.title)
  if (details.original_title) set.add(details.original_title)
  if (label) set.add(label)
  // title_pt virá separado
  return [...set].filter(Boolean)
}

async function downloadPoster(posterPath, destFile) {
  const url = `${IMG}${posterPath}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download poster ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(destFile, buf)
}

function nextPosterNum() {
  const nums = fs
    .readdirSync(POSTERS_DIR)
    .map((f) => Number(/^(\d+)\.jpe?g$/i.exec(f)?.[1]))
    .filter((n) => Number.isFinite(n))
  return (nums.length ? Math.max(...nums) : 0) + 1
}

/**
 * label = como o user escreveu
 * query = busca TMDB (EN/título oficial)
 * year = ano preferido (opcional)
 * tmdbId = força ID (opcional)
 */
const BATCH_2020 = [
  { label: 'obsessão', query: 'Obsession', year: 2023 }, // possible miss — flag if wrong
  { label: 'sinners', query: 'Sinners', year: 2025 },
  { label: 'barbie', query: 'Barbie', year: 2023 },
  { label: 'odisseia', query: 'The Odyssey', year: 2026 },
  { label: 'spiederman', query: 'Spider-Man: No Way Home', year: 2021 },
  { label: 'oppenheimer', query: 'Oppenheimer', year: 2023 },
  { label: 'substancia', query: 'The Substance', year: 2024 },
  { label: 'dune 1', query: 'Dune', year: 2021 },
  { label: 'the batman', query: 'The Batman', year: 2022 },
  { label: 'spiderman aranhaverso', query: 'Spider-Man: Across the Spider-Verse', year: 2023 },

  { label: 'marty supreme', query: 'Marty Supreme', year: 2025 },
  { label: 'Superman', query: 'Superman', year: 2025 },
  { label: 'weapons', query: 'Weapons', year: 2025 },
  { label: 'drama', query: 'The Drama', year: 2025 },
  { label: 'uma batalha após a putra', query: 'One Battle After Another', year: 2025 },
  { label: 'saltburn', query: 'Saltburn', year: 2023 },
  { label: 'nosferatu', query: 'Nosferatu', year: 2024 },
  { label: 'the menu', query: 'The Menu', year: 2022 },
  { label: 'Frankenstein', query: 'Frankenstein', year: 2025 },
  { label: 'wicked', query: 'Wicked', year: 2024 },

  { label: 'pobres criaturas', query: 'Poor Things', year: 2023 },
  { label: 'anora', query: 'Anora', year: 2024 },
  { label: 'deadpool x Wolverine', query: 'Deadpool & Wolverine', year: 2024 },
  { label: 'Mickey 17', query: 'Mickey 17', year: 2025 },
  { label: 'bugonia', query: 'Bugonia', year: 2025 },
  { label: 'pearl', query: 'Pearl', year: 2022 },
  { label: 'avatar', query: 'Avatar: The Way of Water', year: 2022 },
  { label: 'vidas passadas', query: 'Past Lives', year: 2023 },
  { label: 'hamnet', query: 'Hamnet', year: 2025 },
  { label: 'soul', query: 'Soul', year: 2020 },

  { label: 'conclave', query: 'Conclave', year: 2024 },
  { label: 'thunderbolts', query: 'Thunderbolts*', year: 2025 },
  { label: 'topgun maverick', query: 'Top Gun: Maverick', year: 2022 },
  { label: 'f1', query: 'F1', year: 2025 },
  { label: 'guardiões da galáxia 3', query: 'Guardians of the Galaxy Vol. 3', year: 2023 },
  { label: 'nope', query: 'Nope', year: 2022 },
  { label: 'resident evil', query: 'Resident Evil: Welcome to Raccoon City', year: 2021 },
  { label: 'michael jackon', query: 'Michael', year: 2025 },
  { label: 'long legs', query: 'Longlegs', year: 2024 },
  { label: 'guerreiras do k-pop', query: 'KPop Demon Hunters', year: 2025 },

  { label: 'zootopia', query: 'Zootopia 2', year: 2025 },
  { label: 'x', query: 'X', year: 2022 },
  { label: 'tenet', query: 'Tenet', year: 2020 },
  { label: 'dr estranho multiverso', query: 'Doctor Strange in the Multiverse of Madness', year: 2022 },
  { label: 'gato de botas 2', query: 'Puss in Boots: The Last Wish', year: 2022 },
  { label: 'barbarian', query: 'Barbarian', year: 2022 },
  { label: 'minecraf', query: 'A Minecraft Movie', year: 2025 },
  { label: 'wonka', query: 'Wonka', year: 2023 },
  { label: 'fnaf filme', query: "Five Nights at Freddy's", year: 2023 },
  { label: 'talk to me', query: 'Talk to Me', year: 2023 },

  { label: 'killers of the flower moon', query: 'Killers of the Flower Moon', year: 2023 },
  { label: 'gladiador 2', query: 'Gladiator II', year: 2024 },
  { label: 'telefone preto', query: 'The Black Phone', year: 2021 },
  { label: 'the invite', query: 'The Invitation', year: 2022 },
  { label: 'flow', query: 'Flow', year: 2024 },
  { label: 'asteroid city', query: 'Asteroid City', year: 2023 },
  { label: 'the whale', query: 'The Whale', year: 2022 },
  { label: 'encanto', query: 'Encanto', year: 2021 },
  { label: 'toy story 5', query: 'Toy Story 5', year: 2026 },
  { label: 'smile', query: 'Smile', year: 2022 },

  { label: 'alien romulos', query: 'Alien: Romulus', year: 2024 },
  { label: 'i saw the tv glow', query: 'I Saw the TV Glow', year: 2024 },
  { label: 'buddy', query: 'Buddy', year: 2024 },
  { label: 'send help', query: 'Send Help', year: 2026 },
  { label: 'perfect days', query: 'Perfect Days', year: 2023 },
  { label: 'primetime', query: 'Primetime', year: 2024 },
  { label: 'luca', query: 'Luca', year: 2021 },
  { label: 'nada de novo no front', query: 'All Quiet on the Western Front', year: 2022, tmdbId: 874110 },
  { label: 'cruella', query: 'Cruella', year: 2021 },
  { label: 'you can see everything', query: 'You Can Live Forever', year: 2022 },

  { label: 'furiosa', query: 'Furiosa: A Mad Max Saga', year: 2024 },
  { label: 'red', query: 'Turning Red', year: 2022 },
  // perfect days duplicado — ignorado abaixo
]

const BATCH_1970 = [
  { label: 'poderoso chefão', query: 'The Godfather', year: 1972 },
  { label: 'taxi driver', query: 'Taxi Driver', year: 1976 },
  { label: 'star wars uma nova esperança', query: 'Star Wars', year: 1977 },
  { label: 'alien', query: 'Alien', year: 1979 },
  { label: 'jaws', query: 'Jaws', year: 1975 },
  { label: 'laranja mecânica', query: 'A Clockwork Orange', year: 1971 },
  { label: 'apocalypse now', query: 'Apocalypse Now', year: 1979 },
  { label: 'rocky horror Picture show', query: 'The Rocky Horror Picture Show', year: 1975 },
  { label: 'halloween', query: 'Halloween', year: 1978 },
  { label: 'carrie', query: 'Carrie', year: 1976 },

  { label: 'um estranho no ninho', query: "One Flew Over the Cuckoo's Nest", year: 1975 },
  { label: 'massacre da serra elétrica', query: 'The Texas Chain Saw Massacre', year: 1974 },
  { label: 'o exorcista', query: 'The Exorcist', year: 1973 },
  { label: 'grease', query: 'Grease', year: 1978 },
  { label: 'rocky um lutador', query: 'Rocky', year: 1976 },
  { label: 'eraserhead', query: 'Eraserhead', year: 1977 },
  { label: 'suspiria', query: 'Suspiria', year: 1977 },
  { label: 'stalker', query: 'Stalker', year: 1979 },
  { label: 'monty python', query: 'Monty Python and the Holy Grail', year: 1975 },
  { label: 'house', query: 'House', year: 1977, tmdbId: 25623 }, // Hausu

  { label: 'fantastic planet', query: 'Fantastic Planet', year: 1973 },
  { label: 'wickerman', query: 'The Wicker Man', year: 1973 },
  { label: 'the deer Hunter', query: 'The Deer Hunter', year: 1978 },
  { label: 'solaris', query: 'Solaris', year: 1972, tmdbId: 593 }, // Tarkovsky
  { label: 'the devild', query: 'The Devils', year: 1971 },
  { label: 'salo', query: 'Salò, or the 120 Days of Sodom', year: 1975, tmdbId: 5336 },
  { label: 'phantom Paradise', query: 'Phantom of the Paradise', year: 1974 },
  { label: 'mad max 1', query: 'Mad Max', year: 1979 },
  { label: 'black cristimas', query: 'Black Christmas', year: 1974 },
  { label: 'dawn od the dead', query: 'Dawn of the Dead', year: 1978 },

  { label: 'pink plamingos', query: 'Pink Flamingos', year: 1972 },
  { label: 'Superman', query: 'Superman', year: 1978 },
  { label: 'Robin hood', query: 'Robin Hood', year: 1973 }, // Disney
  { label: 'Young Frankenstein', query: 'Young Frankenstein', year: 1974 },
  { label: 'the omen', query: 'The Omen', year: 1976 },
  { label: 'the Warriors', query: 'The Warriors', year: 1979 },
  { label: 'deepred', query: 'Deep Red', year: 1975 },
  { label: 'the hills have eyes', query: 'The Hills Have Eyes', year: 1977 },
  { label: 'el topo', query: 'El Topo', year: 1970 },
  { label: 'lady snowblood', query: 'Lady Snowblood', year: 1973 },

  { label: 'Deliverance', query: 'Deliverance', year: 1972 },
  { label: 'cries', query: 'Cries and Whispers', year: 1972, tmdbId: 10238 },
  { label: 'wanda', query: 'Wanda', year: 1970 },
  { label: 'the man who sleeps', query: 'The Man Who Sleeps', year: 1974 },
  { label: 'the man who fell to Earth', query: 'The Man Who Fell to Earth', year: 1976 },
  { label: 'saturday night fever', query: 'Saturday Night Fever', year: 1977 },
  { label: 'dirty Harry', query: 'Dirty Harry', year: 1971 },
  { label: 'sorcerer', query: 'Sorcerer', year: 1977 },
  { label: 'rocky 2', query: 'Rocky II', year: 1979 },
  { label: 'barry lyndron', query: 'Barry Lyndon', year: 1975 },
  { label: 'dog day afternoon', query: 'Dog Day Afternoon', year: 1975 },
]

const BATCH_1980 = [
  { label: 'o iluminado', query: 'The Shining', year: 1980 },
  { label: 'meu amigo totoro', query: 'My Neighbor Totoro', year: 1988 },
  { label: 'star wars o império contra ataca', query: 'The Empire Strikes Back', year: 1980 },
  { label: 'clube dos 5', query: 'The Breakfast Club', year: 1985 },
  { label: 'scareface', query: 'Scarface', year: 1983 },
  { label: 'the thing', query: 'The Thing', year: 1982 },
  { label: 'blade runner', query: 'Blade Runner', year: 1982 },
  { label: 'o tumulo dos vagalumes', query: 'Grave of the Fireflies', year: 1988 },
  { label: 'bettlejuice', query: 'Beetlejuice', year: 1988 },
  { label: 'blue velvet', query: 'Blue Velvet', year: 1986 },

  { label: 'the princes bride', query: 'The Princess Bride', year: 1987 },
  { label: 'durod e matar', query: 'Die Hard', year: 1988 },
  { label: 'indiana Jones 1', query: 'Raiders of the Lost Ark', year: 1981 },
  { label: 'full metal jacket', query: 'Full Metal Jacket', year: 1987 },
  { label: 'et', query: 'E.T. the Extra-Terrestrial', year: 1982 },
  { label: 'akira', query: 'Akira', year: 1988 },
  { label: 'top gun', query: 'Top Gun', year: 1986 },
  { label: 'exterminador do futuro 1', query: 'The Terminator', year: 1984 },
  { label: 'come and see', query: 'Come and See', year: 1985, tmdbId: 25237 },
  { label: 'posession', query: 'Possession', year: 1981 },

  { label: 'aliens', query: 'Aliens', year: 1986 },
  { label: 'hora do pesadelo 1', query: 'A Nightmare on Elm Street', year: 1984 },
  { label: 'caça fantasmas 1', query: 'Ghostbusters', year: 1984 },
  { label: 'after hours', query: 'After Hours', year: 1985 },
  { label: 'amadeus', query: 'Amadeus', year: 1984 },
  { label: 'the elephantman', query: 'The Elephant Man', year: 1980 },
  { label: 'evil dead 1', query: 'The Evil Dead', year: 1981 },
  { label: 'a mosa', query: 'The Fly', year: 1986 },
  { label: 'a pequena seriea', query: 'The Little Mermaid', year: 1989 },
  { label: 'os gonnies', query: 'The Goonies', year: 1985 },

  { label: 'labirinto', query: 'Labyrinth', year: 1986 },
  { label: 'gremlins', query: 'Gremlins', year: 1984 },
  { label: 'videodrome', query: 'Videodrome', year: 1983 },
  { label: 'sexta feira 13', query: 'Friday the 13th', year: 1980 },
  { label: 'airplane', query: 'Airplane!', year: 1980 },
  { label: 'batman', query: 'Batman', year: 1989 },
  { label: 'evil dead 2', query: 'Evil Dead II', year: 1987 },
  { label: 'predador', query: 'Predator', year: 1987 },
  { label: 'o rei da comedia', query: 'The King of Comedy', year: 1982 },
  { label: 'hellraiser', query: 'Hellraiser', year: 1987 },

  { label: 'karate kid', query: 'The Karate Kid', year: 1984 },
  { label: 'the lost boys', query: 'The Lost Boys', year: 1987 },
  { label: 'roger rabbit', query: 'Who Framed Roger Rabbit', year: 1988 },
  { label: 'they live', query: 'They Live', year: 1988 },
  { label: 'robocop', query: 'RoboCop', year: 1987 },
  { label: 'chucky', query: "Child's Play", year: 1988 },
  { label: 'platoon', query: 'Platoon', year: 1986 },
  { label: 'poltergeist', query: 'Poltergeist', year: 1982 },
  { label: 'little shop of horror', query: 'Little Shop of Horrors', year: 1986 },
  { label: 'um lobisomen americano em londres', query: 'An American Werewolf in London', year: 1981 },
]

const BATCH_1990 = [
  { label: 'clube da luta', query: 'Fight Club', year: 1999 },
  { label: 'show de truman', query: 'The Truman Show', year: 1998 },
  { label: 'pulp fiction', query: 'Pulp Fiction', year: 1994 },
  { label: 'seven', query: 'Se7en', year: 1995 },
  { label: 'forrest gump', query: 'Forrest Gump', year: 1994 },
  { label: 'silencio dos inocentes', query: 'The Silence of the Lambs', year: 1991 },
  { label: 'um sonho de liberdade', query: 'The Shawshank Redemption', year: 1994 },
  { label: 'matrix', query: 'The Matrix', year: 1999 },
  { label: 'titanic', query: 'Titanic', year: 1997 },
  { label: 'goodfellas', query: 'Goodfellas', year: 1990 },

  { label: 'pânico', query: 'Scream', year: 1996 },
  { label: 'esqueceram de mim', query: 'Home Alone', year: 1990 },
  { label: 'toy story', query: 'Toy Story', year: 1995 },
  { label: 'jurassic park', query: 'Jurassic Park', year: 1993 },
  { label: 'perfect blue', query: 'Perfect Blue', year: 1997 },
  { label: 'princesa momonoke', query: 'Princess Mononoke', year: 1997 },
  { label: 'o estranho mundo de jack', query: 'The Nightmare Before Christmas', year: 1993 },
  { label: 'a lista de Schindler', query: "Schindler's List", year: 1993 },
  { label: 'edward manos de tesoura', query: 'Edward Scissorhands', year: 1990 },

  { label: 'star wars ep 1', query: 'Star Wars: Episode I - The Phantom Menace', year: 1999 },
  { label: 'rei leao', query: 'The Lion King', year: 1994 },
  { label: 'reservoir dogs', query: 'Reservoir Dogs', year: 1992 },
  { label: 'sexto sentido', query: 'The Sixth Sense', year: 1999 },
  { label: 'fargo', query: 'Fargo', year: 1996 },
  { label: 'o resgate do soldado Ryan', query: 'Saving Private Ryan', year: 1998 },
  { label: 'heat', query: 'Heat', year: 1995 },
  { label: 'a espera de um liagre', query: 'The Green Mile', year: 1999 },
  { label: 'leon', query: 'Léon: The Professional', year: 1994 },
  { label: 'toy story 2', query: 'Toy Story 2', year: 1999 },

  { label: 'falen angels', query: 'Fallen Angels', year: 1995, tmdbId: 11220 },
  { label: 'os suspeitos', query: 'The Usual Suspects', year: 1995 },
  { label: 'mulan', query: 'Mulan', year: 1998 },
  { label: 'operação cupido', query: 'The Parent Trap', year: 1998 },
  { label: 'a bruxa de blair', query: 'The Blair Witch Project', year: 1999 },
  { label: 'magnólia', query: 'Magnolia', year: 1999 },
  { label: 'matilda', query: 'Matilda', year: 1996 },
  { label: 'exterminador do futuro 2', query: 'Terminator 2: Judgment Day', year: 1991 },
  { label: 'a outra historia americana x', query: 'American History X', year: 1998 },
  { label: 'boggie night', query: 'Boogie Nights', year: 1997 },

  { label: 'mib', query: 'Men in Black', year: 1997 },
  { label: 'o mascara', query: 'The Mask', year: 1994 },
  { label: 'twin peaks filme', query: 'Twin Peaks: Fire Walk with Me', year: 1992 },
  { label: 'cure', query: 'Cure', year: 1997, tmdbId: 36095 },
  { label: 'jumanji', query: 'Jumanji', year: 1995 },
  { label: 'hocus pocus', query: 'Hocus Pocus', year: 1993 },
  { label: 'entrevista com o demônio', query: 'Interview with the Vampire', year: 1994 },
  { label: 'de volta pro futuro 3', query: 'Back to the Future Part III', year: 1990 },
  { label: 'a múmia', query: 'The Mummy', year: 1999 },
  { label: 'vida de insetos', query: "A Bug's Life", year: 1998 },
]

const BATCH_2000 = [
  { label: 'as branquelas', query: 'White Chicks', year: 2004 },
  { label: 'memories of murder', query: 'Memories of Murder', year: 2003 },
  { label: 'fantástica sabrica de chocolates', query: 'Charlie and the Chocolate Factory', year: 2005 },
  { label: 'kung fu panda', query: 'Kung Fu Panda', year: 2008 },
  { label: 'senhor e senhora Smith', query: 'Mr. & Mrs. Smith', year: 2005 },
  { label: 'labirinto do fauno', query: "Pan's Labyrinth", year: 2006 },
  { label: 'shaun of the dead', query: 'Shaun of the Dead', year: 2004 },
  { label: 'lua nova', query: 'The Twilight Saga: New Moon', year: 2009 },
  { label: 'jogos mortais', query: 'Saw', year: 2004 },
  { label: 'escola do rock', query: 'School of Rock', year: 2003 },

  { label: 'piratas do caribe 3', query: "Pirates of the Caribbean: At World's End", year: 2007 },
  { label: 'a procura da felicidade', query: 'The Pursuit of Happyness', year: 2006 },
  { label: 'mysterious skin', query: 'Mysterious Skin', year: 2004 },
  { label: 'o grinch', query: 'How the Grinch Stole Christmas', year: 2000 },
  { label: 'Children of Men', query: 'Children of Men', year: 2006 },
  { label: 'punch drunk love', query: 'Punch-Drunk Love', year: 2002 },
  { label: 'zombilandia', query: 'Zombieland', year: 2009 },
  { label: 'a princesa e o sapo', query: 'The Princess and the Frog', year: 2009 },
  { label: 'casino royale', query: 'Casino Royale', year: 2006 },
  { label: 'madagascar', query: 'Madagascar', year: 2005 },

  { label: 'preminoção 1', query: 'Final Destination', year: 2000 },
  { label: 'hot fuzz', query: 'Hot Fuzz', year: 2007 },
  { label: 'v de vingança', query: 'V for Vendetta', year: 2005 },
  { label: 'lilo Stich', query: 'Lilo & Stitch', year: 2002 },
  { label: 'páprica', query: 'Paprika', year: 2006 },
  { label: 'era do gelo 1', query: 'Ice Age', year: 2002 },
  { label: 'a proposta', query: 'The Proposal', year: 2009 },
  { label: 'como se fosse a primeira vez', query: '50 First Dates', year: 2004 },
  { label: 'todo mundo em pânico 1', query: 'Scary Movie', year: 2000 },
  { label: 'narnia', query: 'The Chronicles of Narnia: The Lion, the Witch and the Wardrobe', year: 2005 },

  { label: 'uma noite no musel', query: 'Night at the Museum', year: 2006 },
  { label: 'x-men 1', query: 'X-Men', year: 2000 },
  { label: 'sexta feira muito louca', query: 'Freaky Friday', year: 2003 },
  { label: 'velozes e furiosos 1', query: 'The Fast and the Furious', year: 2001 },
  { label: 'hulk (do edward norton)', query: 'The Incredible Hulk', year: 2008 },
  { label: 'scooby doo o filme 1', query: 'Scooby-Doo', year: 2002 },
  { label: 'borat', query: 'Borat', year: 2006 },
  { label: 'expresos polar', query: 'The Polar Express', year: 2004 },
  { label: 'a ponte para terabitia', query: 'Bridge to Terabithia', year: 2007 },
  { label: 'efeito borboleta', query: 'The Butterfly Effect', year: 2004 },

  { label: 'Shrek 3', query: 'Shrek the Third', year: 2007 },
  { label: 'high school musical', query: 'High School Musical', year: 2006 },
  { label: 'transformers 1', query: 'Transformers', year: 2007 },
  { label: 'a casa monstro', query: 'Monster House', year: 2006 },
  { label: 'bee movie', query: 'Bee Movie', year: 2007 },
  { label: 'tokyo drift', query: 'The Fast and the Furious: Tokyo Drift', year: 2006 },
  { label: 'os outros', query: 'The Others', year: 2001 },
  { label: 'click', query: 'Click', year: 2006 },
  { label: 'a órfã', query: 'Orphan', year: 2009 },
  { label: 'o espanta tubaroes', query: 'Shark Tale', year: 2004 },
]

const BATCH_2010 = [
  { label: 'interestelar', query: 'Interstellar', year: 2014 },
  { label: 'parasita', query: 'Parasite', year: 2019, tmdbId: 496243 },
  { label: 'lalaland', query: 'La La Land', year: 2016 },
  { label: 'whisplash', query: 'Whiplash', year: 2014 },
  { label: 'corra', query: 'Get Out', year: 2017 },
  { label: 'a origem', query: 'Inception', year: 2010 },
  { label: 'midsommar', query: 'Midsommar', year: 2019 },
  { label: 'joker', query: 'Joker', year: 2019 },
  { label: 'o lobo de wallstreet', query: 'The Wolf of Wall Street', year: 2013 },
  { label: 'knives out', query: 'Knives Out', year: 2019 },

  { label: 'o grande hotel Budapeste', query: 'The Grand Budapest Hotel', year: 2014 },
  { label: 'cisnei negro', query: 'Black Swan', year: 2010 },
  { label: 'shutter island', query: 'Shutter Island', year: 2010 },
  { label: 'vingadores endgame', query: 'Avengers: Endgame', year: 2019 },
  { label: 'vingadores guerra infinita', query: 'Avengers: Infinity War', year: 2018 },
  { label: 'era uma vez em hollywood', query: 'Once Upon a Time in Hollywood', year: 2019 },
  { label: 'django', query: 'Django Unchained', year: 2012 },
  { label: 'hereditário', query: 'Hereditary', year: 2018 },
  { label: 'homem aranha 1 do tom holland', query: 'Spider-Man: Homecoming', year: 2017 },
  { label: 'baby driver', query: 'Baby Driver', year: 2017 },

  { label: 'scott pilgrim', query: 'Scott Pilgrim vs. the World', year: 2010 },
  { label: 'coco', query: 'Coco', year: 2017 },
  { label: 'arrival', query: 'Arrival', year: 2016 },
  { label: 'divertidamente', query: 'Inside Out', year: 2015 },
  { label: 'her', query: 'Her', year: 2013 },
  { label: 'it parte 1', query: 'It', year: 2017 },
  { label: 'prisioners', query: 'Prisoners', year: 2013 },
  { label: 'vingadores 1 o clássico', query: 'The Avengers', year: 2012 },
  { label: 'blade runner 2048', query: 'Blade Runner 2049', year: 2017 },
  { label: 'pantera negra', query: 'Black Panther', year: 2018 },

  { label: 'jojo rabbit', query: 'Jojo Rabbit', year: 2019 },
  { label: 'deadpool', query: 'Deadpool', year: 2016 },
  { label: 'us', query: 'Us', year: 2019 },
  { label: 'mad max fury road', query: 'Mad Max: Fury Road', year: 2015 },
  { label: 'guerra civil vingadores', query: 'Captain America: Civil War', year: 2016 },
  { label: 'o farol', query: 'The Lighthouse', year: 2019 },
  { label: 'thor ragnarok', query: 'Thor: Ragnarok', year: 2017 },
  { label: 'moonlight', query: 'Moonlight', year: 2016 },
  { label: 'espetacular homem aranha', query: 'The Amazing Spider-Man', year: 2012 },
  { label: 'Harry potter relíquias da morte parte 2', query: 'Harry Potter and the Deathly Hallows: Part 2', year: 2011 },

  { label: 'uncut gems', query: 'Uncut Gems', year: 2019 },
  { label: '1917', query: '1917', year: 2019 },
  { label: 'dunkirk', query: 'Dunkirk', year: 2017 },
  { label: 'the conjuring', query: 'The Conjuring', year: 2013 },
  { label: 'como treinar o seu dragão', query: 'How to Train Your Dragon', year: 2010 },
  { label: 'jhon wick', query: 'John Wick', year: 2014 },
  { label: 'a bruxa', query: 'The Witch', year: 2015, tmdbId: 310131 },
  { label: 'fragmentado', query: 'Split', year: 2016 },
  { label: 'moana', query: 'Moana', year: 2016 },
  { label: 'infiltrafos na klan', query: 'BlacKkKlansman', year: 2018 },
]

const BATCHES = {
  1970: BATCH_1970,
  1980: BATCH_1980,
  1990: BATCH_1990,
  2000: BATCH_2000,
  2010: BATCH_2010,
  2020: BATCH_2020,
}

async function resolveMovie(entry) {
  if (entry.tmdbId) {
    const details = await tmdb(`/movie/${entry.tmdbId}`)
    return details
  }
  const data = await tmdb('/search/movie', { query: entry.query, include_adult: 'false' })
  const hit = pickInDecade(data.results, entry.year ?? null)
  if (!hit) return null
  // Prefer hit in decade; if year forced and match is way off, still return but mark
  return hit
}

async function main() {
  fs.mkdirSync(POSTERS_DIR, { recursive: true })

  const source = BATCHES[decadeStart]
  if (!source) {
    throw new Error(
      `Década ${decadeStart} sem batch. Disponíveis: ${Object.keys(BATCHES).join(', ')}`,
    )
  }

  const seenLabels = new Set()
  const batch = []
  for (const e of source) {
    const k = e.label.toLowerCase()
    if (seenLabels.has(k)) continue
    seenLabels.add(k)
    batch.push(e)
  }
  console.log(`Década ${decadeStart}s · ${batch.length} filmes\n`)

  const pool = dryRun
    ? null
    : new pg.Pool({ connectionString: process.env.DATABASE_URL })

  let nextNum = nextPosterNum()
  const ok = []
  const fail = []
  const warn = []

  for (const entry of batch) {
    process.stdout.write(`→ ${entry.label} … `)
    try {
      const hit = await resolveMovie(entry)
      await sleep(220)
      if (!hit?.id) {
        console.log('NÃO ACHEI')
        fail.push({ label: entry.label, reason: 'search_empty' })
        continue
      }

      const y = yearOf(hit)
      if (y != null && (y < decadeStart || y > decadeEnd)) {
        warn.push({
          label: entry.label,
          title: hit.title,
          year: y,
          note: `fora da década ${decadeStart}s`,
        })
      }
      if (entry.year && y && Math.abs(y - entry.year) > 1) {
        warn.push({
          label: entry.label,
          title: hit.title,
          year: y,
          note: `ano esperado ~${entry.year}`,
        })
      }

      const details = await tmdb(`/movie/${hit.id}`)
      await sleep(220)
      const credits = await tmdb(`/movie/${hit.id}/credits`)
      await sleep(220)

      if (!details.poster_path) {
        console.log('SEM PÔSTER', details.title)
        fail.push({ label: entry.label, reason: 'no_poster', tmdb: details.title })
        continue
      }

      const posterFile = `${nextNum}.jpg`
      const posterRel = `/posters/${posterFile}`
      const dest = path.join(POSTERS_DIR, posterFile)

      if (!dryRun) {
        await downloadPoster(details.poster_path, dest)
      }

      const director = directorOf(credits)
      const castJson = buildCastJson(details, credits)
      const title = details.original_title || details.title
      const titlePt = details.title || title
      const year = yearOf(details)
      const aliases = aliasesFor(details, entry.label)
      if (titlePt && titlePt !== title) aliases.push(titlePt)

      if (!dryRun) {
        const existing = await pool.query(
          `SELECT id FROM movies
           WHERE (
               lower(title) = lower($1)
               OR lower(coalesce(title_pt,'')) = lower($2)
               OR $3 = ANY(aliases)
             )
             AND ($4::int IS NULL OR year = $4::int)
           LIMIT 1`,
          [title, titlePt, title, year],
        )

        if (existing.rows[0]) {
          await pool.query(
            `UPDATE movies SET
               title = $2,
               title_pt = $3,
               year = $4,
               aliases = $5,
               poster_path = $6,
               director = $7,
               cast_json = $8::jsonb,
               attribution = $9,
               source_url = $10
             WHERE id = $1`,
            [
              existing.rows[0].id,
              title,
              titlePt,
              year,
              aliases,
              posterRel,
              director,
              JSON.stringify(castJson),
              `TMDB #${details.id}`,
              `https://www.themoviedb.org/movie/${details.id}`,
            ],
          )
        } else {
          await pool.query(
            `INSERT INTO movies
               (title, title_pt, year, aliases, license, source_url, attribution,
                poster_path, clip_path, director, cast_json)
             VALUES
               ($1,$2,$3,$4,'review',$5,$6,$7,NULL,$8,$9::jsonb)`,
            [
              title,
              titlePt,
              year,
              aliases,
              `https://www.themoviedb.org/movie/${details.id}`,
              `TMDB #${details.id}`,
              posterRel,
              director,
              JSON.stringify(castJson),
            ],
          )
        }
      }

      console.log(
        `${dryRun ? '[dry] ' : ''}${titlePt} (${year}) → ${posterRel}`,
      )
      ok.push({
        label: entry.label,
        title: titlePt,
        year,
        poster: posterRel,
        tmdbId: details.id,
      })
      nextNum += 1
    } catch (err) {
      console.log('ERRO', err.message)
      fail.push({ label: entry.label, reason: err.message })
    }
  }

  if (pool) await pool.end()

  const report = { decade: decadeStart, ok: ok.length, fail, warn, movies: ok }
  const reportPath = path.join(
    __dirname,
    `import_posters_${decadeStart}_report.json`,
  )
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log('\n=== RESUMO ===')
  console.log(`OK: ${ok.length}  FAIL: ${fail.length}  WARN: ${warn.length}`)
  if (fail.length) console.log('Falhas:', fail)
  if (warn.length) console.log('Avisos:', warn)
  console.log('Report:', reportPath)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
