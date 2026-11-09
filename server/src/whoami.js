/**
 * Quem sou eu — investigação por perguntas (Akinator invertido).
 * Traits em movies.cast_json._traits; pergunta sem dado → unknown.
 * Perguntas/categorias: DB (editáveis no admin) + seed padrão.
 */

import { query } from './db.js'

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

/** Tipos de regra que o admin pode escolher. */
export const RULE_TYPES = [
  { id: 'format', label: 'Formato (animação / live-action)', needs: 'format' },
  { id: 'studio', label: 'Estúdio', needs: 'studio' },
  { id: 'tag', label: 'Tag / gênero', needs: 'tag' },
  { id: 'bool', label: 'Campo sim/não do filme', needs: 'boolField' },
  { id: 'bool_path', label: 'Campo aninhado sim/não', needs: 'path' },
  { id: 'eq', label: 'Igual a (texto)', needs: 'pathValue' },
  { id: 'year_range', label: 'Ano entre', needs: 'yearRange' },
  { id: 'year_gt', label: 'Ano depois de', needs: 'yearValue' },
  { id: 'region', label: 'Região / país', needs: 'regionAliases' },
  { id: 'species_includes', label: 'Espécie contém', needs: 'textValue' },
]

export const BOOL_FIELDS = [
  { id: 'basedOnBook', label: 'Baseado em livro' },
  { id: 'franchise', label: 'Franquia' },
  { id: 'basedOnTrueEvents', label: 'Fatos reais' },
  { id: 'classic', label: 'Clássico' },
]

export const BOOL_PATHS = [
  { id: 'protagonist.human', label: 'Protagonista humano' },
  { id: 'protagonist.animal', label: 'Protagonista animal' },
  { id: 'protagonist.powers', label: 'Protagonista com poderes' },
  { id: 'protagonist.multiple', label: 'Vários protagonistas' },
  { id: 'antagonist.exists', label: 'Tem antagonista' },
  { id: 'antagonist.human', label: 'Vilão humano' },
  { id: 'antagonist.prince', label: 'Tem príncipe' },
  { id: 'story.kingdom', label: 'História em reino' },
  { id: 'story.future', label: 'História no futuro' },
  { id: 'story.journey', label: 'Envolve viagem' },
  { id: 'story.saveSomeone', label: 'Salvar alguém' },
  { id: 'story.revenge', label: 'Vingança' },
  { id: 'story.fantasyWorld', label: 'Universo fantástico' },
  { id: 'story.prophecy', label: 'Profecia' },
  { id: 'production.oscar', label: 'Ganhou Oscar' },
  { id: 'production.famousSong', label: 'Música famosa' },
  { id: 'production.sequel', label: 'Teve sequência' },
  { id: 'production.controversial', label: 'Controverso' },
  { id: 'production.horrorDirector', label: 'Diretor de terror' },
  { id: 'production.postCredits', label: 'Pós-créditos' },
]

export const EQ_PATHS = [
  { id: 'protagonist.color', label: 'Cor do protagonista' },
  { id: 'protagonist.species', label: 'Espécie do protagonista' },
  { id: 'region', label: 'Região (exato)' },
]

export const DEFAULT_CATEGORIES = [
  { id: 'identity', label: 'Identidade', sort_order: 10 },
  { id: 'era', label: 'Época e contexto', sort_order: 20 },
  { id: 'genre', label: 'Gênero', sort_order: 30 },
  { id: 'characters', label: 'Personagens', sort_order: 40 },
  { id: 'story', label: 'História', sort_order: 50 },
  { id: 'production', label: 'Curiosidades', sort_order: 60 },
]

