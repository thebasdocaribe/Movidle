/**
 * Modo Palavra-chave — lista curada (vaga → óbvia) + ritmo de revelação.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const KEYWORDS_START = 4
export const KEYWORDS_PER_WRONG = 3
export const KEYWORDS_MAX_WRONG = 6
/** A partir deste nº de erros, mostra pôster pixelizado */
export const KEYWORDS_PIXEL_AT = 5
export const KEYWORDS_MIN_CURATED = 10

/** Pontos por nº do chute acertado (1ª tentativa = 100…) */
export const KEYWORDS_POINTS = [100, 50, 25, 15, 10, 5]

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OVERRIDES_PATH = path.join(__dirname, '../data/keywords_overrides.json')
const PT_CACHE_PATH = path.join(__dirname, '../data/keyword_pt_cache.json')

/** Tags meta / inúteis do TMDB */
const BLACKLIST = new Set(
  [
    'duringcreditsstinger',
    'aftercreditsstinger',
    'based on novel or book',
    'based on novel',
    'based on a true story',
    'based on true story',
    'woman director',
    'male nudity',
    'female nudity',
    'nudity',
    'parent child relationship',
    'husband wife relationship',
    'father daughter relationship',
    'mother daughter relationship',
    'father son relationship',
    'mother son relationship',
    'sibling relationship',
    'friendship',
    'loss of loved one',
    'independent film',
    'remake',
    'sequel',
    'prequel',
    '3d',
    'imax',
    'cgi',
    'flashback',
    'voice over',
    'voiceover',
    'film within a film',
    'breaking the fourth wall',
    'surprise ending',
    'twist ending',
  ].map((s) => s.toLowerCase()),
)

