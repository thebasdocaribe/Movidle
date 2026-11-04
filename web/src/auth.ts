import type { GameMode } from './api'

const TOKEN_KEY = 'cineblitz.token'

export type AuthUser = {
  id: string
  username: string
  displayName: string
  email?: string
  emailVerified?: boolean
  avatarUrl?: string | null
  bio?: string
}

export type ModeProgress = {
  totalScore: number
  firstTryStreak: number
  wins: number
}

export type ProgressMap = {
  daily: ModeProgress
  classic: ModeProgress
  cast: ModeProgress
  character: ModeProgress
  whoami: ModeProgress
  keywords: ModeProgress
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (!token) localStorage.removeItem(TOKEN_KEY)
  else localStorage.setItem(TOKEN_KEY, token)
}

export function authHeaders(): HeadersInit {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function emptyProgress(): ProgressMap {
  return {
    daily: { totalScore: 0, firstTryStreak: 0, wins: 0 },
    classic: { totalScore: 0, firstTryStreak: 0, wins: 0 },
    cast: { totalScore: 0, firstTryStreak: 0, wins: 0 },
    character: { totalScore: 0, firstTryStreak: 0, wins: 0 },
    whoami: { totalScore: 0, firstTryStreak: 0, wins: 0 },
    keywords: { totalScore: 0, firstTryStreak: 0, wins: 0 },
  }
}

export function modeProgress(
  progress: ProgressMap | null,
  mode: GameMode | 'character' | 'whoami' | 'keywords',
): ModeProgress {
  const p = progress || emptyProgress()
  if (mode === 'cast') return p.cast
  if (mode === 'classic') return p.classic
  if (mode === 'character') return p.character
  if (mode === 'whoami') return p.whoami
  if (mode === 'keywords') return p.keywords
  return p.daily
}
