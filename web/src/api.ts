import {
  authHeaders,
  type AuthUser,
  type ProgressMap,
} from './auth'

export type GameMode =
  | 'daily'
  | 'classic'
  | 'cast'
  | 'character'
  | 'whoami'
  | 'keywords'

export type PriorPlayResult = {
  won: boolean
  take?: number | null
  points: number
  title?: string
  titlePt?: string
  year?: number
  posterUrl?: string | null
  name?: string
  namePt?: string
  filmTitle?: string
  imageUrl?: string
}

export type DailyPayload = {
  puzzleId: string
  mode?: GameMode
  date?: string
  movieId?: string
  takeDurations: number[]
  media: { type: 'image' | 'video'; url: string }
  posterUrl?: string | null
  attribution: string | null
  alreadyPlayed?: boolean
  cycleRestarted?: boolean
  /** Se já jogou: reabre no estado final */
  priorResult?: PriorPlayResult | null
  /** Quantas pessoas já acertaram o daily de hoje */
  solvedCount?: number
}

export type GuessResult = {
  correct: boolean
  points: number
  title?: string
  titlePt?: string
  year?: number
  posterUrl?: string
  /** Quantas pessoas (incl. você) chutaram esse título no daily */
  alsoGuessedCount?: number
  /** Errou o filme, acertou a franquia */
  franchise?: boolean
}

export type GiveUpResult = {
  points: number
  title: string
  titlePt?: string
  year?: number
  posterUrl?: string
}

export type AutocompleteItem = {
  title: string
  titlePt?: string | null
  year?: number | null
  label: string
  movieId?: string
  posterUrl?: string | null
}

export type RankEntry = {
  rank: number
  userId?: string
  name: string
  username: string
  avatarUrl?: string | null
  score: number
  streak: number
}

export type AchievementTier = 'normal' | 'special' | 'super'
export type AchievementCategory = 'geral' | 'daily' | 'endless' | 'hall'

export type Achievement = {
  id: string
  title: string
  desc: string
  locked: boolean
  tier?: AchievementTier
  category?: AchievementCategory
  icon?: string
  progress?: { current: number; max: number } | null
  communityPct?: number
}

export type OscarsResponse = {
  achievements: Achievement[]
  categories: Record<string, string>
  unlocked: number
  total: number
  remaining: number
}

export type PublicProfile = {
  id: string
  username: string
  displayName: string
  avatarUrl?: string | null
  bio?: string
  progress?: ProgressMap | null
  achievements: Achievement[]
}

export type PublicUserCard = {
  id: string
  username: string
  displayName: string
  avatarUrl?: string | null
  bio?: string
}

export type AuthResponse = {
  token: string
  user: AuthUser
  progress: ProgressMap
}

export type RoundFinishResult = {
  points: number
  multiplier: number
  progress: ProgressMap
  title: string
  titlePt?: string
  year?: number
  posterUrl?: string
  unlockedAchievements?: Achievement[]
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  const trimmed = text.trim()
  if (trimmed.startsWith('<!') || trimmed.startsWith('<html')) {
    throw new Error(
      'API offline ou desatualizada — reinicie o server (npm start em server/)',
    )
  }
  let data: { error?: string } & T
  try {
    data = JSON.parse(text) as { error?: string } & T
  } catch {
    throw new Error(`Resposta inválida da API (HTTP ${res.status})`)
  }
  if (!res.ok) {
    const detail = data?.error || `HTTP ${res.status}`
    throw new Error(res.status === 401 ? `401 ${detail}` : detail)
  }
  return data
}

export function fetchDaily(date?: string) {
  const q = date ? `?date=${encodeURIComponent(date)}` : ''
  return fetch(`/api/daily${q}`, { headers: { ...authHeaders() } }).then((r) =>
    parseJson<DailyPayload>(r),
  )
}

export function fetchClassicNext(excludeIds: string[] = []) {
  const q =
    excludeIds.length > 0
      ? `?exclude=${encodeURIComponent(excludeIds.join(','))}`
      : ''
  return fetch(`/api/classic/next${q}`, {
    headers: { ...authHeaders() },
  }).then((r) => parseJson<DailyPayload>(r))
}