/** Traduções comuns EN → PT */
const PT_MAP = {
  possession: 'possessão',
  exorcism: 'exorcismo',
  demon: 'demônio',
  priest: 'padre',
  nun: 'freira',
  church: 'igreja',
  crucifix: 'crucifixo',
  cross: 'cruz',
  child: 'criança',
  children: 'crianças',
  mother: 'mãe',
  father: 'pai',
  trauma: 'trauma',
  vomit: 'vômito',
  boxing: 'boxe',
  boxer: 'boxeador',
  'haunted house': 'casa mal-assombrada',
  ghost: 'fantasma',
  murder: 'assassinato',
  killer: 'assassino',
  detective: 'detetive',
  police: 'polícia',
  revenge: 'vingança',
  war: 'guerra',
  soldier: 'soldado',
  space: 'espaço',
  alien: 'alienígena',
  'time travel': 'viagem no tempo',
  robot: 'robô',
  vampire: 'vampiro',
  werewolf: 'lobisomem',
  zombie: 'zumbi',
  school: 'escola',
  'high school': 'ensino médio',
  love: 'amor',
  romance: 'romance',
  wedding: 'casamento',
  divorce: 'divórcio',
  prison: 'prisão',
  escape: 'fuga',
  heist: 'assalto',
  bank: 'banco',
  spy: 'espião',
  assassination: 'assassinato político',
  politics: 'política',
  president: 'presidente',
  music: 'música',
  musician: 'músico',
  band: 'banda',
  sports: 'esporte',
  football: 'futebol americano',
  baseball: 'beisebol',
  basketball: 'basquete',
  car: 'carro',
  race: 'corrida',
  airplane: 'avião',
  ship: 'navio',
  submarine: 'submarino',
  island: 'ilha',
  jungle: 'selva',
  desert: 'deserto',
  snow: 'neve',
  winter: 'inverno',
  summer: 'verão',
  christmas: 'natal',
  halloween: 'halloween',
  dream: 'sonho',
  nightmare: 'pesadelo',
  amnesia: 'amnésia',
  twin: 'gêmeo',
  clone: 'clone',
  virus: 'vírus',
  pandemic: 'pandemia',
  hospital: 'hospital',
  doctor: 'médico',
  nurse: 'enfermeira',
  lawyer: 'advogado',
  courtroom: 'tribunal',
  journalist: 'jornalista',
  photographer: 'fotógrafo',
  painter: 'pintor',
  writer: 'escritor',
  suicide: 'suicídio',
  addiction: 'vício',
  alcohol: 'álcool',
  drugs: 'drogas',
  gang: 'gangue',
  mafia: 'máfia',
  yakuza: 'yakuza',
  samurai: 'samurai',
  ninja: 'ninja',
  'kung fu': 'kung fu',
  'martial arts': 'artes marciais',
  superhero: 'super-herói',
  villain: 'vilão',
  magic: 'magia',
  wizard: 'mago',
  witch: 'bruxa',
  'fairy tale': 'conto de fadas',
  dystopia: 'distopia',
  'post-apocalyptic': 'pós-apocalíptico',
  holocaust: 'holocausto',
  nazi: 'nazista',
  slavery: 'escravidão',
  racism: 'racismo',
  'coming of age': 'amadurecimento',
  'road trip': 'viagem de carro',
  california: 'califórnia',
  'new york city': 'nova york',
  paris: 'paris',
  london: 'londres',
  tokyo: 'tóquio',
  brazil: 'brasil',
  japan: 'japão',
  'harry potter': 'harry potter',
  // extras frequentes no TMDB
  corruption: 'corrupção',
  conspiracy: 'conspiração',
  investigation: 'investigação',
  isolation: 'isolamento',
  identity: 'identidade',
  betrayal: 'traição',
  obsession: 'obsessão',
  survival: 'sobrevivência',
  violence: 'violência',
  death: 'morte',
  dying: 'morrer',
  blood: 'sangue',
  fear: 'medo',
  terror: 'terror',
  horror: 'horror',
  suspense: 'suspense',
  thriller: 'thriller',
  mystery: 'mistério',
  comedy: 'comédia',
  drama: 'drama',
  action: 'ação',
  adventure: 'aventura',
  fantasy: 'fantasia',
  'science fiction': 'ficção científica',
  'sci-fi': 'ficção científica',
  scifi: 'ficção científica',
  future: 'futuro',
  past: 'passado',
  present: 'presente',
  memory: 'memória',
  memories: 'memórias',
  childhood: 'infância',
  family: 'família',
  marriage: 'casamento',
  wedding: 'casamento',
  divorce: 'divórcio',
  pregnancy: 'gravidez',
  baby: 'bebê',
  teenager: 'adolescente',
  friendship: 'amizade',
  rival: 'rival',
  rivalry: 'rivalidade',
  competition: 'competição',
  tournament: 'torneio',
  champion: 'campeão',
  underdog: 'azarão',
  money: 'dinheiro',
  greed: 'ganância',
  poverty: 'pobreza',
  rich: 'rico',
  wealth: 'riqueza',
  power: 'poder',
  politics: 'política',
  government: 'governo',
  military: 'militar',
  army: 'exército',
  navy: 'marinha',
  battle: 'batalha',
  combat: 'combate',
  fight: 'luta',
  fighting: 'luta',
  explosion: 'explosão',
  bomb: 'bomba',
  gun: 'arma',
  weapon: 'arma',
  knife: 'faca',
  sword: 'espada',
  fire: 'fogo',
  water: 'água',
  earth: 'terra',
  wind: 'vento',
  storm: 'tempestade',
  rain: 'chuva',
  forest: 'floresta',
  mountain: 'montanha',
  ocean: 'oceano',
  sea: 'mar',
  beach: 'praia',
  city: 'cidade',
  village: 'vila',
  town: 'cidade',
  farm: 'fazenda',
  ranch: 'rancho',
  hotel: 'hotel',
  restaurant: 'restaurante',
  bar: 'bar',
  casino: 'cassino',
  nightclub: 'boate',
  party: 'festa',
  dance: 'dança',
  singing: 'canto',
  concert: 'show',
  stage: 'palco',
  theater: 'teatro',
  cinema: 'cinema',
  film: 'filme',
  movie: 'filme',
  television: 'televisão',
  radio: 'rádio',
  newspaper: 'jornal',
  book: 'livro',
  diary: 'diário',
  letter: 'carta',
  secret: 'segredo',
  lie: 'mentira',
  truth: 'verdade',
  justice: 'justiça',
  crime: 'crime',
  criminal: 'criminoso',
  thief: 'ladrão',
  robbery: 'roubo',
  kidnapping: 'sequestro',
  hostage: 'refém',
  torture: 'tortura',
  prison: 'prisão',
  jail: 'cadeia',
  freeman: 'homem livre',
  freedom: 'liberdade',
  escape: 'fuga',
  hunt: 'caça',
  hunting: 'caça',
  chase: 'perseguição',
  pursuit: 'perseguição',
  mayor: 'prefeito',
  ambush: 'emboscada',
  trap: 'armadilha',
  snare: 'armadilha',
  prey: 'presa',
  predator: 'predador',
  maniac: 'maníaco',
  ransom: 'resgate',
  tragic: 'trágico',
  sniper: 'atirador',
  car: 'carro',
  truck: 'caminhão',
  motorcycle: 'moto',
  train: 'trem',
  plane: 'avião',
  helicopter: 'helicóptero',
  boat: 'barco',
  shark: 'tubarão',
  dinosaur: 'dinossauro',
  monster: 'monstro',
  creature: 'criatura',
  alien: 'alienígena',
  ufo: 'ovni',
  spaceship: 'nave espacial',
  planet: 'planeta',
  mars: 'marte',
  moon: 'lua',
  sun: 'sol',
  blackmail: 'chantagem',
  revenge: 'vingança',
  vengeance: 'vingança',
  redemption: 'redenção',
  sacrifice: 'sacrifício',
  destiny: 'destino',
  fate: 'destino',
  prophecy: 'profecia',
  curse: 'maldição',
  spell: 'feitiço',
  witchcraft: 'bruxaria',
  magic: 'magia',
  supernatural: 'sobrenatural',
  paranormal: 'paranormal',
  afterlife: 'além',
  heaven: 'céu',
  hell: 'inferno',
  devil: 'diabo',
  angel: 'anjo',
  god: 'deus',
  religion: 'religião',
  faith: 'fé',
  cult: 'culto',
  ritual: 'ritual',
  sacrifice: 'sacrifício',
  psycho: 'psicopata',
  psychopath: 'psicopata',
  serial: 'serial',
  'serial killer': 'assassino em série',
  detective: 'detetive',
  fbi: 'fbi',
  cia: 'cia',
  agent: 'agente',
  undercover: 'infiltrado',
  spy: 'espião',
  espionage: 'espionagem',
  cold: 'frio',
  winter: 'inverno',
  summer: 'verão',
  autumn: 'outono',
  spring: 'primavera',
  christmas: 'natal',
  holiday: 'feriado',
  vacation: 'férias',
  travel: 'viagem',
  journey: 'jornada',
  quest: 'missão',
  mission: 'missão',
  rescue: 'resgate',
  hero: 'herói',
  antihero: 'anti-herói',
  villain: 'vilão',
  mentor: 'mentor',
  student: 'estudante',
  teacher: 'professor',
  professor: 'professor',
  scientist: 'cientista',
  experiment: 'experimento',
  laboratory: 'laboratório',
  virus: 'vírus',
  disease: 'doença',
  epidemic: 'epidemia',
  plague: 'praga',
  zombie: 'zumbi',
  undead: 'morto-vivo',
  vampire: 'vampiro',
  werewolf: 'lobisomem',
  witch: 'bruxa',
  wizard: 'mago',
  dragon: 'dragão',
  king: 'rei',
  queen: 'rainha',
  prince: 'príncipe',
  princess: 'princesa',
  castle: 'castelo',
  kingdom: 'reino',
  empire: 'império',
  revolution: 'revolução',
  war: 'guerra',
  peace: 'paz',
  love: 'amor',
  romance: 'romance',
  heartbreak: 'desilusão amorosa',
  breakup: 'término',
  dating: 'namoro',
  sex: 'sexo',
  sexuality: 'sexualidade',
  lgbt: 'lgbt',
  gay: 'gay',
  lesbian: 'lésbica',
  racism: 'racismo',
  slavery: 'escravidão',
  immigration: 'imigração',
  refugee: 'refugiado',
  homelessness: 'moradia de rua',
  alcoholism: 'alcoolismo',
  addiction: 'vício',
  drugs: 'drogas',
  cocaine: 'cocaína',
  marijuana: 'maconha',
  suicide: 'suicídio',
  depression: 'depressão',
  mental: 'mental',
  'mental illness': 'doença mental',
  therapy: 'terapia',
  psychologist: 'psicólogo',
  psychiatrist: 'psiquiatra',
  hospital: 'hospital',
  nurse: 'enfermeira',
  doctor: 'médico',
  surgery: 'cirurgia',
  cancer: 'câncer',
  wheelchair: 'cadeira de rodas',
  disability: 'deficiência',
  blindness: 'cegueira',
  deafness: 'surdez',
  mute: 'mudo',
  orphan: 'órfão',
  adoption: 'adoção',
  twin: 'gêmeo',
  clone: 'clone',
  robot: 'robô',
  android: 'androide',
  artificial: 'artificial',
  'artificial intelligence': 'inteligência artificial',
  computer: 'computador',
  internet: 'internet',
  hacker: 'hacker',
  cyber: 'cibernético',
  virtual: 'virtual',
  reality: 'realidade',
  dream: 'sonho',
  nightmare: 'pesadelo',
  sleep: 'sono',
  coma: 'coma',
  amnesia: 'amnésia',
  time: 'tempo',
  'time travel': 'viagem no tempo',
  paradox: 'paradoxo',
  parallel: 'paralelo',
  dimension: 'dimensão',
  multiverse: 'multiverso',
  apocalypse: 'apocalipse',
  'end of the world': 'fim do mundo',
  dystopia: 'distopia',
  utopia: 'utopia',
  society: 'sociedade',
  class: 'classe',
  'social class': 'classe social',
  capitalism: 'capitalismo',
  communism: 'comunismo',
  fascism: 'fascismo',
  nazi: 'nazista',
  holocaust: 'holocausto',
  genocide: 'genocídio',
  terrorism: 'terrorismo',
  terrorist: 'terrorista',
  bomb: 'bomba',
  hostage: 'refém',
  sniper: 'atirador',
  assassin: 'assassino',
  hitman: 'matador de aluguel',
  gangster: 'gângster',
  mafia: 'máfia',
  cartel: 'cartel',
  smuggling: 'contrabando',
  prostitution: 'prostituição',
  porn: 'pornografia',
  stripper: 'striper',
  casino: 'cassino',
  gambling: 'jogo de azar',
  poker: 'pôquer',
  boxing: 'boxe',
  wrestling: 'luta livre',
  football: 'futebol americano',
  soccer: 'futebol',
  baseball: 'beisebol',
  basketball: 'basquete',
  hockey: 'hóquei',
  tennis: 'tênis',
  golf: 'golfe',
  swimming: 'natação',
  surfing: 'surfe',
  skateboarding: 'skate',
  bicycle: 'bicicleta',
  horse: 'cavalo',
  dog: 'cão',
  cat: 'gato',
  animal: 'animal',
  pet: 'animal de estimação',
  nature: 'natureza',
  environment: 'meio ambiente',
  pollution: 'poluição',
  climate: 'clima',
  nuclear: 'nuclear',
  radiation: 'radiação',
  chemical: 'químico',
  poison: 'veneno',
  antidote: 'antídoto',
  treasure: 'tesouro',
  map: 'mapa',
  pirate: 'pirata',
  cowboy: 'caubói',
  western: 'faroeste',
  frontier: 'fronteira',
  desert: 'deserto',
  jungle: 'selva',
  island: 'ilha',
  shipwreck: 'naufrágio',
  stranded: 'ilhado',
  wilderness: 'natureza selvagem',
  camping: 'acampamento',
  hiking: 'trilha',
  climbing: 'escalada',
  cave: 'caverna',
  underground: 'subterrâneo',
  subway: 'metrô',
  tunnel: 'túnel',
  bridge: 'ponte',
  building: 'prédio',
  skyscraper: 'arranha-céu',
  apartment: 'apartamento',
  house: 'casa',
  mansion: 'mansão',
  cabin: 'cabana',
  cottage: 'chalé',
  basement: 'porão',
  attic: 'sótão',
  bathroom: 'banheiro',
  kitchen: 'cozinha',
  bedroom: 'quarto',
  office: 'escritório',
  courtroom: 'tribunal',
  lawyer: 'advogado',
  judge: 'juiz',
  jury: 'júri',
  trial: 'julgamento',
  verdict: 'veredicto',
  witness: 'testemunha',
  evidence: 'prova',
  alibi: 'álibi',
  confession: 'confissão',
  interrogation: 'interrogatório',
  police: 'polícia',
  cop: 'policial',
  sheriff: 'xerife',
  deputy: 'delegado',
  chief: 'chefe',
  captain: 'capitão',
  lieutenant: 'tenente',
  general: 'general',
  soldier: 'soldado',
  veteran: 'veterano',
  draft: 'alistamento',
  bootcamp: 'treinamento militar',
  trench: 'trincheira',
  tank: 'tanque',
  submarine: 'submarino',
  aircraft: 'aeronave',
  pilot: 'piloto',
  astronaut: 'astronauta',
  space: 'espaço',
  galaxy: 'galáxia',
  asteroid: 'asteroide',
  comet: 'cometa',
  blackhole: 'buraco negro',
  wormhole: 'buraco de minhoca',
  teleport: 'teletransporte',
  laser: 'laser',
  lightsaber: 'sabre de luz',
  force: 'força',
  jedi: 'jedi',
  sith: 'sith',
  empire: 'império',
  rebellion: 'rebelião',
  resistance: 'resistência',
  mutant: 'mutante',
  superpower: 'superpoder',
  superhero: 'super-herói',
  cape: 'capa',
  mask: 'máscara',
  costume: 'fantasia',
  identity: 'identidade',
  alterego: 'alter ego',
  sidekick: 'parceiro',
  nemesis: 'nêmesis',
  origin: 'origem',
  originstory: 'história de origem',
}

