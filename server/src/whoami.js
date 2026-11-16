/**
 * Quem sou eu — investigação por perguntas (Akinator invertido).
 * Traits em movies.cast_json._traits; pergunta sem dado → unknown.
 * Perguntas/categorias: DB (editáveis no admin) + seed padrão.
 */

import { query } from './db.js'
import {
  WHOAMI_CATEGORIES_V2,
  WHOAMI_QUESTIONS_V2,
  isWhoamiQuestionUnlocked,
} from './whoamiQuestionsCatalog.js'

export { isWhoamiQuestionUnlocked }

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
  action: 28,
  musical: 10402,
  kids: 10751,
  scifi: 878,
  animation: 16,
  drama: 18,
  documentary: 99,
  western: 37,
  war: 10752,
  crime: 80,
  romance: 10749,
  thriller: 53,
}

/** Tipos de regra que o admin pode escolher. */
export const RULE_TYPES = [
  { id: 'format', label: 'Formato (animação / live-action)', needs: 'format' },
  { id: 'studio', label: 'Estúdio', needs: 'studio' },
  { id: 'tag', label: 'Tag / gênero', needs: 'tag' },
  { id: 'genres_all', label: 'Todos os gêneros TMDB', needs: 'tagList' },
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
  { id: 'isAdaptation', label: 'Adaptação de outra obra' },
  { id: 'franchise', label: 'Franquia' },
  { id: 'basedOnTrueEvents', label: 'Fatos reais' },
  { id: 'classic', label: 'Clássico' },
  { id: 'independent', label: 'Produção independente' },
]