export function fetchAutocomplete(q: string) {
  if (!q.trim()) {
    return Promise.resolve({ suggestions: [] as AutocompleteItem[] })
  }
  return fetch(`/api/autocomplete?q=${encodeURIComponent(q)}`).then((r) =>
    parseJson<{ suggestions: AutocompleteItem[] }>(r),
  )
}

export function postGuess(body: {
  puzzleId: string
  attempt: number
  guess: string
}) {
  return fetch('/api/guess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then((r) => parseJson<GuessResult>(r))
}

export type CastHint = {
  kind: string
  label: string
  name: string
  imageUrl?: string | null
  /** true = filme sem antagonista (dica válida) */
  empty?: boolean
}

export type CastDailyPayload = {
  puzzleId: string
  mode: 'cast'
  date?: string
  posterUrl?: string | null
  posterPortrait?: string | null
  attribution: string | null
  maxTakes: number
  hints: CastHint[]
  alreadyPlayed?: boolean
  priorResult?: PriorPlayResult | null
  endless?: boolean
  /** easy | mid | hard | elite — só no infinito */
  difficulty?: string
}

export function fetchCastDaily(date?: string) {
  const q = date ? `?date=${encodeURIComponent(date)}` : ''
  return fetch(`/api/cast/daily${q}`, { headers: { ...authHeaders() } }).then(
    (r) => parseJson<CastDailyPayload>(r),
  )
}

export function fetchCastNext(excludeIds: string[] = []) {
  const q =
    excludeIds.length > 0
      ? `?exclude=${encodeURIComponent(excludeIds.join(','))}`
      : ''
  return fetch(`/api/cast/next${q}`, { headers: { ...authHeaders() } }).then(
    (r) => parseJson<CastDailyPayload>(r),
  )
}

export type WhoamiAskOption = {
  kind: 'genre' | 'decade' | 'era' | 'region' | 'runtime' | 'flag'
  value: string
  label: string
}

export type WhoamiAnswer = 'yes' | 'no' | 'partial' | 'unknown'

export type WhoamiCategory = {
  id: string
  label: string
}

export type WhoamiQuestion = {
  id: string
  category: string
  text: string
}

export type WhoamiAskBank = {
  categories: WhoamiCategory[]
  questions: WhoamiQuestion[]
}

export type WhoamiHistoryItem = {
  questionId: string
  text: string
  answer: WhoamiAnswer
  answerLabel: string
  key: string
}

export type WhoamiPayload = {
  puzzleId: string
  mode: 'whoami'
  date?: string
  endless?: boolean
  attribution: string | null
  askBank: WhoamiAskBank
  maxAsks?: number
  maxWrong?: number
  alreadyPlayed?: boolean
  priorResult?: PriorPlayResult & { asks?: number } | null
}

/** @deprecated legado */
export type WhoamiAskChip = WhoamiAskOption & {
  verdict: 'green' | 'yellow' | 'red'
}

export function fetchWhoamiDaily(date?: string) {
  const q = date ? `?date=${encodeURIComponent(date)}` : ''
  return fetch(`/api/whoami/daily${q}`, { headers: { ...authHeaders() } }).then(
    (r) => parseJson<WhoamiPayload>(r),
  )
}

export function fetchWhoamiNext(excludeIds: string[] = []) {
  const q =
    excludeIds.length > 0
      ? `?exclude=${encodeURIComponent(excludeIds.join(','))}`
      : ''
  return fetch(`/api/whoami/next${q}`, { headers: { ...authHeaders() } }).then(
    (r) => parseJson<WhoamiPayload>(r),
  )
}

export function postWhoamiAsk(body: {
  puzzleId: string
  questionId: string
  asksUsed: number
}) {
  return fetch('/api/whoami/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then((r) =>
    parseJson<{
      questionId: string
      text: string
      answer: WhoamiAnswer
      answerLabel: string
      asksUsed?: number
      asksLeft?: number
      maxAsks?: number
    }>(r),
  )
}

export function postWhoamiGuess(body: {
  puzzleId: string
  guess: string
  asksUsed: number
  wrongGuesses: number
  durationSec?: number
}) {
  return fetch('/api/whoami/guess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then((r) =>
    parseJson<{
      correct: boolean
      points: number
      wrongGuesses?: number
      wrongLeft?: number
      maxWrong?: number
      ended?: boolean
      title?: string
      titlePt?: string
      year?: number
      posterUrl?: string
    }>(r),
  )
}

export function giveUpWhoami(body: {
  puzzleId: string
  asksUsed: number
  wrongGuesses: number
  durationSec?: number
  endless?: boolean
}) {
  return fetch('/api/whoami/give-up', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then((r) =>
    parseJson<{
      givenUp: boolean
      points: number
      progress?: ProgressMap | null
      unlockedAchievements?: Achievement[]
      title: string
      titlePt?: string
      year?: number
      posterUrl?: string
    }>(r),
  )
}

export function finishWhoami(body: {
  puzzleId: string
  outcome: 'win' | 'lose'
  asksUsed: number
  wrongGuesses: number
  durationSec?: number
  endless?: boolean
}) {
  return fetch('/api/whoami/finish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then((r) =>
    parseJson<{
      points: number
      progress: ProgressMap
      unlockedAchievements?: Achievement[]
      title: string
      titlePt?: string
      year?: number
      posterUrl?: string
    }>(r),
  )
}

export type WhoamiTraits = {
  genres: number[]
  region: string | null
  runtime: number | null
  year: number | null
  format: 'animation' | 'live_action' | null
  studios: string[]
  basedOnBook: boolean | null
  franchise: boolean | null
  basedOnTrueEvents: boolean | null
  classic: boolean | null
  tags: string[]
  protagonist: {
    species: string | null
    color: string | null
    human: boolean | null
    animal: boolean | null
    powers: boolean | null
    multiple: boolean | null
  }
  antagonist: {
    exists: boolean | null
    human: boolean | null
    prince: boolean | null
  }
  story: {
    kingdom: boolean | null
    future: boolean | null
    journey: boolean | null
    saveSomeone: boolean | null
    revenge: boolean | null
    fantasyWorld: boolean | null
    prophecy: boolean | null
  }
  production: {
    oscar: boolean | null
    famousSong: boolean | null
    sequel: boolean | null
    controversial: boolean | null
    horrorDirector: boolean | null
    postCredits: boolean | null
  }
}

export type AdminWhoamiMovieCard = {
  id: string
  title: string
  titlePt: string
  year: number | null
  posterUrl: string | null
  completeness: { filled: number; total: number; pct: number }
}

export type AdminWhoamiMovieDetail = AdminWhoamiMovieCard & {
  director: string | null
  traits: WhoamiTraits
  preview: {
    questionId: string
    text: string
    answer: WhoamiAnswer
    answerLabel: string
  }[]
}

export function fetchAdminWhoamiMovies(q = '') {
  const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''
  return fetch(`/api/admin/whoami/movies${qs}`, {
    headers: { ...authHeaders() },
  }).then((r) => parseJson<{ movies: AdminWhoamiMovieCard[] }>(r))
}

export function fetchAdminWhoamiMovie(id: string) {
  return fetch(`/api/admin/whoami/movies/${encodeURIComponent(id)}`, {
    headers: { ...authHeaders() },
  }).then(
    (r) =>
      parseJson<{
        movie: AdminWhoamiMovieDetail
        meta: {
          categories: WhoamiCategory[]
          studios: { id: string; label: string }[]
          tags: { id: string; label: string }[]
        }
      }>(r),
  )
}

export function patchAdminWhoamiTraits(id: string, traits: Partial<WhoamiTraits>) {
  return fetch(`/api/admin/whoami/movies/${encodeURIComponent(id)}/traits`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ traits }),
  }).then((r) => parseJson<{ movie: AdminWhoamiMovieDetail }>(r))
}