/** Seed inicial — regras (não funções). */
export const DEFAULT_QUESTIONS = [
  { id: 'is_animation', category_id: 'identity', text: 'Sou uma animação?', sort_order: 10, rule: { type: 'format', value: 'animation' } },
  { id: 'is_live_action', category_id: 'identity', text: 'Sou um filme live-action?', sort_order: 20, rule: { type: 'format', value: 'live_action' } },
  { id: 'is_disney', category_id: 'identity', text: 'Sou da Disney?', sort_order: 30, rule: { type: 'studio', value: 'disney' } },
  { id: 'is_pixar', category_id: 'identity', text: 'Sou da Pixar?', sort_order: 40, rule: { type: 'studio', value: 'pixar' } },
  { id: 'is_dreamworks', category_id: 'identity', text: 'Sou da DreamWorks?', sort_order: 50, rule: { type: 'studio', value: 'dreamworks' } },
  { id: 'based_on_book', category_id: 'identity', text: 'Sou uma adaptação de um livro?', sort_order: 60, rule: { type: 'bool', field: 'basedOnBook' } },
  { id: 'is_franchise', category_id: 'identity', text: 'Faço parte de uma franquia?', sort_order: 70, rule: { type: 'bool', field: 'franchise' } },
  { id: 'based_on_true', category_id: 'identity', text: 'Sou baseado em acontecimentos reais?', sort_order: 80, rule: { type: 'bool', field: 'basedOnTrueEvents' } },

  { id: 'decade_80s', category_id: 'era', text: 'Fui lançado nos anos 80?', sort_order: 10, rule: { type: 'year_range', min: 1980, max: 1989 } },
  { id: 'decade_90s', category_id: 'era', text: 'Fui lançado nos anos 90?', sort_order: 20, rule: { type: 'year_range', min: 1990, max: 1999 } },
  { id: 'decade_2000s', category_id: 'era', text: 'Fui lançado nos anos 2000?', sort_order: 30, rule: { type: 'year_range', min: 2000, max: 2009 } },
  { id: 'after_2010', category_id: 'era', text: 'Fui lançado depois de 2010?', sort_order: 40, rule: { type: 'year_gt', value: 2010 } },
  { id: 'from_usa', category_id: 'era', text: 'Sou uma produção americana?', sort_order: 50, rule: { type: 'region', aliases: ['eua', 'usa', 'us', 'united states', 'estados unidos'] } },
  { id: 'from_japan', category_id: 'era', text: 'Sou uma produção japonesa?', sort_order: 60, rule: { type: 'region', aliases: ['japão', 'japan', 'jp', 'japonesa'] } },
  { id: 'is_classic', category_id: 'era', text: 'Sou considerado um clássico?', sort_order: 70, rule: { type: 'bool', field: 'classic' } },

  { id: 'tag_comedy', category_id: 'genre', text: 'Sou uma comédia?', sort_order: 10, rule: { type: 'tag', value: 'comedy' } },
  { id: 'tag_horror', category_id: 'genre', text: 'Sou um filme de terror?', sort_order: 20, rule: { type: 'tag', value: 'horror' } },
  { id: 'tag_adventure', category_id: 'genre', text: 'Sou uma aventura?', sort_order: 30, rule: { type: 'tag', value: 'adventure' } },
  { id: 'tag_fantasy', category_id: 'genre', text: 'Tenho elementos de fantasia?', sort_order: 40, rule: { type: 'tag', value: 'fantasy' } },
  { id: 'tag_parody', category_id: 'genre', text: 'Sou uma paródia?', sort_order: 50, rule: { type: 'tag', value: 'parody' } },
  { id: 'tag_musical', category_id: 'genre', text: 'Tenho elementos musicais?', sort_order: 60, rule: { type: 'tag', value: 'musical' } },
  { id: 'tag_kids', category_id: 'genre', text: 'Sou um filme infantil?', sort_order: 70, rule: { type: 'tag', value: 'kids' } },
  { id: 'tag_scifi', category_id: 'genre', text: 'Tenho elementos de ficção científica?', sort_order: 80, rule: { type: 'tag', value: 'scifi' } },

  { id: 'prot_human', category_id: 'characters', text: 'Meu protagonista é humano?', sort_order: 10, rule: { type: 'bool_path', path: 'protagonist.human' } },
  { id: 'prot_animal', category_id: 'characters', text: 'Meu protagonista é um animal?', sort_order: 20, rule: { type: 'bool_path', path: 'protagonist.animal' } },
  { id: 'prot_green', category_id: 'characters', text: 'Meu protagonista é verde?', sort_order: 30, rule: { type: 'eq', path: 'protagonist.color', value: 'green', aliases: ['verde'] } },
  { id: 'prot_multiple', category_id: 'characters', text: 'Tenho mais de um protagonista?', sort_order: 40, rule: { type: 'bool_path', path: 'protagonist.multiple' } },
  { id: 'has_antagonist', category_id: 'characters', text: 'Tenho um antagonista principal?', sort_order: 50, rule: { type: 'bool_path', path: 'antagonist.exists' } },
  { id: 'ant_human', category_id: 'characters', text: 'Meu vilão é humano?', sort_order: 60, rule: { type: 'bool_path', path: 'antagonist.human' } },
  { id: 'ant_prince', category_id: 'characters', text: 'Tenho um personagem que é um príncipe?', sort_order: 70, rule: { type: 'bool_path', path: 'antagonist.prince' } },
  { id: 'prot_powers', category_id: 'characters', text: 'Meu protagonista possui poderes?', sort_order: 80, rule: { type: 'bool_path', path: 'protagonist.powers' } },
  { id: 'has_robot', category_id: 'characters', text: 'Tenho um personagem que é um robô?', sort_order: 90, rule: { type: 'species_includes', value: 'robot', aliases: ['robô', 'android'] } },

  { id: 'story_kingdom', category_id: 'story', text: 'Minha história acontece em um reino?', sort_order: 10, rule: { type: 'bool_path', path: 'story.kingdom' } },
  { id: 'story_future', category_id: 'story', text: 'Minha história acontece no futuro?', sort_order: 20, rule: { type: 'bool_path', path: 'story.future' } },
  { id: 'story_journey', category_id: 'story', text: 'Minha história envolve uma viagem?', sort_order: 30, rule: { type: 'bool_path', path: 'story.journey' } },
  { id: 'story_save', category_id: 'story', text: 'Meu protagonista precisa salvar alguém?', sort_order: 40, rule: { type: 'bool_path', path: 'story.saveSomeone' } },
  { id: 'story_revenge', category_id: 'story', text: 'Minha história envolve vingança?', sort_order: 50, rule: { type: 'bool_path', path: 'story.revenge' } },
  { id: 'story_fantasy_world', category_id: 'story', text: 'Minha história acontece em um universo fantástico?', sort_order: 60, rule: { type: 'bool_path', path: 'story.fantasyWorld' } },
  { id: 'story_prophecy', category_id: 'story', text: 'Existe uma profecia na minha história?', sort_order: 70, rule: { type: 'bool_path', path: 'story.prophecy' } },

  { id: 'prod_oscar', category_id: 'production', text: 'Ganhei um Oscar?', sort_order: 10, rule: { type: 'bool_path', path: 'production.oscar' } },
  { id: 'prod_famous_song', category_id: 'production', text: 'Tenho uma música que ficou famosa?', sort_order: 20, rule: { type: 'bool_path', path: 'production.famousSong' } },
  { id: 'prod_sequel', category_id: 'production', text: 'Tive uma sequência?', sort_order: 30, rule: { type: 'bool_path', path: 'production.sequel' } },
  { id: 'prod_controversial', category_id: 'production', text: 'Meu filme foi controverso?', sort_order: 40, rule: { type: 'bool_path', path: 'production.controversial' } },
  { id: 'prod_horror_director', category_id: 'production', text: 'Meu diretor é conhecido por filmes de terror?', sort_order: 50, rule: { type: 'bool_path', path: 'production.horrorDirector' } },
  { id: 'prod_post_credits', category_id: 'production', text: 'Possuo uma cena pós-créditos?', sort_order: 60, rule: { type: 'bool_path', path: 'production.postCredits' } },
]