/** Termos mais “óbvios” / spoilers — vão pro fim da lista */
const OBVIOUS = new Set(
  [
    'exorcismo',
    'exorcism',
    'possessão',
    'possession',
    'demônio',
    'demon',
    'vômito',
    'vomit',
    'super-herói',
    'superhero',
    'batman',
    'spiderman',
    'jedi',
    'sith',
    'lightsaber',
    'hobbit',
    'ring',
    'sauron',
    'voldemort',
    'harry potter',
    'matrix',
    'neo',
    'titanic',
    'iceberg',
  ].map((s) => s.toLowerCase()),
)

let overridesCache = null
let overridesMtime = 0
let ptDiskCache = null
const ptMemCache = new Map()

export function loadKeywordOverrides() {
  try {
    const st = fs.statSync(OVERRIDES_PATH)
    if (overridesCache && st.mtimeMs === overridesMtime) return overridesCache
    const raw = JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'))
    overridesCache = raw && typeof raw === 'object' ? raw : {}
    overridesMtime = st.mtimeMs
    return overridesCache
  } catch {
    overridesCache = {}
    return overridesCache
  }
}

function loadPtDiskCache() {
  if (ptDiskCache) return ptDiskCache
  try {
    ptDiskCache = JSON.parse(fs.readFileSync(PT_CACHE_PATH, 'utf8')) || {}
  } catch {
    ptDiskCache = {}
  }
  return ptDiskCache
}