export type WhoamiRule = {
  type: string
  value?: string | number
  field?: string
  path?: string
  min?: number
  max?: number
  aliases?: string[]
}

export type AdminWhoamiQuestion = {
  id: string
  categoryId: string
  text: string
  rule: WhoamiRule
  sortOrder: number
  active: boolean
}

export function fetchAdminWhoamiQuestions() {
  return fetch('/api/admin/whoami/questions', {
    headers: { ...authHeaders() },
  }).then(
    (r) =>
      parseJson<{
        categories: { id: string; label: string; sort_order: number }[]
        questions: AdminWhoamiQuestion[]
        ruleTypes: { id: string; label: string; needs: string }[]
        boolFields: { id: string; label: string }[]
        boolPaths: { id: string; label: string }[]
        eqPaths: { id: string; label: string }[]
        studios: { id: string; label: string }[]
        tags: { id: string; label: string }[]
      }>(r),
  )
}

export function saveAdminWhoamiQuestion(body: {
  id?: string
  categoryId: string
  text: string
  rule: WhoamiRule
  sortOrder?: number
  active?: boolean
}) {
  const hasId = Boolean(body.id)
  const url = hasId
    ? `/api/admin/whoami/questions/${encodeURIComponent(body.id!)}`
    : '/api/admin/whoami/questions'
  return fetch(url, {
    method: hasId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then((r) => parseJson<{ question: AdminWhoamiQuestion }>(r))
}

export function deleteAdminWhoamiQuestion(id: string) {
  return fetch(`/api/admin/whoami/questions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  }).then((r) => parseJson<{ ok: boolean }>(r))
}

export function saveAdminWhoamiCategory(body: {
  id?: string
  label: string
  sortOrder?: number
}) {
  return fetch('/api/admin/whoami/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then(
    (r) =>
      parseJson<{ category: { id: string; label: string; sort_order: number } }>(
        r,
      ),
  )
}

export type KeywordsPayload = {
  puzzleId: string
  mode: 'keywords'
  date?: string
  attribution: string | null
  startWords: number
  perWrong: number
  revealByWrong?: number[]
  maxWrong: number
  pixelAt: number
  words: string[]
  revealedCount: number
  totalHintSlots: number
  showPixelPoster: boolean
  pixelPosterUrl: string | null
  alreadyPlayed?: boolean
  priorResult?: PriorPlayResult & { guesses?: number } | null
}

export function fetchKeywordsDaily(date?: string) {
  const q = date ? `?date=${encodeURIComponent(date)}` : ''
  return fetch(`/api/keywords/daily${q}`, {
    headers: { ...authHeaders() },
  }).then((r) => parseJson<KeywordsPayload>(r))
}

type KeywordsGuessResult = {
  correct: boolean
  skipped?: boolean
  points: number
  wrongGuesses: number
  words: string[]
  revealedCount: number
  addedWords?: number
  showPixelPoster: boolean
  pixelPosterUrl: string | null
  ended: boolean
  title?: string
  titlePt?: string
  year?: number
  posterUrl?: string
}

export function postKeywordsGuess(body: {
  puzzleId: string
  guess?: string
  skip?: boolean
  wrongGuesses: number
}) {
  const skip = Boolean(body.skip) || !String(body.guess || '').trim()
  const path = skip ? '/api/keywords/skip' : '/api/keywords/guess'
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(
      skip
        ? { puzzleId: body.puzzleId, wrongGuesses: body.wrongGuesses }
        : {
            puzzleId: body.puzzleId,
            guess: body.guess,
            wrongGuesses: body.wrongGuesses,
          },
    ),
  }).then((r) => parseJson<KeywordsGuessResult>(r))
}

export function finishKeywords(body: {
  puzzleId: string
  outcome: 'win' | 'lose'
  wrongGuesses: number
  guesses: number
}) {
  return fetch('/api/keywords/finish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then((r) =>
    parseJson<{
      points: number
      progress: ProgressMap
      unlockedAchievements?: Achievement[]
      title: string
      titlePt?: string
      year?: number
      posterUrl?: string
    }>(r),
  )
}

export function postCastGuess(body: {
  puzzleId: string
  attempt: number
  guess: string
}) {
  return fetch('/api/cast/guess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then((r) =>
    parseJson<GuessResult & { hintsUnlocked?: number }>(r),
  )
}

export type CharacterCropStage = {
  label: string
  x: number
  y: number
  zoom: number
}

export type CharacterPayload = {
  puzzleId: string
  mode: 'character'
  imageUrl: string
  attribution: string | null
  maxTakes: number
  cropStages?: CharacterCropStage[]
  date?: string
  alreadyPlayed?: boolean
  priorResult?: PriorPlayResult | null
  endless?: boolean
}

export type AdminCharacter = {
  id: string
  name: string
  namePt: string
  filmTitle: string | null
  movieId: string | null
  imageUrl: string
  attribution: string | null
  cropStages: CharacterCropStage[]
  hasPhoto: boolean
}

export function fetchCharacterDaily(date?: string) {
  const q = date ? `?date=${encodeURIComponent(date)}` : ''
  return fetch(`/api/character/daily${q}`, {
    headers: { ...authHeaders() },
  }).then((r) => parseJson<CharacterPayload>(r))
}

export function fetchCharacterNext(excludeIds: string[] = []) {
  const q =
    excludeIds.length > 0
      ? `?exclude=${encodeURIComponent(excludeIds.join(','))}`
      : ''
  return fetch(`/api/character/next${q}`, {
    headers: { ...authHeaders() },
  }).then((r) => parseJson<CharacterPayload>(r))
}

export function fetchCharacterAutocomplete(q: string) {
  if (!q.trim()) {
    return Promise.resolve({ suggestions: [] as AutocompleteItem[] })
  }
  return fetch(
    `/api/character/autocomplete?q=${encodeURIComponent(q)}`,
  ).then((r) => parseJson<{ suggestions: AutocompleteItem[] }>(r))
}

export function postCharacterGuess(body: {
  puzzleId: string
  attempt: number
  guess: string
  endless?: boolean
}) {
  return fetch('/api/character/guess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then((r) =>
    parseJson<{
      correct: boolean
      points: number
      progress?: ProgressMap
      unlockedAchievements?: Achievement[]
      name?: string
      namePt?: string
      filmTitle?: string
      imageUrl?: string
    }>(r),
  )
}

export function fetchAdminCharacters(q = '') {
  const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''
  return fetch(`/api/admin/characters${qs}`, {
    headers: { ...authHeaders() },
  }).then((r) => parseJson<{ characters: AdminCharacter[] }>(r))
}

export function fetchAdminCharacter(id: string) {
  return fetch(`/api/admin/characters/${encodeURIComponent(id)}`, {
    headers: { ...authHeaders() },
  }).then((r) => parseJson<{ character: AdminCharacter }>(r))
}

export function createAdminCharacter(body: {
  name: string
  namePt?: string
  filmTitle?: string | null
  movieId?: string | null
  imageDataUrl: string
  cropStages?: CharacterCropStage[] | Record<string, CharacterCropStage>
}) {
  return fetch('/api/admin/characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then((r) => parseJson<{ character: AdminCharacter }>(r))
}

export function updateAdminCharacter(
  id: string,
  body: {
    name?: string
    namePt?: string
    filmTitle?: string | null
    movieId?: string | null
    imageDataUrl?: string
    cropStages?: CharacterCropStage[] | Record<string, CharacterCropStage>
  },
) {
  return fetch(`/api/admin/characters/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then((r) => parseJson<{ character: AdminCharacter }>(r))
}

export type AdminTmdbSearchHit = {
  tmdbId: number
  title: string
  titlePt: string
  year: number | null
  overview: string
  posterPath: string | null
  posterUrl: string | null
  popularity: number
  voteCount: number
}

export type AdminCastHint = {
  kind: string
  label: string
  name: string
  imageUrl?: string | null
  empty?: boolean
}

export type AdminCastJson = {
  region?: string
  director_image_url?: string | null
  screenwriter?: { name?: string; image_url?: string | null } | null
  protagonist?: { name?: string; image_url?: string | null } | null
  antagonist?:
    | { name?: string; image_url?: string | null; none?: boolean }
    | null
  secondary?: { name?: string; image_url?: string | null } | null
  _tmdb?: { id?: number; popularity?: number; vote_count?: number }
}

export type AdminTmdbMoviePreview = {
  tmdbId: number
  title: string
  titlePt: string
  year: number | null
  director: string | null
  posterPath: string | null
  posterUrl: string | null
  overview: string
  castJson: AdminCastJson
  hints: AdminCastHint[]
}

export function fetchAdminTmdbSearch(q: string, year?: number | null) {
  if (!q.trim()) {
    return Promise.resolve({ results: [] as AdminTmdbSearchHit[] })
  }
  const params = new URLSearchParams({ q: q.trim() })
  if (year != null && Number.isFinite(year)) params.set('year', String(year))
  return fetch(`/api/admin/tmdb/search?${params}`, {
    headers: { ...authHeaders() },
  }).then((r) => parseJson<{ results: AdminTmdbSearchHit[] }>(r))
}

export function fetchAdminTmdbMovie(tmdbId: number) {
  return fetch(`/api/admin/tmdb/movie/${encodeURIComponent(String(tmdbId))}`, {
    headers: { ...authHeaders() },
  }).then((r) =>
    parseJson<{ movie: AdminTmdbMoviePreview; existingId: string | null }>(r),
  )
}

export function saveAdminMovieFromTmdb(body: {
  tmdbId: number
  title?: string
  titlePt?: string
  director?: string | null
  castJson?: AdminCastJson
}) {
  return fetch('/api/admin/movies/from-tmdb', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then((r) =>
    parseJson<{
      movie: AdminTmdbMoviePreview & {
        id: string
        updated: boolean
      }
    }>(r),
  )
}

export type AdminClipMovie = {
  id: string
  title: string
  titlePt: string
  year: number | null
  posterUrl: string | null
  clipUrl: string | null
  hasClip?: boolean
  overwritten?: boolean
}

export function fetchAdminClips(q = '') {
  const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''
  return fetch(`/api/admin/clips${qs}`, {
    headers: { ...authHeaders() },
  }).then((r) => parseJson<{ clips: AdminClipMovie[] }>(r))
}

export function fetchAdminMovie(id: string) {
  return fetch(`/api/admin/movies/${encodeURIComponent(id)}`, {
    headers: { ...authHeaders() },
  }).then((r) => parseJson<{ movie: AdminClipMovie }>(r))
}

export async function uploadAdminMovieClip(
  movieId: string,
  file: Blob,
  { overwrite = false }: { overwrite?: boolean } = {},
) {
  const qs = overwrite ? '?overwrite=1' : ''
  const res = await fetch(
    `/api/admin/movies/${encodeURIComponent(movieId)}/clip${qs}`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': 'video/mp4',
      },
      body: file,
    },
  )
  return parseJson<{ movie: AdminClipMovie }>(res)
}

export function postBugReport(body: {
  title: string
  description: string
  email?: string
}) {
  return fetch('/api/feedback/bug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then((r) =>
    parseJson<{ ok: boolean; message: string; mailto?: string }>(r),
  )
}

export function postGiveUp(puzzleId: string) {
  return fetch('/api/give-up', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ puzzleId }),
  }).then((r) => parseJson<GiveUpResult>(r))
}

