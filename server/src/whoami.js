/**
 * Quem sou eu — investigação por perguntas (Akinator invertido).
 * Traits em movies.cast_json._traits; pergunta sem dado → unknown.
 */

export const WHOAMI_CATEGORIES = [
  { id: 'identity', label: 'Identidade' },
  { id: 'era', label: 'Época e contexto' },
  { id: 'genre', label: 'Gênero' },
  { id: 'characters', label: 'Personagens' },
  { id: 'story', label: 'História' },
  { id: 'production', label: 'Curiosidades' },
]

/** Labels PT das respostas canônicas */
export const ANSWER_LABEL = {
  yes: 'SIM',
  no: 'NÃO',
  partial: 'PARCIALMENTE',
  unknown: 'NÃO SEI',
}

const TMDB_GENRE = {
  comedy: 35,
  horror: 27,
  adventure: 12,
  fantasy: 14,
  musical: 10402,
  kids: 10751,
  scifi: 878,
  animation: 16,
}

function emptyProtagonist() {
  return {
    species: null,
    color: null,
    human: null,
    animal: null,
    powers: null,
    multiple: null,
  }
}

function emptyAntagonist() {
  return {
    exists: null,
    human: null,
    prince: null,
  }
}

function emptyStory() {
  return {
    kingdom: null,
    future: null,
    journey: null,
    saveSomeone: null,
    revenge: null,
    fantasyWorld: null,
    prophecy: null,
  }
}

function emptyProduction() {
  return {
    oscar: null,
    famousSong: null,
    sequel: null,
    controversial: null,
    horrorDirector: null,
    postCredits: null,
  }
}

/** Traits normalizados a partir do filme. */
export function traitsFromMovie(movie) {
  const raw = movie?.cast_json
  const meta = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const t = meta._traits && typeof meta._traits === 'object' ? meta._traits : {}

  const genres = Array.isArray(t.genres)
    ? t.genres.map(Number).filter((n) => Number.isFinite(n))
    : []
  const studios = Array.isArray(t.studios)
    ? t.studios.map((s) => String(s).toLowerCase())
    : []
  const tags = Array.isArray(t.tags)
    ? t.tags.map((s) => String(s).toLowerCase())
    : []

  const year = movie?.year != null ? Number(movie.year) : null
  const runtime =
    t.runtime != null && Number.isFinite(Number(t.runtime))
      ? Number(t.runtime)
      : null

  // Compat: antagonist antigo em cast_json.antagonist
  const legacyAnt = meta.antagonist
  const hasLegacyAnt =
    legacyAnt != null && legacyAnt !== false && !legacyAnt?.none

  const protagonist = {
    ...emptyProtagonist(),
    ...(t.protagonist && typeof t.protagonist === 'object' ? t.protagonist : {}),
  }
  const antagonist = {
    ...emptyAntagonist(),
    ...(t.antagonist && typeof t.antagonist === 'object' ? t.antagonist : {}),
  }
  if (antagonist.exists == null && hasLegacyAnt) antagonist.exists = true

  const story = {
    ...emptyStory(),
    ...(t.story && typeof t.story === 'object' ? t.story : {}),
  }
  const production = {
    ...emptyProduction(),
    ...(t.production && typeof t.production === 'object' ? t.production : {}),
  }

  return {
    genres,
    region: t.region != null ? String(t.region) : meta.region != null ? String(meta.region) : null,
    runtime,
    year,
    format: t.format === 'animation' || t.format === 'live_action' ? t.format : null,
    studios,
    basedOnBook: boolOrNull(t.basedOnBook),
    franchise: boolOrNull(t.franchise),
    basedOnTrueEvents: boolOrNull(t.basedOnTrueEvents),
    classic: boolOrNull(t.classic),
    tags,
    protagonist: {
      species: protagonist.species != null ? String(protagonist.species) : null,
      color: protagonist.color != null ? String(protagonist.color).toLowerCase() : null,
      human: boolOrNull(protagonist.human),
      animal: boolOrNull(protagonist.animal),
      powers: boolOrNull(protagonist.powers),
      multiple: boolOrNull(protagonist.multiple),
    },
    antagonist: {
      exists: boolOrNull(antagonist.exists),
      human: boolOrNull(antagonist.human),
      prince: boolOrNull(antagonist.prince),
    },
    story: {
      kingdom: boolOrNull(story.kingdom),
      future: boolOrNull(story.future),
      journey: boolOrNull(story.journey),
      saveSomeone: boolOrNull(story.saveSomeone),
      revenge: boolOrNull(story.revenge),
      fantasyWorld: boolOrNull(story.fantasyWorld),
      prophecy: boolOrNull(story.prophecy),
    },
    production: {
      oscar: boolOrNull(production.oscar),
      famousSong: boolOrNull(production.famousSong),
      sequel: boolOrNull(production.sequel),
      controversial: boolOrNull(production.controversial),
      horrorDirector: boolOrNull(production.horrorDirector),
      postCredits: boolOrNull(production.postCredits),
    },
  }
}