export const BOOL_PATHS = [
  { id: 'protagonist.human', label: 'Protagonista humano' },
  { id: 'protagonist.male', label: 'Protagonista homem' },
  { id: 'protagonist.female', label: 'Protagonista mulher' },
  { id: 'protagonist.child', label: 'Protagonista criança' },
  { id: 'protagonist.teen', label: 'Protagonista adolescente' },
  { id: 'protagonist.animal', label: 'Protagonista animal' },
  { id: 'protagonist.fantastical', label: 'Criatura fantástica' },
  { id: 'protagonist.alien', label: 'Extraterrestre' },
  { id: 'protagonist.monster', label: 'Monstro' },
  { id: 'protagonist.villain', label: 'Protagonista vilão' },
  { id: 'protagonist.hero', label: 'Protagonista herói' },
  { id: 'protagonist.basedOnRealPerson', label: 'Baseado em pessoa real' },
  { id: 'protagonist.powers', label: 'Protagonista com poderes' },
  { id: 'protagonist.multiple', label: 'Vários protagonistas' },
  { id: 'antagonist.exists', label: 'Tem antagonista' },
  { id: 'antagonist.human', label: 'Vilão humano' },
  { id: 'antagonist.prince', label: 'Tem príncipe' },
  { id: 'story.onEarth', label: 'Acontece na Terra' },
  { id: 'story.inSpace', label: 'Acontece no espaço' },
  { id: 'story.inPast', label: 'Acontece no passado' },
  { id: 'story.future', label: 'Acontece no futuro' },
  { id: 'story.historicalEra', label: 'Época histórica específica' },
  { id: 'story.inCity', label: 'Principalmente em cidade' },
  { id: 'story.investigation', label: 'Envolve investigação' },
  { id: 'story.journey', label: 'Envolve jornada' },
  { id: 'story.survival', label: 'Envolve sobrevivência' },
  { id: 'story.revenge', label: 'Vingança' },
  { id: 'story.war', label: 'Envolve guerra' },
  { id: 'story.crime', label: 'Envolve crime' },
  { id: 'story.supernaturalThreat', label: 'Ameaça sobrenatural' },
  { id: 'story.charactersHavePowers', label: 'Personagens com poderes' },
  { id: 'story.kingdom', label: 'História em reino' },
  { id: 'story.saveSomeone', label: 'Salvar alguém' },
  { id: 'story.fantasyWorld', label: 'Universo fantástico' },
  { id: 'story.prophecy', label: 'Profecia' },
  { id: 'production.oscar', label: 'Ganhou Oscar (qualquer categoria)' },
  { id: 'production.oscarNominated', label: 'Indicado a Oscar (qualquer categoria)' },
  { id: 'production.oscarBestPictureNom', label: 'Indicado a Melhor Filme' },
  { id: 'production.oscarBestPicture', label: 'Ganhou Melhor Filme' },
  { id: 'production.adaptedFromGame', label: 'Adaptado de videogame' },
  { id: 'production.adaptedFromComics', label: 'Adaptado de HQ' },
  { id: 'production.basedOnPlay', label: 'Baseado em peça' },
  { id: 'production.theatricalRelease', label: 'Lançado nos cinemas' },
  { id: 'production.hasRemake', label: 'Tem refilmagem' },
  { id: 'production.isRemake', label: 'É remake' },
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

export const DEFAULT_CATEGORIES = WHOAMI_CATEGORIES_V2
export const DEFAULT_QUESTIONS = WHOAMI_QUESTIONS_V2

/** IDs antigos desativados dinamicamente no seed (tudo fora do v2). */
export const WHOAMI_QUESTIONS_DEACTIVATE = []

function emptyProtagonist() {
  return {
    species: null,
    color: null,
    human: null,
    male: null,
    female: null,
    child: null,
    teen: null,
    young: null,
    animal: null,
    anthropomorphic: null,
    fantastical: null,
    alien: null,
    monster: null,
    villain: null,
    hero: null,
    basedOnRealPerson: null,
    powers: null,
    multiple: null,
    spy: null,
    superhero: null,
    lawEnforcement: null,
    comedyDuo: null,
    detective: null,
    addiction: null,
    gunslinger: null,
    bountyHunter: null,
    soldier: null,
    musician: null,
    specialDestiny: null,
  }
}
function emptyAntagonist() {
  return {
    exists: null,
    human: null,
    prince: null,
    humanKiller: null,
    monster: null,
  }
}
function emptyStory() {
  return {
    onEarth: null,
    inSpace: null,
    inPast: null,
    future: null,
    historicalEra: null,
    inCity: null,
    investigation: null,
    journey: null,
    survival: null,
    revenge: null,
    war: null,
    crime: null,
    supernaturalThreat: null,
    charactersHavePowers: null,
    kingdom: null,
    saveSomeone: null,
    fantasyWorld: null,
    prophecy: null,
    fairyTale: null,
    possession: null,
    hauntedHouse: null,
    zombies: null,
    bodyHorror: null,
    spaceTravel: null,
    aliens: null,
    ai: null,
    timeTravel: null,
    dystopia: null,
    apocalypse: null,
    robots: null,
    scienceExperiments: null,
    virtualReality: null,
    firstContact: null,
    martialArts: null,
    rescue: null,
    chase: null,
    crimeOrg: null,
    heist: null,
    saveWorld: null,
    darkComedy: null,
    absurdComedy: null,
    satire: null,
    slapstick: null,
    teenComedy: null,
    misunderstandings: null,
    magic: null,
    mythicalCreatures: null,
    powerfulObject: null,
    mythology: null,
    goodVsEvil: null,
    serialKiller: null,
    identityMystery: null,
    bigTwist: null,
    hunted: null,
    conspiracy: null,
    centralMystery: null,
    trustIssues: null,
    familyIssues: null,
    socialInequality: null,
    familyConflict: null,
    personalTragedy: null,
    prison: null,
    discrimination: null,
    psychologicalConflict: null,
    politicalSocial: null,
    coupleLeads: null,
    forbiddenLove: null,
    impossibleLove: null,
    loveTriangle: null,
    coupleSeparation: null,
    classDifferenceRomance: null,
    loveAtFirstSight: null,
    oldWest: null,
    landDispute: null,
    sheriffOutlaws: null,
    indigenousConflict: null,
    gunDuel: null,
    ww2: null,
    ww1: null,
    realBattle: null,
    militaryGroup: null,
    holocaust: null,
    revolution: null,
    historicalFigure: null,
    antiquity: null,
    coldWar: null,
    charactersSing: null,
    musicalNumbers: null,
    musicIndustry: null,
    band: null,
    environment: null,
    historicalEvent: null,
    familyLeads: null,
    talkingAnimals: null,
    moralLesson: null,
    absentParents: null,
    childCreatureFriendship: null,
  }
}
function emptyProduction() {
  return {
    oscar: null,
    oscarNominated: null,
    oscarBestPictureNom: null,
    oscarBestPicture: null,
    adaptedFromGame: null,
    adaptedFromComics: null,
    basedOnPlay: null,
    theatricalRelease: null,
    hasRemake: null,
    isRemake: null,
    famousSong: null,
    sequel: null,
    controversial: null,
    horrorDirector: null,
    postCredits: null,
    animation2d: null,
    animation3d: null,
    stopMotion: null,
    anime: null,
    animatedMusical: null,
    handDrawnLook: null,
    foundFootage: null,
    originalSongs: null,
    realPeople: null,
    interviews: null,
    investigativeDoc: null,
    biographyDoc: null,
    musicDoc: null,
    archiveFootage: null,
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
    format:
      t.format === 'animation' ||
      t.format === 'live_action' ||
      t.format === 'hybrid'
        ? t.format
        : null,
    studios,
    basedOnBook: boolOrNull(t.basedOnBook),
    isAdaptation: boolOrNull(t.isAdaptation),
    franchise: boolOrNull(t.franchise),
    basedOnTrueEvents: boolOrNull(t.basedOnTrueEvents),
    classic: boolOrNull(t.classic),
    independent: boolOrNull(t.independent),
    tags,
    protagonist: {
      ...Object.fromEntries(
        Object.keys(emptyProtagonist())
          .filter((k) => k !== 'species' && k !== 'color')
          .map((k) => [k, boolOrNull(protagonist[k])]),
      ),
      species: protagonist.species != null ? String(protagonist.species) : null,
      color:
        protagonist.color != null
          ? String(protagonist.color).toLowerCase()
          : null,
    },
    antagonist: Object.fromEntries(
      Object.keys(emptyAntagonist()).map((k) => [
        k,
        boolOrNull(antagonist[k]),
      ]),
    ),
    story: Object.fromEntries(
      Object.keys(emptyStory()).map((k) => [k, boolOrNull(story[k])]),
    ),
    production: Object.fromEntries(
      Object.keys(emptyProduction()).map((k) => [k, boolOrNull(production[k])]),
    ),
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
    if (want === 'hybrid') {
      // só com curadoria explícita (mistura animação + live-action)
      return 'unknown'
    }
    return 'unknown'
  }

  if (type === 'genres_all') {
    const wants = Array.isArray(rule.values) ? rule.values : []
    const ids = wants
      .map((t) => TMDB_GENRE[String(t).toLowerCase()])
      .filter((n) => n != null)
    if (!ids.length) return 'unknown'
    if (!traits.genres.length) return 'unknown'
    return ids.every((id) => traits.genres.includes(id)) ? 'yes' : 'no'
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
    if (rule.field === 'isAdaptation') {
      const explicit = traits.isAdaptation
      if (explicit != null) return fromBool(explicit)
      const signals = [
        traits.basedOnBook,
        traits.production?.adaptedFromComics,
        traits.production?.adaptedFromGame,
        traits.production?.basedOnPlay,
      ]
      if (signals.some((s) => s === true)) return 'yes'
      if (signals.length && signals.every((s) => s === false)) return 'no'
      return 'unknown'
    }
    return fromBool(traits[rule.field])
  }

  if (type === 'bool_path') {
    if (rule.path === 'protagonist.young') {
      const explicit = getPath(traits, 'protagonist.young')
      if (explicit != null) return fromBool(explicit)
      const child = traits.protagonist?.child
      const teen = traits.protagonist?.teen
      if (child === true || teen === true) return 'yes'
      if (child === false && teen === false) return 'no'
      return 'unknown'
    }
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
      `INSERT INTO whoami_questions
         (id, category_id, text, rule_json, unlock_json, sort_order, active, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, true, now())
       ON CONFLICT (id) DO UPDATE SET
         category_id = EXCLUDED.category_id,
         text = EXCLUDED.text,
         rule_json = EXCLUDED.rule_json,
         unlock_json = EXCLUDED.unlock_json,
         sort_order = EXCLUDED.sort_order,
         active = true,
         updated_at = now()`,
      [
        q.id,
        q.category_id,
        q.text,
        JSON.stringify(q.rule),
        q.unlock ? JSON.stringify(q.unlock) : null,
        q.sort_order,
      ],
    )
  }
  const keepIds = DEFAULT_QUESTIONS.map((q) => q.id)
  await query(
    `UPDATE whoami_questions
     SET active = false, updated_at = now()
     WHERE NOT (id = ANY($1::text[]))`,
    [keepIds],
  )
  if (WHOAMI_QUESTIONS_DEACTIVATE.length) {
    await query(
      `UPDATE whoami_questions
       SET active = false, updated_at = now()
       WHERE id = ANY($1::text[])`,
      [WHOAMI_QUESTIONS_DEACTIVATE],
    )
  }
  invalidateWhoamiCatalogCache()
}

