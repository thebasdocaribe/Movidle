import type { GameMode } from './api'

export type ModeProgress = {
  totalScore: number
  firstTryStreak: number
  wins: number
  displayName: string
}

const KEY = 'cineblitz.progress.v1'

type Store = {
  daily: ModeProgress
  classic: ModeProgress
}

function defaultMode(): ModeProgress {
  return {
    totalScore: 0,
    firstTryStreak: 0,
    wins: 0,
    displayName: 'Você',
  }
}

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      return { daily: defaultMode(), classic: defaultMode() }
    }
    const parsed = JSON.parse(raw) as Store
    return {
      daily: { ...defaultMode(), ...parsed.daily },
      classic: { ...defaultMode(), ...parsed.classic },
    }
  } catch {
    return { daily: defaultMode(), classic: defaultMode() }
  }
}

function write(store: Store) {
  localStorage.setItem(KEY, JSON.stringify(store))
}

export function getModeProgress(mode: GameMode): ModeProgress {
  const store = read()
  return mode === 'daily' ? store.daily : store.classic
}

export function saveModeProgress(mode: GameMode, next: ModeProgress) {
  const store = read()
  if (mode === 'daily') store.daily = next
  else store.classic = next
  write(store)
}

/** Rank mock + você, pra layout até ter conta/servidor */
export function buildLocalRank(mode: GameMode): {
  name: string
  score: number
  you?: boolean
}[] {
  const you = getModeProgress(mode)
  const bots =
    mode === 'daily'
      ? [
          { name: 'CineFera', score: 1840 },
          { name: 'FrameHunter', score: 1520 },
          { name: 'NoirKid', score: 1210 },
          { name: 'TakeSix', score: 980 },
          { name: 'Claquete', score: 760 },
        ]
      : [
          { name: 'InfinityLoop', score: 9200 },
          { name: 'BlitzMachine', score: 7450 },
          { name: 'ReelRunner', score: 6100 },
          { name: 'SkipMaster', score: 4300 },
          { name: 'ZoomOut', score: 2900 },
        ]

  const rows = [
    ...bots,
    { name: you.displayName, score: you.totalScore, you: true as const },
  ]
  return rows.sort((a, b) => b.score - a.score)
}