function boolOrNull(v) {
  if (v === true || v === false) return v
  return null
}

function yes() {
  return 'yes'
}
function no() {
  return 'no'
}
function unknown() {
  return 'unknown'
}
function partial() {
  return 'partial'
}

/** boolean|null → yes/no/unknown */
function fromBool(v) {
  if (v === true) return yes()
  if (v === false) return no()
  return unknown()
}

function hasStudio(t, id) {
  if (!t.studios.length) return unknown()
  return t.studios.includes(id) ? yes() : no()
}

function hasTag(t, tag) {
  if (t.tags.includes(tag)) return yes()
  const gid = TMDB_GENRE[tag]
  if (gid != null && t.genres.includes(gid)) return yes()
  // Se não tem tags admin e não tem o gênero TMDB: se genres vazios e tags vazios → unknown
  if (!t.tags.length && !t.genres.length) return unknown()
  // Tem algum dado de gênero/tag mas não este → no
  if (t.tags.length || t.genres.length) return no()
  return unknown()
}

function decadeMatch(year, start, end) {
  if (year == null) return unknown()
  return year >= start && year <= end ? yes() : no()
}

function regionIs(t, aliases) {
  if (!t.region || t.region === '—' || t.region === '-') return unknown()
  const got = t.region.toLowerCase()
  const ok = aliases.some((a) => got === a || got.includes(a))
  return ok ? yes() : no()
}

/**
 * Catálogo de perguntas. `answer(traits)` → yes|no|partial|unknown
 * Extensível: só adicionar entradas aqui.
 */
