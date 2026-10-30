import {
  authHeaders,
  type AuthUser,
  type ProgressMap,
} from './auth'

export type GameMode = 'daily' | 'classic' | 'cast' | 'character'

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

export type Achievement = {
  id: string
  title: string
  desc: string
  locked: boolean
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

export type CharacterPayload = {
  puzzleId: string
  mode: 'character'
  imageUrl: string
  attribution: string | null
  maxTakes: number
  date?: string
  alreadyPlayed?: boolean
  priorResult?: PriorPlayResult | null
  endless?: boolean
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
      name?: string
      namePt?: string
      filmTitle?: string
      imageUrl?: string
    }>(r),
  )
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
  /** Casting/Maratona: não bloqueia nem grava daily 1x */
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