function savePtDiskCache() {
  try {
    fs.writeFileSync(
      PT_CACHE_PATH,
      JSON.stringify(ptDiskCache || {}, null, 0) + '\n',
    )
  } catch {
    /* ignore */
  }
}

function normalizeKey(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const PT_HINT =
  /\b(ção|ções|são|ões|ade|dade|mento|agem|ário|ória|ência|ância|ível|ável|oso|osa|ismo)\b/i

function looksPortuguese(text) {
  const raw = String(text || '').trim()
  if (!raw) return false
  if (/[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(raw)) return true
  if (PT_HINT.test(raw.toLowerCase())) return true
  return false
}

function translateLabel(name) {
  const raw = String(name || '').trim()
  if (!raw) return null
  const key = raw.toLowerCase()
  if (PT_MAP[key]) return PT_MAP[key]
  if (looksPortuguese(raw)) return raw
  return raw
}

/**
 * Traduz keyword EN → PT (mapa → cache → MyMemory).
 * @returns {Promise<string>}
 */
export async function translateToPt(text) {
  const raw = String(text || '').trim()
  if (!raw) return raw
  const key = raw.toLowerCase()
  if (PT_MAP[key]) return PT_MAP[key]
  if (looksPortuguese(raw)) return raw
  if (ptMemCache.has(key)) return ptMemCache.get(key)
  const disk = loadPtDiskCache()
  if (disk[key]) {
    ptMemCache.set(key, disk[key])
    return disk[key]
  }
  try {
    const url = new URL('https://api.mymemory.translated.net/get')
    url.searchParams.set('q', raw)
    url.searchParams.set('langpair', 'en|pt-BR')
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) })
    if (res.ok) {
      const data = await res.json()
      const translated = String(data?.responseData?.translatedText || '')
        .trim()
        .toLowerCase()
        .replace(/[.,;:!?]+$/g, '')
        .trim()
      if (
        translated &&
        translated !== key &&
        !translated.includes('mymemory warning')
      ) {
        const out = translated
        ptMemCache.set(key, out)
        disk[key] = out
        ptDiskCache = disk
        savePtDiskCache()
        return out
      }
    }
  } catch {
    /* fallback EN */
  }
  ptMemCache.set(key, raw)
  return raw
}

