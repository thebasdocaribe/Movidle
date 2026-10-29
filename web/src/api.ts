import { authHeaders, type AuthUser, type ProgressMap } from './auth'

export type GameMode = 'daily' | 'classic'

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
}

export type RankEntry = {
  rank: number
  name: string
  username: string
  score: number
  streak: number
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
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`)
  }
  return data as T
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

export function postGiveUp(puzzleId: string) {
  return fetch('/api/give-up', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ puzzleId }),
  }).then((r) => parseJson<GiveUpResult>(r))
}

export type RegisterResult = {
  ok: boolean
  needsVerification: boolean
  message: string
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
    }>(r),
  )
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
