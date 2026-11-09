import { Gi3dGlasses, GiClapperboard, GiPopcorn } from 'react-icons/gi'
import type { Achievement } from '../api'

export type CinemaIconKey =
  | 'popcorn'
  | 'clapper'
  | 'glasses'
  | 'oscar_hard'
  | 'oscar_legendary'
  | 'fries'

export type AchievementDifficulty =
  | 'easy'
  | 'medium'
  | 'hard'
  | 'legendary'

type CinemaIconProps = {
  name: CinemaIconKey
  className?: string
}

/** Ícones: react-icons (fácil/médio) + arts custom (difícil/lendário/tríplice). */
export function CinemaIcon({ name, className = 'h-6 w-6' }: CinemaIconProps) {
  if (name === 'popcorn') {
    return <GiPopcorn className={className} aria-hidden />
  }
  if (name === 'clapper') {
    return <GiClapperboard className={className} aria-hidden />
  }
  if (name === 'glasses') {
    return <Gi3dGlasses className={className} aria-hidden />
  }

  const src =
    name === 'fries'
      ? '/icons/fries-triple.png'
      : name === 'oscar_legendary'
        ? '/icons/oscar-legendary.png'
        : '/icons/oscar-hard.png'

  return (
    <img
      src={src}
      alt=""
      aria-hidden
      className={`object-contain ${className}`}
      draggable={false}
    />
  )
}

function parseThreshold(id: string): number | null {
  const m = id.match(/_(\d+)$/)
  return m ? Number(m[1]) : null
}

/** Apura dificuldade pela conquista. */
export function difficultyForAchievement(
  a: Pick<Achievement, 'id' | 'tier'>,
): AchievementDifficulty {
  const id = a.id || ''
  if (id === 'hall_triple_10k') return 'legendary'
  if (a.tier === 'super') return 'legendary'
  if (a.tier === 'special' || id.startsWith('hall_')) return 'hard'

  const n = parseThreshold(id)
  if (id.includes('_streak_')) {
    if (n != null && n >= 10) return 'medium'
    return 'easy'
  }
  if (id.startsWith('e_') && id.includes('_win_')) {
    if (n != null && n >= 30) return 'medium'
    return 'easy'
  }
  if (id.startsWith('d_') && id.includes('_win_')) {
    if (n != null && n >= 10) return 'hard'
    return 'easy'
  }
  return 'easy'
}

const ICON_KEYS = new Set<CinemaIconKey>([
  'popcorn',
  'clapper',
  'glasses',
  'oscar_hard',
  'oscar_legendary',
  'fries',
])

/** Escolhe ícone: fácil pipoca/claquete, médio óculos, difícil/lendário oscar, tríplice batata. */
export function cinemaIconForAchievement(
  a: Pick<Achievement, 'id' | 'category' | 'tier' | 'icon'>,
): CinemaIconKey {
  const id = a.id || ''
  if (id === 'hall_triple_10k') return 'fries'
  if (a.icon && ICON_KEYS.has(a.icon as CinemaIconKey)) {
    return a.icon as CinemaIconKey
  }

  const diff = difficultyForAchievement(a)
  if (diff === 'legendary') return 'oscar_legendary'
  if (diff === 'hard') return 'oscar_hard'
  if (diff === 'medium') return 'glasses'

  // Fácil: pipoca nos "1", claquete nos "5" (e afins)
  if (id === 'first_win') return 'popcorn'
  const n = parseThreshold(id)
  if (n === 1) return 'popcorn'
  if (n === 5) return 'clapper'
  if (id.includes('_win_') && n === 10 && id.startsWith('e_')) return 'clapper'
  return n != null && n % 2 === 0 ? 'clapper' : 'popcorn'
}
