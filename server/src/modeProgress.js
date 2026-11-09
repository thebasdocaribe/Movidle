import { query } from './db.js'

export const DAILY_PLAY_TABLE = {
  daily: 'user_daily_plays',
  cast: 'user_cast_daily_plays',
  character: 'user_character_daily_plays',
  whoami: 'user_whoami_daily_plays',
  keywords: 'user_keywords_daily_plays',
}

export async function countDailyWins(userId, mode) {
  const table = DAILY_PLAY_TABLE[mode]
  if (!table) return 0
  const { rows } = await query(
    `SELECT COUNT(*)::int AS n FROM ${table}
     WHERE user_id = $1 AND won = true`,
    [userId],
  )
  return rows[0]?.n ?? 0
}

export async function loadDailyWinsByMode(userId) {
  const out = {}
  await Promise.all(
    Object.keys(DAILY_PLAY_TABLE).map(async (mode) => {
      out[mode] = await countDailyWins(userId, mode)
    }),
  )
  return out
}

async function yesterdayWon(userId, mode, todayStr) {
  const table = DAILY_PLAY_TABLE[mode]
  if (!table) return false
  const { rows } = await query(
    `SELECT won FROM ${table}
     WHERE user_id = $1 AND puzzle_date = ($2::date - interval '1 day')::date`,
    [userId, todayStr],
  )
  return Boolean(rows[0]?.won)
}

/**
 * Atualiza user_progress após uma rodada (daily ou endless).
 * Retorna o row normalizado (mesmo shape do getProgress[mode]).
 */
export async function recordModeOutcome({
  userId,
  mode,
  won,
  points,
  firstTryStreakNext,
  endless = false,
  /** YYYY-MM-DD do daily (BRT); ignorado no endless */
  playDate = null,
}) {
  const { rows: progRows } = await query(
    `SELECT total_score, first_try_streak, wins,
            win_streak, best_win_streak,
            endless_wins, endless_streak, endless_best_streak
     FROM user_progress WHERE user_id = $1 AND mode = $2`,
    [userId, mode],
  )
  const prev = progRows[0] || {}
  let totalScore = prev.total_score ?? 0
  let firstTryStreak = firstTryStreakNext
  let wins = prev.wins ?? 0
  let winStreak = prev.win_streak ?? 0
  let bestWinStreak = prev.best_win_streak ?? 0
  let endlessWins = prev.endless_wins ?? 0
  let endlessStreak = prev.endless_streak ?? 0
  let endlessBestStreak = prev.endless_best_streak ?? 0

  totalScore += Number(points) || 0

  if (endless) {
    if (won) {
      wins += 1
      endlessWins += 1
      endlessStreak += 1
      if (endlessStreak > endlessBestStreak) endlessBestStreak = endlessStreak
    } else {
      endlessStreak = 0
    }
  } else {
    if (won) {
      wins += 1
      let streak = 1
      if (playDate && (await yesterdayWon(userId, mode, playDate))) {
        streak = winStreak + 1
      }
      winStreak = streak
      if (winStreak > bestWinStreak) bestWinStreak = winStreak
    } else {
      winStreak = 0
    }
  }

  await query(
    `INSERT INTO user_progress (
       user_id, mode, total_score, first_try_streak, wins,
       win_streak, best_win_streak,
       endless_wins, endless_streak, endless_best_streak,
       updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
     ON CONFLICT (user_id, mode) DO UPDATE SET
       total_score = EXCLUDED.total_score,
       first_try_streak = EXCLUDED.first_try_streak,
       wins = EXCLUDED.wins,
       win_streak = EXCLUDED.win_streak,
       best_win_streak = EXCLUDED.best_win_streak,
       endless_wins = EXCLUDED.endless_wins,
       endless_streak = EXCLUDED.endless_streak,
       endless_best_streak = EXCLUDED.endless_best_streak,
       updated_at = now()`,
    [
      userId,
      mode,
      totalScore,
      firstTryStreak,
      wins,
      winStreak,
      bestWinStreak,
      endlessWins,
      endlessStreak,
      endlessBestStreak,
    ],
  )

  return {
    totalScore,
    firstTryStreak,
    wins,
    winStreak,
    bestWinStreak,
    endlessWins,
    endlessStreak,
    endlessBestStreak,
  }
}