/** Traduz lista completa para PT (ordem preservada). */
export async function translateListToPt(words) {
  const out = []
  for (const w of words || []) {
    out.push(await translateToPt(w))
  }
  // dedupe mantendo ordem
  const seen = new Set()
  const deduped = []
  for (const w of out) {
    const n = normalizeKey(w)
    if (!n || seen.has(n)) continue
    seen.add(n)
    deduped.push(w)
  }
  return deduped
}

/**
 * @param {{ id?: number, name?: string, namePt?: string }[]} raw
 * @param {{ title?: string, titlePt?: string } | null} movie
 */
export function curateKeywords(raw, movie = null) {
  const titles = [movie?.title, movie?.titlePt]
    .filter(Boolean)
    .map(normalizeKey)

  const seen = new Set()
  const vague = []
  const obvious = []

  for (const item of raw || []) {
    const en = String(item?.name || '').trim()
    const pt = String(item?.namePt || '').trim()
    const source = pt || en
    if (!source) continue
    const norm = normalizeKey(source)
    if (!norm || norm.length < 2) continue
    if (BLACKLIST.has(norm)) continue
    if (/^\d+$/.test(norm)) continue
    if (norm.length > 40) continue
    if (titles.some((t) => t && (norm === t || t.includes(norm) || norm.includes(t)))) {
      continue
    }
    const label = translateLabel(pt || en)
    if (!label) continue
    const labelNorm = normalizeKey(label)
    if (seen.has(labelNorm)) continue
    seen.add(labelNorm)
    if (OBVIOUS.has(labelNorm) || OBVIOUS.has(norm)) {
      obvious.push(label)
    } else {
      vague.push(label)
    }
  }

  // preferir palavras curtas no começo (mais vagas)
  vague.sort((a, b) => a.length - b.length || a.localeCompare(b, 'pt'))
  return [...vague, ...obvious]
}

