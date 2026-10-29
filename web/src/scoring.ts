/** Base por take (1..6) */
export const BASE_POINTS = [100, 50, 25, 15, 10, 5] as const

/**
 * Streak = quantos acertos de 1ª seguidos já feitos.
 * Multiplicador aplicado no próximo acerto de 1ª:
 * 0→1x, 1→1.25x, 2→1.5x, 3→1.75x, 4+→2x
 */
export function multiplierForStreak(firstTryStreak: number): number {
  if (firstTryStreak <= 0) return 1
  if (firstTryStreak === 1) return 1.25
  if (firstTryStreak === 2) return 1.5
  if (firstTryStreak === 3) return 1.75
  return 2
}

export function applyMultiplier(base: number, mult: number): number {
  return Math.round(base * mult)
}

/**
 * Resultado de um round:
 * - take 1 (primeira): usa mult do streak atual, depois streak++
 * - take 2–6: mantém streak, aplica o mesmo mult nos pontos base daquele take
 * - fail: streak = 0
 */
export function scoreRound(opts: {
  won: boolean
  take: number // 1..6
  firstTryStreak: number
}): {
  points: number
  multiplier: number
  nextStreak: number
} {
  const { won, take, firstTryStreak } = opts
  if (!won) {
    return { points: 0, multiplier: 1, nextStreak: 0 }
  }

  const base = BASE_POINTS[take - 1] ?? 5
  const mult = multiplierForStreak(firstTryStreak)
  const points = applyMultiplier(base, mult)

  if (take === 1) {
    return {
      points,
      multiplier: mult,
      nextStreak: firstTryStreak + 1,
    }
  }

  // Acertou, mas não de primeira: não zera nem sobe o streak
  return {
    points,
    multiplier: mult,
    nextStreak: firstTryStreak,
  }
}