export const WHOAMI_QUESTIONS = [
  // ——— Identidade ———
  {
    id: 'is_animation',
    category: 'identity',
    text: 'Sou uma animação?',
    answer: (t) => {
      if (t.format === 'animation') return yes()
      if (t.format === 'live_action') return no()
      if (t.genres.includes(TMDB_GENRE.animation)) return yes()
      if (t.genres.length) return no()
      return unknown()
    },
  },
  {
    id: 'is_live_action',
    category: 'identity',
    text: 'Sou um filme live-action?',
    answer: (t) => {
      if (t.format === 'live_action') return yes()
      if (t.format === 'animation') return no()
      if (t.genres.includes(TMDB_GENRE.animation)) return no()
      if (t.genres.length) return yes()
      return unknown()
    },
  },
  {
    id: 'is_disney',
    category: 'identity',
    text: 'Sou da Disney?',
    answer: (t) => hasStudio(t, 'disney'),
  },
  {
    id: 'is_pixar',
    category: 'identity',
    text: 'Sou da Pixar?',
    answer: (t) => hasStudio(t, 'pixar'),
  },
  {
    id: 'is_dreamworks',
    category: 'identity',
    text: 'Sou da DreamWorks?',
    answer: (t) => hasStudio(t, 'dreamworks'),
  },
  {
    id: 'based_on_book',
    category: 'identity',
    text: 'Sou uma adaptação de um livro?',
    answer: (t) => fromBool(t.basedOnBook),
  },
  {
    id: 'is_franchise',
    category: 'identity',
    text: 'Faço parte de uma franquia?',
    answer: (t) => fromBool(t.franchise),
  },
  {
    id: 'based_on_true',
    category: 'identity',
    text: 'Sou baseado em acontecimentos reais?',
    answer: (t) => fromBool(t.basedOnTrueEvents),
  },

  // ——— Época ———
  {
    id: 'decade_80s',
    category: 'era',
    text: 'Fui lançado nos anos 80?',
    answer: (t) => decadeMatch(t.year, 1980, 1989),
  },
  {
    id: 'decade_90s',
    category: 'era',
    text: 'Fui lançado nos anos 90?',
    answer: (t) => decadeMatch(t.year, 1990, 1999),
  },
  {
    id: 'decade_2000s',
    category: 'era',
    text: 'Fui lançado nos anos 2000?',
    answer: (t) => decadeMatch(t.year, 2000, 2009),
  },
  {
    id: 'after_2010',
    category: 'era',
    text: 'Fui lançado depois de 2010?',
    answer: (t) => {
      if (t.year == null) return unknown()
      return t.year > 2010 ? yes() : no()
    },
  },
  {
    id: 'from_usa',
    category: 'era',
    text: 'Sou uma produção americana?',
    answer: (t) =>
      regionIs(t, ['eua', 'usa', 'us', 'united states', 'estados unidos']),
  },
  {
    id: 'from_japan',
    category: 'era',
    text: 'Sou uma produção japonesa?',
    answer: (t) => regionIs(t, ['japão', 'japan', 'jp', 'japonesa']),
  },
  {
    id: 'is_classic',
    category: 'era',
    text: 'Sou considerado um clássico?',
    answer: (t) => fromBool(t.classic),
  },

  // ——— Gênero ———
  {
    id: 'tag_comedy',
    category: 'genre',
    text: 'Sou uma comédia?',
    answer: (t) => hasTag(t, 'comedy'),
  },
  {
    id: 'tag_horror',
    category: 'genre',
    text: 'Sou um filme de terror?',
    answer: (t) => hasTag(t, 'horror'),
  },
  {
    id: 'tag_adventure',
    category: 'genre',
    text: 'Sou uma aventura?',
    answer: (t) => hasTag(t, 'adventure'),
  },
  {
    id: 'tag_fantasy',
    category: 'genre',
    text: 'Tenho elementos de fantasia?',
    answer: (t) => hasTag(t, 'fantasy'),
  },
  {
    id: 'tag_parody',
    category: 'genre',
    text: 'Sou uma paródia?',
    answer: (t) => {
      if (t.tags.includes('parody')) return yes()
      if (!t.tags.length) return unknown()
      return no()
    },
  },
  {
    id: 'tag_musical',
    category: 'genre',
    text: 'Tenho elementos musicais?',
    answer: (t) => hasTag(t, 'musical'),
  },
  {
    id: 'tag_kids',
    category: 'genre',
    text: 'Sou um filme infantil?',
    answer: (t) => hasTag(t, 'kids'),
  },
  {
    id: 'tag_scifi',
    category: 'genre',
    text: 'Tenho elementos de ficção científica?',
    answer: (t) => hasTag(t, 'scifi'),
  },

  // ——— Personagens ———
  {
    id: 'prot_human',
    category: 'characters',
    text: 'Meu protagonista é humano?',
    answer: (t) => fromBool(t.protagonist.human),
  },
  {
    id: 'prot_animal',
    category: 'characters',
    text: 'Meu protagonista é um animal?',
    answer: (t) => fromBool(t.protagonist.animal),
  },
  {
    id: 'prot_green',
    category: 'characters',
    text: 'Meu protagonista é verde?',
    answer: (t) => {
      if (!t.protagonist.color) return unknown()
      return t.protagonist.color === 'green' || t.protagonist.color === 'verde'
        ? yes()
        : no()
    },
  },
  {
    id: 'prot_multiple',
    category: 'characters',
    text: 'Tenho mais de um protagonista?',
    answer: (t) => fromBool(t.protagonist.multiple),
  },
  {
    id: 'has_antagonist',
    category: 'characters',
    text: 'Tenho um antagonista principal?',
    answer: (t) => fromBool(t.antagonist.exists),
  },
  {
    id: 'ant_human',
    category: 'characters',
    text: 'Meu vilão é humano?',
    answer: (t) => {
      if (t.antagonist.exists === false) return no()
      return fromBool(t.antagonist.human)
    },
  },
  {
    id: 'ant_prince',
    category: 'characters',
    text: 'Tenho um personagem que é um príncipe?',
    answer: (t) => fromBool(t.antagonist.prince),
  },
  {
    id: 'prot_powers',
    category: 'characters',
    text: 'Meu protagonista possui poderes?',
    answer: (t) => fromBool(t.protagonist.powers),
  },
  {
    id: 'has_robot',
    category: 'characters',
    text: 'Tenho um personagem que é um robô?',
    answer: (t) => {
      const sp = (t.protagonist.species || '').toLowerCase()
      if (!sp && t.protagonist.human == null && t.protagonist.animal == null) {
        return unknown()
      }
      if (sp.includes('robot') || sp.includes('robô') || sp.includes('android')) {
        return yes()
      }
      // Sem espécie robot explícita e com outros dados → no (não inventar robot)
      if (sp || t.protagonist.human != null || t.protagonist.animal != null) {
        return no()
      }
      return unknown()
    },
  },

  // ——— História ———
  {
    id: 'story_kingdom',
    category: 'story',
    text: 'Minha história acontece em um reino?',
    answer: (t) => fromBool(t.story.kingdom),
  },
  {
    id: 'story_future',
    category: 'story',
    text: 'Minha história acontece no futuro?',
    answer: (t) => fromBool(t.story.future),
  },
  {
    id: 'story_journey',
    category: 'story',
    text: 'Minha história envolve uma viagem?',
    answer: (t) => fromBool(t.story.journey),
  },
  {
    id: 'story_save',
    category: 'story',
    text: 'Meu protagonista precisa salvar alguém?',
    answer: (t) => fromBool(t.story.saveSomeone),
  },
  {
    id: 'story_revenge',
    category: 'story',
    text: 'Minha história envolve vingança?',
    answer: (t) => fromBool(t.story.revenge),
  },
  {
    id: 'story_fantasy_world',
    category: 'story',
    text: 'Minha história acontece em um universo fantástico?',
    answer: (t) => fromBool(t.story.fantasyWorld),
  },
  {
    id: 'story_prophecy',
    category: 'story',
    text: 'Existe uma profecia na minha história?',
    answer: (t) => fromBool(t.story.prophecy),
  },

  // ——— Produção ———
  {
    id: 'prod_oscar',
    category: 'production',
    text: 'Ganhei um Oscar?',
    answer: (t) => fromBool(t.production.oscar),
  },
  {
    id: 'prod_famous_song',
    category: 'production',
    text: 'Tenho uma música que ficou famosa?',
    answer: (t) => fromBool(t.production.famousSong),
  },
  {
    id: 'prod_sequel',
    category: 'production',
    text: 'Tive uma sequência?',
    answer: (t) => fromBool(t.production.sequel),
  },
  {
    id: 'prod_controversial',
    category: 'production',
    text: 'Meu filme foi controverso?',
    answer: (t) => fromBool(t.production.controversial),
  },
  {
    id: 'prod_horror_director',
    category: 'production',
    text: 'Meu diretor é conhecido por filmes de terror?',
    answer: (t) => fromBool(t.production.horrorDirector),
  },
  {
    id: 'prod_post_credits',
    category: 'production',
    text: 'Possuo uma cena pós-créditos?',
    answer: (t) => fromBool(t.production.postCredits),
  },
]