function emptyProtagonist() {
  return { species: null, color: null, human: null, animal: null, powers: null, multiple: null }
}
function emptyAntagonist() {
  return { exists: null, human: null, prince: null }
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

function boolOrNull(v) {
  if (v === true || v === false) return v
  return null
}

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

function getPath(obj, path) {
  return String(path || '')
    .split('.')
    .reduce((acc, key) => (acc == null ? acc : acc[key]), obj)
}

function fromBool(v) {
  if (v === true) return 'yes'
  if (v === false) return 'no'
  return 'unknown'
}

/** Avalia uma regra contra traits. Sem dado → unknown. */
export function evaluateRule(traits, rule) {
  if (!rule || typeof rule !== 'object') return 'unknown'
  const type = String(rule.type || '')

  if (type === 'format') {
    const want = rule.value
    if (traits.format === want) return 'yes'
    if (traits.format && traits.format !== want) return 'no'
    if (want === 'animation') {
      if (traits.genres.includes(TMDB_GENRE.animation)) return 'yes'
      if (traits.genres.length) return 'no'
    }
    if (want === 'live_action') {
      if (traits.genres.includes(TMDB_GENRE.animation)) return 'no'
      if (traits.genres.length) return 'yes'
    }
    return 'unknown'
  }

  if (type === 'studio') {
    const id = String(rule.value || '').toLowerCase()
    if (!traits.studios.length) return 'unknown'
    return traits.studios.includes(id) ? 'yes' : 'no'
  }

  if (type === 'tag') {
    const tag = String(rule.value || '').toLowerCase()
    if (traits.tags.includes(tag)) return 'yes'
    const gid = TMDB_GENRE[tag]
    if (gid != null && traits.genres.includes(gid)) return 'yes'
    if (!traits.tags.length && !traits.genres.length) return 'unknown'
    if (traits.tags.length || traits.genres.length) return 'no'
    return 'unknown'
  }

  if (type === 'bool') {
    return fromBool(traits[rule.field])
  }

  if (type === 'bool_path') {
    return fromBool(getPath(traits, rule.path))
  }

  if (type === 'eq') {
    const got = getPath(traits, rule.path)
    if (got == null || got === '') return 'unknown'
    const g = String(got).toLowerCase()
    const want = String(rule.value || '').toLowerCase()
    const aliases = Array.isArray(rule.aliases)
      ? rule.aliases.map((a) => String(a).toLowerCase())
      : []
    if (g === want || aliases.includes(g)) return 'yes'
    return 'no'
  }

  if (type === 'year_range') {
    if (traits.year == null) return 'unknown'
    const min = Number(rule.min)
    const max = Number(rule.max)
    return traits.year >= min && traits.year <= max ? 'yes' : 'no'
  }

  if (type === 'year_gt') {
    if (traits.year == null) return 'unknown'
    return traits.year > Number(rule.value) ? 'yes' : 'no'
  }

  if (type === 'region') {
    if (!traits.region || traits.region === '—' || traits.region === '-') {
      return 'unknown'
    }
    const got = traits.region.toLowerCase()
    const aliases = Array.isArray(rule.aliases)
      ? rule.aliases.map((a) => String(a).toLowerCase())
      : []
    const ok = aliases.some((a) => got === a || got.includes(a))
    return ok ? 'yes' : 'no'
  }

  if (type === 'species_includes') {
    const sp = (traits.protagonist.species || '').toLowerCase()
    const needles = [
      String(rule.value || '').toLowerCase(),
      ...(Array.isArray(rule.aliases)
        ? rule.aliases.map((a) => String(a).toLowerCase())
        : []),
    ].filter(Boolean)
    if (
      !sp &&
      traits.protagonist.human == null &&
      traits.protagonist.animal == null
    ) {
      return 'unknown'
    }
    if (needles.some((n) => sp.includes(n))) return 'yes'
    if (sp || traits.protagonist.human != null || traits.protagonist.animal != null) {
      return 'no'
    }
    return 'unknown'
  }

  return 'unknown'
}

let catalogCache = { at: 0, categories: null, questions: null }

export function invalidateWhoamiCatalogCache() {
  catalogCache = { at: 0, categories: null, questions: null }
}

export async function seedWhoamiCatalog() {
  for (const c of DEFAULT_CATEGORIES) {
    await query(
      `INSERT INTO whoami_categories (id, label, sort_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET
         label = EXCLUDED.label,
         sort_order = EXCLUDED.sort_order`,
      [c.id, c.label, c.sort_order],
    )
  }
  for (const q of DEFAULT_QUESTIONS) {
    await query(
      `INSERT INTO whoami_questions (id, category_id, text, rule_json, sort_order, active)
       VALUES ($1, $2, $3, $4::jsonb, $5, true)
       ON CONFLICT (id) DO NOTHING`,
      [q.id, q.category_id, q.text, JSON.stringify(q.rule), q.sort_order],
    )
  }
}

async function loadCatalogFromDb() {
  const { rows: cats } = await query(
    `SELECT id, label, sort_order FROM whoami_categories ORDER BY sort_order, id`,
  )
  const { rows: qs } = await query(
    `SELECT id, category_id, text, rule_json, sort_order, active
     FROM whoami_questions
     WHERE active = true
     ORDER BY sort_order, id`,
  )
  return {
    categories: cats.map((c) => ({
      id: c.id,
      label: c.label,
      sort_order: c.sort_order,
    })),
    questions: qs.map((q) => ({
      id: q.id,
      category: q.category_id,
      category_id: q.category_id,
      text: q.text,
      rule: q.rule_json || {},
      sort_order: q.sort_order,
      active: true,
    })),
  }
}

function fallbackCatalog() {
  return {
    categories: DEFAULT_CATEGORIES.map((c) => ({
      id: c.id,
      label: c.label,
      sort_order: c.sort_order,
    })),
    questions: DEFAULT_QUESTIONS.map((q) => ({
      id: q.id,
      category: q.category_id,
      category_id: q.category_id,
      text: q.text,
      rule: q.rule,
      sort_order: q.sort_order,
      active: true,
    })),
  }
}

export async function getWhoamiCatalog({ force = false } = {}) {
  const now = Date.now()
  if (
    !force &&
    catalogCache.categories &&
    now - catalogCache.at < 30_000
  ) {
    return {
      categories: catalogCache.categories,
      questions: catalogCache.questions,
    }
  }
  try {
    const loaded = await loadCatalogFromDb()
    if (!loaded.questions.length) {
      await seedWhoamiCatalog()
      const again = await loadCatalogFromDb()
      catalogCache = { at: now, ...again }
      return again
    }
    catalogCache = { at: now, ...loaded }
    return loaded
  } catch {
    return fallbackCatalog()
  }
}

/** Compat: categorias estáticas se DB ainda não carregou. */
export const WHOAMI_CATEGORIES = DEFAULT_CATEGORIES.map((c) => ({
  id: c.id,
  label: c.label,
}))

export async function publicAskBank() {
  const { categories, questions } = await getWhoamiCatalog()
  return {
    categories: categories.map((c) => ({ id: c.id, label: c.label })),
    questions: questions.map((q) => ({
      id: q.id,
      category: q.category || q.category_id,
      text: q.text,
    })),
  }
}

export async function evaluateQuestion(movie, questionId) {
  const { questions } = await getWhoamiCatalog()
  const q = questions.find((x) => x.id === String(questionId))
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
    answer = evaluateRule(traits, q.rule) || 'unknown'
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

export async function previewAllAnswers(movie) {
  const { questions } = await getWhoamiCatalog()
  const traits = traitsFromMovie(movie)
  return questions.map((q) => {
    const answer = evaluateRule(traits, q.rule) || 'unknown'
    return {
      questionId: q.id,
      text: q.text,
      answer,
      answerLabel: ANSWER_LABEL[answer] || ANSWER_LABEL.unknown,
    }
  })
}

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
  for (const key of ['basedOnBook', 'franchise', 'basedOnTrueEvents', 'classic']) {
    if (key in patch) next[key] = boolOrNull(patch[key])
  }
  if ('protagonist' in patch && patch.protagonist && typeof patch.protagonist === 'object') {
    next.protagonist = {
      ...emptyProtagonist(),
      ...(prev.protagonist || {}),
      species:
        patch.protagonist.species == null || patch.protagonist.species === ''
          ? null
          : String(patch.protagonist.species),
      color:
        patch.protagonist.color == null || patch.protagonist.color === ''
          ? null
          : String(patch.protagonist.color).toLowerCase(),
      human: boolOrNull(patch.protagonist.human),
      animal: boolOrNull(patch.protagonist.animal),
      powers: boolOrNull(patch.protagonist.powers),
      multiple: boolOrNull(patch.protagonist.multiple),
    }
  }
  if ('antagonist' in patch && patch.antagonist && typeof patch.antagonist === 'object') {
    next.antagonist = {
      ...emptyAntagonist(),
      ...(prev.antagonist || {}),
      exists: boolOrNull(patch.antagonist.exists),
      human: boolOrNull(patch.antagonist.human),
      prince: boolOrNull(patch.antagonist.prince),
    }
  }
  if ('story' in patch && patch.story && typeof patch.story === 'object') {
    const keys = Object.keys(emptyStory())
    const story = { ...emptyStory(), ...(prev.story || {}) }
    for (const k of keys) {
      if (k in patch.story) story[k] = boolOrNull(patch.story[k])
    }
    next.story = story
  }
  if ('production' in patch && patch.production && typeof patch.production === 'object') {
    const keys = Object.keys(emptyProduction())
    const production = { ...emptyProduction(), ...(prev.production || {}) }
    for (const k of keys) {
      if (k in patch.production) production[k] = boolOrNull(patch.production[k])
    }
    next.production = production
  }

  base._traits = next
  return base
}

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

export const WHOAMI_MAX_ASKS = 999
export const WHOAMI_MAX_WRONG = 999
export const WHOAMI_AD_BONUS_ASKS = 0
export const WHOAMI_MAX_ADS = 0

function slugifyQuestionId(text) {
  const base = String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48)
  return base || `q_${Date.now()}`
}