export function tmdbIdFromMovie(movie) {
  const id = movie?.cast_json?._tmdb?.id
  if (id) return Number(id)
  const url = movie?.source_url || ''
  const hit = /themoviedb\.org\/movie\/(\d+)/i.exec(url)
  if (hit) return Number(hit[1])
  const att = movie?.attribution || ''
  const hit2 = /TMDB\s*#(\d+)/i.exec(att)
  if (hit2) return Number(hit2[1])
  return null
}

/**
 * Lista final (override > curatedPt > curated > raw).
 * @returns {string[]}
 */
export function resolvedKeywords(movie) {
  const tmdbId = tmdbIdFromMovie(movie)
  const overrides = loadKeywordOverrides()
  if (tmdbId && Array.isArray(overrides[String(tmdbId)])) {
    return overrides[String(tmdbId)].map(String).filter(Boolean)
  }
  if (movie?.id && Array.isArray(overrides[String(movie.id)])) {
    return overrides[String(movie.id)].map(String).filter(Boolean)
  }
  const pt = movie?.cast_json?._keywords?.curatedPt
  if (Array.isArray(pt) && pt.length) {
    return pt.map(String).filter(Boolean)
  }
  const stored = movie?.cast_json?._keywords?.curated
  if (Array.isArray(stored) && stored.length) {
    return stored.map(String).filter(Boolean)
  }
  const raw = movie?.cast_json?._keywords?.raw
  if (Array.isArray(raw) && raw.length) {
    return curateKeywords(raw, movie)
  }
  return []
}