async function loadCatalogFromDb() {
  const { rows: cats } = await query(
    `SELECT id, label, sort_order FROM whoami_categories ORDER BY sort_order, id`,
  )
  const { rows: qs } = await query(
    `SELECT id, category_id, text, rule_json, unlock_json, sort_order, active
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
      unlock: q.unlock_json || null,
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
      unlock: q.unlock || null,
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
      unlock: q.unlock || null,
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
      category: q.category || q.category_id,
      text: q.text,
      answer,
      answerLabel: ANSWER_LABEL[answer] || ANSWER_LABEL.unknown,
      unlock: q.unlock || null,
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
  'independent',
  'tags',
  'protagonist.human',
  'protagonist.male',
  'protagonist.female',
  'protagonist.child',
  'protagonist.teen',
  'protagonist.animal',
  'protagonist.fantastical',
  'protagonist.alien',
  'protagonist.monster',
  'protagonist.villain',
  'protagonist.hero',
  'protagonist.basedOnRealPerson',
  'protagonist.powers',
  'protagonist.multiple',
  'protagonist.species',
  'antagonist.exists',
  'antagonist.human',
  'antagonist.prince',
  'story.onEarth',
  'story.inSpace',
  'story.inPast',
  'story.future',
  'story.historicalEra',
  'story.inCity',
  'story.investigation',
  'story.journey',
  'story.survival',
  'story.revenge',
  'story.war',
  'story.crime',
  'story.supernaturalThreat',
  'story.charactersHavePowers',
  'production.oscar',
  'production.oscarNominated',
  'production.oscarBestPictureNom',
  'production.oscarBestPicture',
  'production.adaptedFromGame',
  'production.adaptedFromComics',
  'production.basedOnPlay',
  'production.theatricalRelease',
  'production.hasRemake',
  'production.isRemake',
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
      patch.format === 'animation' ||
      patch.format === 'live_action' ||
      patch.format === 'hybrid'
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
    'isAdaptation',
    'franchise',
    'basedOnTrueEvents',
    'classic',
    'independent',
  ]) {
    if (key in patch) next[key] = boolOrNull(patch[key])
  }
  if ('protagonist' in patch && patch.protagonist && typeof patch.protagonist === 'object') {
    const p = patch.protagonist
    const merged = {
      ...emptyProtagonist(),
      ...(prev.protagonist || {}),
    }
    if ('species' in p) {
      merged.species =
        p.species == null || p.species === '' ? null : String(p.species)
    }
    if ('color' in p) {
      merged.color =
        p.color == null || p.color === '' ? null : String(p.color).toLowerCase()
    }
    for (const key of Object.keys(emptyProtagonist())) {
      if (key === 'species' || key === 'color') continue
      if (key in p) merged[key] = boolOrNull(p[key])
    }
    next.protagonist = merged
  }
  if ('antagonist' in patch && patch.antagonist && typeof patch.antagonist === 'object') {
    const keys = Object.keys(emptyAntagonist())
    const antagonist = {
      ...emptyAntagonist(),
      ...(prev.antagonist || {}),
    }
    for (const k of keys) {
      if (k in patch.antagonist) antagonist[k] = boolOrNull(patch.antagonist[k])
    }
    next.antagonist = antagonist
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
    isAdaptation: t.isAdaptation,
    franchise: t.franchise,
    basedOnTrueEvents: t.basedOnTrueEvents,
    classic: t.classic,
    independent: t.independent,
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
  { id: 'action', label: 'Ação' },
  { id: 'adventure', label: 'Aventura' },
  { id: 'fantasy', label: 'Fantasia' },
  { id: 'parody', label: 'Paródia' },
  { id: 'musical', label: 'Musical' },
  { id: 'kids', label: 'Infantil' },
  { id: 'scifi', label: 'Ficção científica' },
  { id: 'drama', label: 'Drama' },
  { id: 'romance', label: 'Romance' },
  { id: 'thriller', label: 'Suspense' },
  { id: 'psychological_thriller', label: 'Thriller psicológico' },
  { id: 'crime', label: 'Policial / crime' },
  { id: 'war', label: 'Guerra' },
  { id: 'western', label: 'Faroeste' },
  { id: 'spaghetti_western', label: 'Faroeste spaghetti' },
  { id: 'slasher', label: 'Slasher' },
  { id: 'documentary', label: 'Documentário' },
]

/** Orçamento do modo difícil: investiga com limite, depois tem que chutar. */
export const WHOAMI_MAX_ASKS = 20
export const WHOAMI_MAX_WRONG = 5
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
