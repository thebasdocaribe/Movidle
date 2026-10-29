export const BASE_POINTS = [100, 50, 25, 15, 10, 5]
/** Modo elenco: 7 dicas */
export const CAST_POINTS = [100, 50, 25, 15, 10, 5, 5]

export function multiplierForStreak(firstTryStreak) {
  if (firstTryStreak <= 0) return 1
  if (firstTryStreak === 1) return 1.25
  if (firstTryStreak === 2) return 1.5
  if (firstTryStreak === 3) return 1.75
  return 2
}

export function scoreRound({ won, take, firstTryStreak, pointsTable }) {
  if (!won) {
    return { points: 0, multiplier: 1, nextStreak: 0 }
  }

  const table = pointsTable || BASE_POINTS
  const base = table[take - 1] ?? table[table.length - 1] ?? 5
  const multiplier = multiplierForStreak(firstTryStreak)
  const points = Math.round(base * multiplier)

  if (take === 1) {
    return {
      points,
      multiplier,
      nextStreak: firstTryStreak + 1,
    }
  }

  return {
    points,
    multiplier,
    nextStreak: firstTryStreak,
  }
}
