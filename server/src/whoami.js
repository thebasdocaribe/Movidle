/**
 * Quem sou eu — traits + avaliação verde/amarelo/vermelho.
 * Gêneros: cast_json._traits.genres (ids TMDB) + labels PT.
 */

export const WHOAMI_MAX_ASKS = 16
export const WHOAMI_MAX_WRONG = 6
/** Bônus por “anúncio” (stub no client; real depois). */
export const WHOAMI_AD_BONUS_ASKS = 5
export const WHOAMI_MAX_ADS = 2

/** id TMDB → label PT */
export const GENRE_LABEL = {
  28: 'Ação',
  12: 'Aventura',
  16: 'Animação',
  35: 'Comédia',
  80: 'Crime',
  99: 'Documentário',
  18: 'Drama',
  10751: 'Família',
  14: 'Fantasia',
  36: 'História',
  27: 'Terror',
  10402: 'Musical',
  9648: 'Mistério',
  10749: 'Romance',
  878: 'Ficção científica',
  10770: 'Telefilme',
  53: 'Suspense',
  10752: 'Guerra',
  37: 'Faroeste',
}

export const DECADES = [
  { id: '1950', label: 'Anos 1950', start: 1950, end: 1959 },
  { id: '1960', label: 'Anos 1960', start: 1960, end: 1969 },
  { id: '1970', label: 'Anos 1970', start: 1970, end: 1979 },
  { id: '1980', label: 'Anos 1980', start: 1980, end: 1989 },
  { id: '1990', label: 'Anos 1990', start: 1990, end: 1999 },
  { id: '2000', label: 'Anos 2000', start: 2000, end: 2009 },
  { id: '2010', label: 'Anos 2010', start: 2010, end: 2019 },
  { id: '2020', label: 'Anos 2020', start: 2020, end: 2029 },
]

export const ERAS = [
  { id: 'before_1970', label: 'Antes de 1970', test: (y) => y < 1970 },
  { id: '1970_1989', label: 'Entre 1970 e 1989', test: (y) => y >= 1970 && y <= 1989 },
  { id: '1990_1999', label: 'Anos 1990', test: (y) => y >= 1990 && y <= 1999 },
  { id: '2000_2009', label: 'Anos 2000', test: (y) => y >= 2000 && y <= 2009 },
  { id: '2010_2019', label: 'Anos 2010', test: (y) => y >= 2010 && y <= 2019 },
  { id: 'from_2020', label: '2020 ou depois', test: (y) => y >= 2020 },
]

export const RUNTIMES = [
  { id: 'short', label: 'Curta (< 90 min)', min: 0, max: 89 },
  { id: 'medium', label: 'Média (90–129 min)', min: 90, max: 129 },
  { id: 'long', label: 'Longa (130+ min)', min: 130, max: 999 },
]

export const FLAGS = [
  { id: 'animation', label: 'É animação' },
  { id: 'has_antagonist', label: 'Tem antagonista' },
  { id: 'pre_2000', label: 'É de antes dos anos 2000' },
  { id: 'this_century', label: 'É deste século (2000+)' },
]

export const ASK_BANK = {
  genres: Object.entries(GENRE_LABEL).map(([id, label]) => ({
    kind: 'genre',
    value: String(id),
    label,
  })),
  decades: DECADES.map((d) => ({
    kind: 'decade',
    value: d.id,
    label: d.label,
  })),
  eras: ERAS.map((e) => ({
    kind: 'era',
    value: e.id,
    label: e.label,
  })),
  regions: [
    'EUA',
    'Brasil',
    'Reino Unido',
    'França',
    'Alemanha',
    'Itália',
    'Japão',
    'Coreia do Sul',
    'Canadá',
    'Austrália',
    'Espanha',
    'México',
    'Índia',
    'Suécia',
  ].map((label) => ({ kind: 'region', value: label, label })),
  runtimes: RUNTIMES.map((r) => ({
    kind: 'runtime',
    value: r.id,
    label: r.label,
  })),
  flags: FLAGS.map((f) => ({
    kind: 'flag',
    value: f.id,
    label: f.label,
  })),
}

export function traitsFromMovie(movie) {
  const raw = movie?.cast_json
  const meta = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const traits = meta._traits && typeof meta._traits === 'object' ? meta._traits : {}
  const genres = Array.isArray(traits.genres)
    ? traits.genres.map(Number).filter((n) => Number.isFinite(n))
    : []
  const region = String(traits.region || meta.region || '—')
  const year = movie.year != null ? Number(movie.year) : null
  const runtime =
    traits.runtime != null && Number.isFinite(Number(traits.runtime))
      ? Number(traits.runtime)
      : null
  const ant = meta.antagonist
  const hasAntagonist = ant != null && ant !== false && !ant?.none
  return { genres, region, year, runtime, hasAntagonist }
}