const QUESTION_BY_ID = Object.fromEntries(
  WHOAMI_QUESTIONS.map((q) => [q.id, q]),
)

export function getQuestion(questionId) {
  return QUESTION_BY_ID[String(questionId)] || null
}

export function publicAskBank() {
  return {
    categories: WHOAMI_CATEGORIES,
    questions: WHOAMI_QUESTIONS.map((q) => ({
      id: q.id,
      category: q.category,
      text: q.text,
    })),
  }
}

/**
 * @returns {{ questionId: string, text: string, answer: 'yes'|'no'|'partial'|'unknown', answerLabel: string }}
 */
export function evaluateQuestion(movie, questionId) {
  const q = getQuestion(questionId)
  if (!q) {
    return {
      questionId: String(questionId),
      text: '',
      answer: 'unknown',
      answerLabel: ANSWER_LABEL.unknown,
    }
  }
  const traits = traitsFromMovie(movie)
  let answer = 'unknown'
  try {
    answer = q.answer(traits) || 'unknown'
  } catch {
    answer = 'unknown'
  }
  if (!['yes', 'no', 'partial', 'unknown'].includes(answer)) answer = 'unknown'
  return {
    questionId: q.id,
    text: q.text,
    answer,
    answerLabel: ANSWER_LABEL[answer],
  }
}