export async function listAdminQuestions() {
  const { rows: cats } = await query(
    `SELECT id, label, sort_order FROM whoami_categories ORDER BY sort_order, id`,
  )
  const { rows: qs } = await query(
    `SELECT id, category_id, text, rule_json, sort_order, active, updated_at
     FROM whoami_questions
     ORDER BY category_id, sort_order, id`,
  )
  return {
    categories: cats,
    questions: qs.map((q) => ({
      id: q.id,
      categoryId: q.category_id,
      text: q.text,
      rule: q.rule_json || {},
      sortOrder: q.sort_order,
      active: q.active,
      updatedAt: q.updated_at,
    })),
  }
}

export async function upsertAdminCategory({ id, label, sortOrder = 100 }) {
  const cid = String(id || slugifyQuestionId(label)).slice(0, 40)
  await query(
    `INSERT INTO whoami_categories (id, label, sort_order)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order`,
    [cid, String(label || cid), Number(sortOrder) || 100],
  )
  invalidateWhoamiCatalogCache()
  return { id: cid, label: String(label || cid), sort_order: Number(sortOrder) || 100 }
}

export async function upsertAdminQuestion(body) {
  const text = String(body?.text || '').trim()
  const categoryId = String(body?.categoryId || '').trim()
  const rule = body?.rule && typeof body.rule === 'object' ? body.rule : null
  if (!text || !categoryId || !rule?.type) {
    throw new Error('text, categoryId e rule.type obrigatórios')
  }
  let id = String(body?.id || '').trim()
  if (!id) id = slugifyQuestionId(text)
  const sortOrder = Number(body?.sortOrder)
  const active = body?.active === false ? false : true
  await query(
    `INSERT INTO whoami_questions (id, category_id, text, rule_json, sort_order, active, updated_at)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, now())
     ON CONFLICT (id) DO UPDATE SET
       category_id = EXCLUDED.category_id,
       text = EXCLUDED.text,
       rule_json = EXCLUDED.rule_json,
       sort_order = EXCLUDED.sort_order,
       active = EXCLUDED.active,
       updated_at = now()`,
    [
      id,
      categoryId,
      text,
      JSON.stringify(rule),
      Number.isFinite(sortOrder) ? sortOrder : 100,
      active,
    ],
  )
  invalidateWhoamiCatalogCache()
  return {
    id,
    categoryId,
    text,
    rule,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 100,
    active,
  }
}

export async function deleteAdminQuestion(id) {
  await query(`DELETE FROM whoami_questions WHERE id = $1`, [String(id)])
  invalidateWhoamiCatalogCache()
}
