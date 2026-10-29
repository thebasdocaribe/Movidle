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
  cast: ModeProgress
}

function defaultMode(): ModeProgress {
  return {
    totalScore: 0,
    firstTryStreak: 0,
    wins: 0,
    displayName: 'Você',
  }
}

function emptyStore(): Store {
  return {
    daily: defaultMode(),
    classic: defaultMode(),
    cast: defaultMode(),
  }
}

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as Partial<Store>
    return {
      daily: { ...defaultMode(), ...parsed.daily },
      classic: { ...defaultMode(), ...parsed.classic },
      cast: { ...defaultMode(), ...parsed.cast },
    }
  } catch {
    return emptyStore()
  }
}

function write(store: Store) {
  localStorage.setItem(KEY, JSON.stringify(store))
}

export function getModeProgress(mode: GameMode): ModeProgress {
  const store = read()
  if (mode === 'cast') return store.cast
  if (mode === 'classic') return store.classic
  return store.daily
}

export function saveModeProgress(mode: GameMode, next: ModeProgress) {
  const store = read()
  if (mode === 'cast') store.cast = next
  else if (mode === 'classic') store.classic = next
  else store.daily = next
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