export function publicAskBank() {
  return {
    maxAsks: WHOAMI_MAX_ASKS,
    maxWrong: WHOAMI_MAX_WRONG,
    adBonusAsks: WHOAMI_AD_BONUS_ASKS,
    maxAds: WHOAMI_MAX_ADS,
    /** Orçamento único compartilhado entre TODOS os tópicos */
    sharedBudget: true,
    genres: ASK_BANK.genres,
    decades: ASK_BANK.decades,
    eras: ASK_BANK.eras,
    regions: ASK_BANK.regions,
    runtimes: ASK_BANK.runtimes,
    flags: ASK_BANK.flags,
  }
}

/**
 * @returns {{ verdict: 'green'|'yellow'|'red', label: string }}
 */
export function evaluateAsk(movie, kind, value) {
  const traits = traitsFromMovie(movie)
  const labelOf = () => {
    if (kind === 'genre') return GENRE_LABEL[Number(value)] || String(value)
    if (kind === 'decade') {
      return DECADES.find((d) => d.id === value)?.label || String(value)
    }
    if (kind === 'era') {
      return ERAS.find((e) => e.id === value)?.label || String(value)
    }
    if (kind === 'runtime') {
      return RUNTIMES.find((r) => r.id === value)?.label || String(value)
    }
    if (kind === 'flag') {
      return FLAGS.find((f) => f.id === value)?.label || String(value)
    }
    return String(value)
  }
  const label = labelOf()

  if (kind === 'genre') {
    const gid = Number(value)
    const idx = traits.genres.indexOf(gid)
    if (idx === 0) return { verdict: 'green', label }
    if (idx > 0) return { verdict: 'yellow', label }
    return { verdict: 'red', label }
  }

  if (kind === 'decade') {
    const decade = DECADES.find((d) => d.id === value)
    if (!decade || traits.year == null) return { verdict: 'red', label }
    const y = traits.year
    if (y >= decade.start && y <= decade.end) {
      return { verdict: 'green', label }
    }
    if (
      (y >= decade.start - 10 && y < decade.start) ||
      (y > decade.end && y <= decade.end + 10)
    ) {
      return { verdict: 'yellow', label }
    }
    return { verdict: 'red', label }
  }

  if (kind === 'era') {
    const era = ERAS.find((e) => e.id === value)
    if (!era || traits.year == null) return { verdict: 'red', label }
    return { verdict: era.test(traits.year) ? 'green' : 'red', label }
  }

  if (kind === 'region') {
    const got = String(traits.region || '').toLowerCase()
    const want = String(value || '').toLowerCase()
    if (!got || got === '—' || got === '-') return { verdict: 'red', label }
    if (got === want) return { verdict: 'green', label }
    if (
      (want === 'eua' && (got === 'usa' || got === 'us' || got === 'estados unidos')) ||
      (want === 'reino unido' && (got === 'uk' || got === 'gb' || got === 'inglaterra'))
    ) {
      return { verdict: 'green', label }
    }
    return { verdict: 'red', label }
  }

  if (kind === 'runtime') {
    const bucket = RUNTIMES.find((r) => r.id === value)
    if (!bucket || traits.runtime == null) return { verdict: 'red', label }
    const rt = traits.runtime
    if (rt >= bucket.min && rt <= bucket.max) {
      return { verdict: 'green', label }
    }
    // vizinho: amarelo
    if (value === 'short' && rt >= 90 && rt <= 100) {
      return { verdict: 'yellow', label }
    }
    if (value === 'medium' && ((rt >= 80 && rt < 90) || (rt > 129 && rt <= 140))) {
      return { verdict: 'yellow', label }
    }
    if (value === 'long' && rt >= 120 && rt < 130) {
      return { verdict: 'yellow', label }
    }
    return { verdict: 'red', label }
  }

  if (kind === 'flag') {
    if (value === 'animation') {
      const yes = traits.genres.includes(16)
      return { verdict: yes ? 'green' : 'red', label }
    }
    if (value === 'has_antagonist') {
      return { verdict: traits.hasAntagonist ? 'green' : 'red', label }
    }
    if (value === 'pre_2000') {
      if (traits.year == null) return { verdict: 'red', label }
      return { verdict: traits.year < 2000 ? 'green' : 'red', label }
    }
    if (value === 'this_century') {
      if (traits.year == null) return { verdict: 'red', label }
      return { verdict: traits.year >= 2000 ? 'green' : 'red', label }
    }
  }

  return { verdict: 'red', label }
}

/** Pontos: quanto menos perguntas/erros, melhor */
export function whoamiPoints({ won, asksUsed, wrongGuesses }) {
  if (!won) return 0
  const askPenalty = Math.min(asksUsed, WHOAMI_MAX_ASKS + WHOAMI_AD_BONUS_ASKS * WHOAMI_MAX_ADS) * 4
  const wrongPenalty = Math.min(wrongGuesses, WHOAMI_MAX_WRONG) * 10
  return Math.max(15, 120 - askPenalty - wrongPenalty)
}