function isEnglishish(word) {
  const w = String(word || '').trim()
  if (!w) return false
  if (looksPortuguese(w)) return false
  const key = w.toLowerCase()
  // está no mapa EN→PT → ainda é inglês na origem
  if (PT_MAP[key]) return true
  // ascii puro sem acento / sem sufixo PT → trata como inglês
  if (/^[a-z0-9\s'-]+$/i.test(w) && !PT_HINT.test(key)) return true
  return false
}

/**
 * Garante lista em PT (traduz + grava curatedPt; caller persiste no DB).
 * @returns {Promise<{ movie: object, words: string[], changed: boolean }>}
 */
export async function ensurePortugueseKeywords(movie) {
  if (!movie) return { movie, words: [], changed: false }
  const tmdbId = tmdbIdFromMovie(movie)
  const overrides = loadKeywordOverrides()
  if (
    (tmdbId && Array.isArray(overrides[String(tmdbId)])) ||
    (movie?.id && Array.isArray(overrides[String(movie.id)])) ||
    (movie?.movie_id && Array.isArray(overrides[String(movie.movie_id)]))
  ) {
    return { movie, words: resolvedKeywords(movie), changed: false }
  }

  // base EN (curated/raw) — NÃO usar curatedPt aqui pra detectar inglês residual
  const rawBase =
    (Array.isArray(movie?.cast_json?._keywords?.curated) &&
      movie.cast_json._keywords.curated.map(String).filter(Boolean)) ||
    (Array.isArray(movie?.cast_json?._keywords?.raw) &&
      curateKeywords(movie.cast_json._keywords.raw, movie)) ||
    []

  const existingPt = Array.isArray(movie?.cast_json?._keywords?.curatedPt)
    ? movie.cast_json._keywords.curatedPt.map(String).filter(Boolean)
    : []

  const ptLooksGood =
    existingPt.length >= Math.min(KEYWORDS_START, rawBase.length || KEYWORDS_START) &&
    existingPt.every((w) => !isEnglishish(w))

  if (ptLooksGood) {
    return { movie, words: existingPt, changed: false }
  }

  const source = rawBase.length ? rawBase : resolvedKeywords(movie)
  if (!source.length) return { movie, words: [], changed: false }

  const curatedPt = await translateListToPt(source)
  const castJson = {
    ...(typeof movie.cast_json === 'object' && movie.cast_json
      ? movie.cast_json
      : {}),
    _keywords: {
      ...(movie.cast_json?._keywords || {}),
      curated: movie.cast_json?._keywords?.curated || source,
      curatedPt,
    },
  }
  return {
    movie: { ...movie, cast_json: castJson },
    words: curatedPt,
    changed: true,
  }
}

export function revealedCountForWrong(wrongGuesses) {
  const w = Math.max(0, Number(wrongGuesses) || 0)
  return KEYWORDS_START + w * KEYWORDS_PER_WRONG
}

export function sliceRevealed(words, wrongGuesses) {
  const n = revealedCountForWrong(wrongGuesses)
  return words.slice(0, Math.min(n, words.length))
}

export function showPixelPoster(wrongGuesses) {
  return (Number(wrongGuesses) || 0) >= KEYWORDS_PIXEL_AT
}

export function keywordsPoints({ won, attempt }) {
  if (!won) return 0
  const idx = Math.max(0, (Number(attempt) || 1) - 1)
  return KEYWORDS_POINTS[idx] ?? KEYWORDS_POINTS[KEYWORDS_POINTS.length - 1]
}

export function movieHasEnoughKeywords(movie) {
  return resolvedKeywords(movie).length >= KEYWORDS_MIN_CURATED
}