/** Preview de todas as perguntas pra um filme (admin). */
export function previewAllAnswers(movie) {
  return WHOAMI_QUESTIONS.map((q) => evaluateQuestion(movie, q.id))
}

/** Pontos: eficiência (menos perguntas/erros/tempo) → mais pontos. Sem cap rígido de asks. */
export function whoamiPoints({ won, asksUsed, wrongGuesses, durationSec = 0 }) {
  if (!won) return 0
  const asks = Math.max(0, Number(asksUsed) || 0)
  const wrongs = Math.max(0, Number(wrongGuesses) || 0)
  const secs = Math.max(0, Number(durationSec) || 0)
  const askPenalty = Math.min(asks, 40) * 3
  const wrongPenalty = Math.min(wrongs, 20) * 8
  const timePenalty = Math.min(Math.floor(secs / 30), 20) * 1
  return Math.max(20, 140 - askPenalty - wrongPenalty - timePenalty)
}

/** Campos usados no formulário admin / completude. */
export const TRAIT_FIELD_PATHS = [
  'format',
  'studios',
  'basedOnBook',
  'franchise',
  'basedOnTrueEvents',
  'classic',
  'tags',
  'protagonist.human',
  'protagonist.animal',
  'protagonist.color',
  'protagonist.powers',
  'protagonist.multiple',
  'protagonist.species',
  'antagonist.exists',
  'antagonist.human',
  'antagonist.prince',
  'story.kingdom',
  'story.future',
  'story.journey',
  'story.saveSomeone',
  'story.revenge',
  'story.fantasyWorld',
  'story.prophecy',
  'production.oscar',
  'production.famousSong',
  'production.sequel',
  'production.controversial',
  'production.horrorDirector',
  'production.postCredits',
]

function getPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj)
}

export function traitsCompleteness(movie) {
  const t = traitsFromMovie(movie)
  let filled = 0
  for (const path of TRAIT_FIELD_PATHS) {
    const v = getPath(t, path)
    if (Array.isArray(v)) {
      if (v.length > 0) filled += 1
    } else if (v !== null && v !== undefined && v !== '') {
      filled += 1
    }
  }
  const total = TRAIT_FIELD_PATHS.length
  return {
    filled,
    total,
    pct: total ? Math.round((filled / total) * 100) : 0,
  }
}

/** Merge seguro de patch admin em _traits existentes. */
export function mergeTraitsPatch(existingCastJson, patch) {
  const base =
    existingCastJson && typeof existingCastJson === 'object' && !Array.isArray(existingCastJson)
      ? { ...existingCastJson }
      : {}
  const prev =
    base._traits && typeof base._traits === 'object' ? { ...base._traits } : {}

  const next = { ...prev }

  if ('genres' in patch && Array.isArray(patch.genres)) {
    next.genres = patch.genres.map(Number).filter((n) => Number.isFinite(n))
  }
  if ('region' in patch) next.region = patch.region == null ? null : String(patch.region)
  if ('runtime' in patch) {
    next.runtime =
      patch.runtime == null || patch.runtime === ''
        ? null
        : Number(patch.runtime)
  }
  if ('format' in patch) {
    next.format =
      patch.format === 'animation' || patch.format === 'live_action'
        ? patch.format
        : null
  }
  if ('studios' in patch && Array.isArray(patch.studios)) {
    next.studios = patch.studios.map((s) => String(s).toLowerCase())
  }
  if ('tags' in patch && Array.isArray(patch.tags)) {
    next.tags = patch.tags.map((s) => String(s).toLowerCase())
  }
  for (const key of [
    'basedOnBook',
    'franchise',
    'basedOnTrueEvents',
    'classic',
  ]) {
    if (key in patch) next[key] = boolOrNull(patch[key])
  }

  if ('protagonist' in patch && patch.protagonist && typeof patch.protagonist === 'object') {
    next.protagonist = {
      ...emptyProtagonist(),
      ...(prev.protagonist || {}),
      ...sanitizeProtagonist(patch.protagonist),
    }
  }
  if ('antagonist' in patch && patch.antagonist && typeof patch.antagonist === 'object') {
    next.antagonist = {
      ...emptyAntagonist(),
      ...(prev.antagonist || {}),
      ...sanitizeAntagonist(patch.antagonist),
    }
  }
  if ('story' in patch && patch.story && typeof patch.story === 'object') {
    next.story = {
      ...emptyStory(),
      ...(prev.story || {}),
      ...sanitizeBoolMap(patch.story, Object.keys(emptyStory())),
    }
  }
  if ('production' in patch && patch.production && typeof patch.production === 'object') {
    next.production = {
      ...emptyProduction(),
      ...(prev.production || {}),
      ...sanitizeBoolMap(patch.production, Object.keys(emptyProduction())),
    }
  }

  base._traits = next
  return base
}