export type RegisterResult = AuthResponse & {
  ok?: boolean
  needsVerification?: boolean
  message?: string
  emailSent?: boolean
}

export function checkUsername(username: string) {
  return fetch(
    `/api/auth/check-username?u=${encodeURIComponent(username)}`,
  ).then((r) =>
    parseJson<{ available: boolean; reason?: string }>(r),
  )
}

export function registerAccount(body: {
  username: string
  email: string
  password: string
  passwordConfirm: string
}) {
  return fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => parseJson<RegisterResult>(r))
}

export function loginAccount(body: { login: string; password: string }) {
  return fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => parseJson<AuthResponse>(r))
}

export function forgotPassword(email: string) {
  return fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  }).then((r) => parseJson<{ ok: boolean; message: string }>(r))
}

export function resetPassword(body: { token: string; password: string }) {
  return fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => parseJson<{ ok: boolean; message: string }>(r))
}

export function verifyEmail(token: string) {
  return fetch('/api/auth/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  }).then((r) => parseJson<AuthResponse & { message?: string }>(r))
}

export function resendVerification(email: string) {
  return fetch('/api/auth/resend-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  }).then((r) => parseJson<RegisterResult>(r))
}

export function fetchMe() {
  return fetch('/api/me', { headers: { ...authHeaders() } }).then((r) =>
    parseJson<{
      user: AuthUser
      progress: ProgressMap
      dailyPlayedToday: boolean
      castPlayedToday?: boolean
      characterPlayedToday?: boolean
      keywordsPlayedToday?: boolean
      whoamiPlayedToday?: boolean
    }>(r),
  )
}

export function updateProfile(body: {
  username?: string
  displayName?: string
  bio?: string
  avatarUrl?: string | null
}) {
  return fetch('/api/me/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then((r) => parseJson<{ user: AuthUser }>(r))
}

export function fetchPublicProfile(username: string) {
  return fetch(`/api/users/${encodeURIComponent(username)}`, {
    headers: { ...authHeaders() },
  }).then((r) => parseJson<{ profile: PublicProfile }>(r))
}

export function fetchOscars() {
  return fetch('/api/oscars', {
    headers: { ...authHeaders() },
  }).then((r) => parseJson<OscarsResponse>(r))
}

export function searchPublicUsers(q = '') {
  const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''
  return fetch(`/api/users${qs}`, {
    headers: { ...authHeaders() },
  }).then((r) => parseJson<{ users: PublicUserCard[] }>(r))
}

export function fetchRank(mode: GameMode) {
  return fetch(`/api/rank?mode=${mode}`, {
    headers: { ...authHeaders() },
  }).then((r) => parseJson<{ mode: GameMode; entries: RankEntry[] }>(r))
}

export function finishRound(body: {
  mode: GameMode
  puzzleId: string
  outcome: 'win' | 'lose'
  take: number
  /** Poster/Maratona: não bloqueia nem grava daily 1x */
  endless?: boolean
}) {
  return fetch('/api/round/finish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then((r) => parseJson<RoundFinishResult>(r))
}

export type DuelState = {
  code: string
  status: 'waiting' | 'playing' | 'finished'
  youAreHost: boolean
  yourTurn: boolean
  host: { id: string; username: string; score: number }
  guest: { id: string; username: string; score: number } | null
  filmIndex: number
  filmsTotal: number
  take: number
  takeDurations: number[]
  phase: string
  lastEvent: string | null
  lastReveal: {
    title: string
    titlePt?: string
    year?: number
    posterUrl?: string
    points: number
    take: number
  } | null
  winnerUserId: string | null
  media: { type: 'image' | 'video'; url: string; posterUrl?: string } | null
  attribution: string | null
}

export function createDuel() {
  return fetch('/api/duel/create', {
    method: 'POST',
    headers: { ...authHeaders() },
  }).then((r) => parseJson<DuelState>(r))
}

export function joinDuel(code: string) {
  return fetch(`/api/duel/${encodeURIComponent(code)}/join`, {
    method: 'POST',
    headers: { ...authHeaders() },
  }).then((r) => parseJson<DuelState>(r))
}

export function fetchDuel(code: string) {
  return fetch(`/api/duel/${encodeURIComponent(code)}`, {
    headers: { ...authHeaders() },
  }).then((r) => parseJson<DuelState>(r))
}

export function duelAct(code: string, guess: string) {
  return fetch(`/api/duel/${encodeURIComponent(code)}/act`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ guess }),
  }).then((r) => parseJson<DuelState>(r))
}