function sanitizeProtagonist(p) {
  return {
    species: p.species == null || p.species === '' ? null : String(p.species),
    color: p.color == null || p.color === '' ? null : String(p.color).toLowerCase(),
    human: boolOrNull(p.human),
    animal: boolOrNull(p.animal),
    powers: boolOrNull(p.powers),
    multiple: boolOrNull(p.multiple),
  }
}

function sanitizeAntagonist(p) {
  return {
    exists: boolOrNull(p.exists),
    human: boolOrNull(p.human),
    prince: boolOrNull(p.prince),
  }
}

function sanitizeBoolMap(obj, keys) {
  const out = {}
  for (const k of keys) {
    if (k in obj) out[k] = boolOrNull(obj[k])
  }
  return out
}

/** Traits “públicos” pro formulário admin (sem funções). */
export function publicTraitsForAdmin(movie) {
  const t = traitsFromMovie(movie)
  return {
    genres: t.genres,
    region: t.region,
    runtime: t.runtime,
    year: t.year,
    format: t.format,
    studios: t.studios,
    basedOnBook: t.basedOnBook,
    franchise: t.franchise,
    basedOnTrueEvents: t.basedOnTrueEvents,
    classic: t.classic,
    tags: t.tags,
    protagonist: t.protagonist,
    antagonist: t.antagonist,
    story: t.story,
    production: t.production,
  }
}

export const STUDIO_OPTIONS = [
  { id: 'disney', label: 'Disney' },
  { id: 'pixar', label: 'Pixar' },
  { id: 'dreamworks', label: 'DreamWorks' },
  { id: 'illumination', label: 'Illumination' },
  { id: 'sony', label: 'Sony' },
  { id: 'ghibli', label: 'Ghibli' },
]

export const TAG_OPTIONS = [
  { id: 'comedy', label: 'Comédia' },
  { id: 'horror', label: 'Terror' },
  { id: 'adventure', label: 'Aventura' },
  { id: 'fantasy', label: 'Fantasia' },
  { id: 'parody', label: 'Paródia' },
  { id: 'musical', label: 'Musical' },
  { id: 'kids', label: 'Infantil' },
  { id: 'scifi', label: 'Ficção científica' },
]

// Compat: exports antigos referenciados em código legado (evitar crash se sobrar import)
export const WHOAMI_MAX_ASKS = 999
export const WHOAMI_MAX_WRONG = 999
export const WHOAMI_AD_BONUS_ASKS = 0
export const WHOAMI_MAX_ADS = 0

/** @deprecated use evaluateQuestion */
export function evaluateAsk(movie, kind, value) {
  // Bridge mínimo se algo ainda chamar o formato antigo
  void kind
  void value
  const r = evaluateQuestion(movie, 'is_animation')
  return {
    verdict:
      r.answer === 'yes' ? 'green' : r.answer === 'no' ? 'red' : r.answer === 'partial' ? 'yellow' : 'red',
    label: r.text,
  }
}
