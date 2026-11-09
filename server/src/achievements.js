/** Catálogo + avaliação de conquistas (Óscares). */

import { query } from './db.js'
import { DAILY_PLAY_TABLE } from './modeProgress.js'

export const MODE_LABEL = {
  daily: 'Clássico',
  cast: 'Poster',
  character: 'Personagem',
  whoami: 'Quem sou eu',
  keywords: 'Palavras',
  classic: 'Maratona',
}

export const DAILY_ACH_MODES = [
  'daily',
  'cast',
  'character',
  'whoami',
  'keywords',
]

export const ENDLESS_ACH_MODES = ['cast', 'classic', 'whoami']

const DAILY_WIN_THRESHOLDS = [
  {
    n: 1,
    tier: 'normal',
    title: (l) => `${l}: primeira vitória`,
    desc: (l) => `Acerte 1 daily de ${l}`,
  },
  {
    n: 5,
    tier: 'normal',
    title: (l) => `${l}: 5 vitórias`,
    desc: (l) => `Acerte 5 dailies de ${l} (não precisa ser seguido)`,
  },
  {
    n: 10,
    tier: 'special',
    title: (l) => `${l}: 10 vitórias`,
    desc: (l) => `Acerte 10 dailies de ${l}`,
  },
]

const DAILY_STREAK_THRESHOLDS = [
  {
    n: 5,
    tier: 'normal',
    title: (l) => `${l}: 5 seguidos`,
    desc: (l) => `Acerte 5 dailies seguidos de ${l}`,
  },
  {
    n: 10,
    tier: 'super',
    title: (l) => `${l}: 10 dias seguidos`,
    desc: (l) => `Acerte 10 dailies seguidos de ${l}`,
  },
]

const ENDLESS_WIN_THRESHOLDS = [
  {
    n: 1,
    tier: 'normal',
    title: (l) => `${l} ∞: primeiro acerto`,
    desc: (l) => `Acerte 1 no infinito de ${l}`,
  },
  {
    n: 10,
    tier: 'normal',
    title: (l) => `${l} ∞: 10 acertos`,
    desc: (l) => `Acerte 10 no infinito de ${l}`,
  },
  {
    n: 30,
    tier: 'normal',
    title: (l) => `${l} ∞: 30 acertos`,
    desc: (l) => `Acerte 30 no infinito de ${l}`,
  },
  {
    n: 40,
    tier: 'special',
    title: (l) => `${l} ∞: 40 acertos`,
    desc: (l) => `Acerte 40 no infinito de ${l}`,
  },
  {
    n: 50,
    tier: 'special',
    title: (l) => `${l} ∞: 50 acertos`,
    desc: (l) => `Acerte 50 no infinito de ${l}`,
  },
]

const ENDLESS_STREAK_THRESHOLDS = [
  {
    n: 5,
    tier: 'normal',
    title: (l) => `${l} ∞: 5 seguidos`,
    desc: (l) => `Acerte 5 seguidos no infinito de ${l}`,
  },
  {
    n: 10,
    tier: 'normal',
    title: (l) => `${l} ∞: 10 seguidos`,
    desc: (l) => `Acerte 10 seguidos no infinito de ${l}`,
  },
  {
    n: 30,
    tier: 'special',
    title: (l) => `${l} ∞: 30 seguidos`,
    desc: (l) => `Acerte 30 seguidos no infinito de ${l}`,
  },
  {
    n: 40,
    tier: 'special',
    title: (l) => `${l} ∞: 40 seguidos`,
    desc: (l) => `Acerte 40 seguidos no infinito de ${l}`,
  },
  {
    n: 50,
    tier: 'super',
    title: (l) => `${l} ∞: 50 seguidos`,
    desc: (l) => `Acerte 50 seguidos no infinito de ${l}`,
  },
]

export const CATEGORY_LABEL = {
  geral: 'Geral',
  daily: 'Diários',
  endless: 'Infinito',
  hall: 'Hall da Fama',
}

function emptyModeStats() {
  return {
    wins: 0,
    totalScore: 0,
    winStreak: 0,
    bestWinStreak: 0,
    endlessWins: 0,
    endlessStreak: 0,
    endlessBestStreak: 0,
    dailyWins: 0,
  }
}

/** Normaliza progress do getProgress + dailyWins opcionais. */
export function statsFromProgress(progress, dailyWinsByMode = {}) {
  const out = {}
  const modes = new Set([
    ...Object.keys(MODE_LABEL),
    ...Object.keys(progress || {}),
  ])
  for (const mode of modes) {
    const p = progress?.[mode] || emptyModeStats()
    out[mode] = {
      wins: p.wins ?? 0,
      totalScore: p.totalScore ?? 0,
      winStreak: p.winStreak ?? 0,
      bestWinStreak: p.bestWinStreak ?? 0,
      endlessWins: p.endlessWins ?? 0,
      endlessStreak: p.endlessStreak ?? 0,
      endlessBestStreak: p.endlessBestStreak ?? 0,
      dailyWins: dailyWinsByMode[mode] ?? p.dailyWins ?? 0,
    }
  }
  return out
}

function progressOf(current, max) {
  const m = Math.max(1, Number(max) || 1)
  const c = Math.max(0, Number(current) || 0)
  return { current: Math.min(c, m), max: m }
}

function ach(id, title, desc, locked, tier = 'normal', extra = {}) {
  return {
    id,
    title,
    desc,
    locked: Boolean(locked),
    tier,
    category: extra.category || 'geral',
    icon: extra.icon || 'popcorn',
    progress: extra.progress || null,
  }
}

export function buildAchievements({ progress, endless, dailyWinsByMode }) {
  const stats = statsFromProgress(progress, dailyWinsByMode)
  if (endless?.totalWins && (stats.cast?.endlessWins ?? 0) < endless.totalWins) {
    stats.cast = {
      ...stats.cast,
      endlessWins: Math.max(stats.cast.endlessWins, endless.totalWins),
    }
  }
  const list = []
  const anyWin = Object.values(stats).some(
    (s) => (s.wins || 0) > 0 || (s.endlessWins || 0) > 0 || (s.dailyWins || 0) > 0,
  )

  list.push(
    ach(
      'first_win',
      'Primeira luz',
      'Vença qualquer modo',
      !anyWin,
      'normal',
      {
        category: 'geral',
        icon: 'popcorn',
        progress: progressOf(anyWin ? 1 : 0, 1),
      },
    ),
  )

  for (const mode of DAILY_ACH_MODES) {
    const label = MODE_LABEL[mode]
    const s = stats[mode] || emptyModeStats()
    const dailyWins = Math.max(s.dailyWins, 0)
    const bestStreak = Math.max(s.bestWinStreak, s.winStreak, 0)

    for (const t of DAILY_WIN_THRESHOLDS) {
      list.push(
        ach(
          `d_${mode}_win_${t.n}`,
          t.title(label),
          t.desc(label),
          dailyWins < t.n,
          t.tier,
          {
            category: 'daily',
            icon:
              t.n <= 1 ? 'popcorn' : t.n <= 5 ? 'clapper' : 'oscar_hard',
            progress: progressOf(dailyWins, t.n),
          },
        ),
      )
    }
    for (const t of DAILY_STREAK_THRESHOLDS) {
      list.push(
        ach(
          `d_${mode}_streak_${t.n}`,
          t.title(label),
          t.desc(label),
          bestStreak < t.n,
          t.tier,
          {
            category: 'daily',
            icon: t.tier === 'super' ? 'oscar_legendary' : 'clapper',
            progress: progressOf(bestStreak, t.n),
          },
        ),
      )
    }
  }

  for (const mode of ENDLESS_ACH_MODES) {
    const label = MODE_LABEL[mode]
    const s = stats[mode] || emptyModeStats()
    const wins = s.endlessWins || 0
    const best = Math.max(s.endlessBestStreak, s.endlessStreak, 0)

    for (const t of ENDLESS_WIN_THRESHOLDS) {
      list.push(
        ach(
          `e_${mode}_win_${t.n}`,
          t.title(label),
          t.desc(label),
          wins < t.n,
          t.tier,
          {
            category: 'endless',
            icon:
              t.n <= 1
                ? 'popcorn'
                : t.n <= 10
                  ? 'clapper'
                  : t.n <= 30
                    ? 'glasses'
                    : 'oscar_hard',
            progress: progressOf(wins, t.n),
          },
        ),
      )
    }
    for (const t of ENDLESS_STREAK_THRESHOLDS) {
      list.push(
        ach(
          `e_${mode}_streak_${t.n}`,
          t.title(label),
          t.desc(label),
          best < t.n,
          t.tier,
          {
            category: 'endless',
            icon:
              t.tier === 'super'
                ? 'oscar_legendary'
                : t.n <= 5
                  ? 'clapper'
                  : t.n <= 10
                    ? 'glasses'
                    : 'oscar_hard',
            progress: progressOf(best, t.n),
          },
        ),
      )
    }
  }

  const dailyScore = stats.daily?.totalScore ?? 0
  const castScore = stats.cast?.totalScore ?? 0
  const classicScore = stats.classic?.totalScore ?? 0
  const hallsDone =
    (dailyScore >= 10000 ? 1 : 0) +
    (castScore >= 10000 ? 1 : 0) +
    (classicScore >= 10000 ? 1 : 0)

  list.push(
    ach(
      'hall_daily_10k',
      'Hall Clássico 10k',
      'Alcance 10.000 pts no Hall da Fama do Clássico',
      dailyScore < 10000,
      'special',
      {
        category: 'hall',
        icon: 'oscar_hard',
        progress: progressOf(dailyScore, 10000),
      },
    ),
    ach(
      'hall_cast_10k',
      'Hall Poster 10k',
      'Alcance 10.000 pts no Hall da Fama do Poster',
      castScore < 10000,
      'special',
      {
        category: 'hall',
        icon: 'oscar_hard',
        progress: progressOf(castScore, 10000),
      },
    ),
    ach(
      'hall_classic_10k',
      'Hall Maratona 10k',
      'Alcance 10.000 pts no Hall da Fama da Maratona',
      classicScore < 10000,
      'special',
      {
        category: 'hall',
        icon: 'oscar_hard',
        progress: progressOf(classicScore, 10000),
      },
    ),
    ach(
      'hall_triple_10k',
      'Tríplice coroa',
      'Alcance 10.000 pts no Clássico, Poster e Maratona',
      hallsDone < 3,
      'super',
      {
        category: 'hall',
        icon: 'fries',
        progress: progressOf(hallsDone, 3),
      },
    ),
  )

  return list
}

export function diffUnlockedAchievements(before, after) {
  return after.filter((a) => {
    if (a.locked) return false
    const prev = before.find((b) => b.id === a.id)
    return Boolean(prev?.locked)
  })
}

function pct(count, total) {
  if (!total || total <= 0) return 0
  return Math.round((Number(count) / total) * 1000) / 10
}

async function countDailyWinThresholds(table) {
  const { rows } = await query(
    `SELECT
       COUNT(*) FILTER (WHERE c >= 1)::int AS w1,
       COUNT(*) FILTER (WHERE c >= 5)::int AS w5,
       COUNT(*) FILTER (WHERE c >= 10)::int AS w10
     FROM (
       SELECT COUNT(*)::int AS c
       FROM ${table}
       WHERE won = true
       GROUP BY user_id
     ) t`,
  )
  return rows[0] || { w1: 0, w5: 0, w10: 0 }
}

let communityCache = { at: 0, rates: /** @type {Record<string, number>} */ ({}) }

/** % da comunidade que já desbloqueou cada conquista (cache ~5 min). */
export async function loadCommunityRates() {
  const now = Date.now()
  if (now - communityCache.at < 5 * 60 * 1000 && communityCache.rates) {
    return communityCache.rates
  }

  const rates = {}
  const { rows: userRows } = await query(`SELECT COUNT(*)::int AS n FROM users`)
  const totalUsers = userRows[0]?.n ?? 0
  if (totalUsers <= 0) {
    communityCache = { at: now, rates }
    return rates
  }

  const { rows: firstRows } = await query(
    `SELECT COUNT(DISTINCT user_id)::int AS n FROM (
       SELECT user_id FROM user_progress
         WHERE COALESCE(wins, 0) > 0 OR COALESCE(endless_wins, 0) > 0
       UNION
       SELECT user_id FROM user_daily_plays WHERE won = true
       UNION
       SELECT user_id FROM user_cast_daily_plays WHERE won = true
       UNION
       SELECT user_id FROM user_character_daily_plays WHERE won = true
       UNION
       SELECT user_id FROM user_whoami_daily_plays WHERE won = true
       UNION
       SELECT user_id FROM user_keywords_daily_plays WHERE won = true
     ) t`,
  )
  rates.first_win = pct(firstRows[0]?.n ?? 0, totalUsers)

  const { rows: progRows } = await query(
    `SELECT mode,
       COUNT(*) FILTER (WHERE GREATEST(COALESCE(best_win_streak,0), COALESCE(win_streak,0)) >= 5)::int AS ds5,
       COUNT(*) FILTER (WHERE GREATEST(COALESCE(best_win_streak,0), COALESCE(win_streak,0)) >= 10)::int AS ds10,
       COUNT(*) FILTER (WHERE COALESCE(endless_wins,0) >= 1)::int AS ew1,
       COUNT(*) FILTER (WHERE COALESCE(endless_wins,0) >= 10)::int AS ew10,
       COUNT(*) FILTER (WHERE COALESCE(endless_wins,0) >= 30)::int AS ew30,
       COUNT(*) FILTER (WHERE COALESCE(endless_wins,0) >= 40)::int AS ew40,
       COUNT(*) FILTER (WHERE COALESCE(endless_wins,0) >= 50)::int AS ew50,
       COUNT(*) FILTER (
         WHERE GREATEST(COALESCE(endless_best_streak,0), COALESCE(endless_streak,0)) >= 5
       )::int AS es5,
       COUNT(*) FILTER (
         WHERE GREATEST(COALESCE(endless_best_streak,0), COALESCE(endless_streak,0)) >= 10
       )::int AS es10,
       COUNT(*) FILTER (
         WHERE GREATEST(COALESCE(endless_best_streak,0), COALESCE(endless_streak,0)) >= 30
       )::int AS es30,
       COUNT(*) FILTER (
         WHERE GREATEST(COALESCE(endless_best_streak,0), COALESCE(endless_streak,0)) >= 40
       )::int AS es40,
       COUNT(*) FILTER (
         WHERE GREATEST(COALESCE(endless_best_streak,0), COALESCE(endless_streak,0)) >= 50
       )::int AS es50,
       COUNT(*) FILTER (WHERE COALESCE(total_score,0) >= 10000)::int AS hall
     FROM user_progress
     GROUP BY mode`,
  )

  const byMode = Object.fromEntries(progRows.map((r) => [r.mode, r]))

  for (const mode of DAILY_ACH_MODES) {
    const table = DAILY_PLAY_TABLE[mode]
    if (!table) continue
    const w = await countDailyWinThresholds(table)
    rates[`d_${mode}_win_1`] = pct(w.w1, totalUsers)
    rates[`d_${mode}_win_5`] = pct(w.w5, totalUsers)
    rates[`d_${mode}_win_10`] = pct(w.w10, totalUsers)
    const p = byMode[mode] || {}
    rates[`d_${mode}_streak_5`] = pct(p.ds5 ?? 0, totalUsers)
    rates[`d_${mode}_streak_10`] = pct(p.ds10 ?? 0, totalUsers)
  }

  for (const mode of ENDLESS_ACH_MODES) {
    const p = byMode[mode] || {}
    rates[`e_${mode}_win_1`] = pct(p.ew1 ?? 0, totalUsers)
    rates[`e_${mode}_win_10`] = pct(p.ew10 ?? 0, totalUsers)
    rates[`e_${mode}_win_30`] = pct(p.ew30 ?? 0, totalUsers)
    rates[`e_${mode}_win_40`] = pct(p.ew40 ?? 0, totalUsers)
    rates[`e_${mode}_win_50`] = pct(p.ew50 ?? 0, totalUsers)
    rates[`e_${mode}_streak_5`] = pct(p.es5 ?? 0, totalUsers)
    rates[`e_${mode}_streak_10`] = pct(p.es10 ?? 0, totalUsers)
    rates[`e_${mode}_streak_30`] = pct(p.es30 ?? 0, totalUsers)
    rates[`e_${mode}_streak_40`] = pct(p.es40 ?? 0, totalUsers)
    rates[`e_${mode}_streak_50`] = pct(p.es50 ?? 0, totalUsers)
  }

  // Compat: wins totais do Poster infinito legado (easy+mid+hard+elite)
  try {
    const { rows: castEnd } = await query(
      `SELECT
         COUNT(*) FILTER (WHERE tw >= 1)::int AS ew1,
         COUNT(*) FILTER (WHERE tw >= 10)::int AS ew10,
         COUNT(*) FILTER (WHERE tw >= 30)::int AS ew30,
         COUNT(*) FILTER (WHERE tw >= 40)::int AS ew40,
         COUNT(*) FILTER (WHERE tw >= 50)::int AS ew50
       FROM (
         SELECT COALESCE(easy_wins,0) + COALESCE(mid_wins,0)
              + COALESCE(hard_wins,0) + COALESCE(elite_wins,0) AS tw
         FROM user_cast_endless
       ) t`,
    )
    const c = castEnd[0] || {}
    const mergeMax = (id, n) => {
      rates[id] = Math.max(rates[id] || 0, pct(n ?? 0, totalUsers))
    }
    mergeMax('e_cast_win_1', c.ew1)
    mergeMax('e_cast_win_10', c.ew10)
    mergeMax('e_cast_win_30', c.ew30)
    mergeMax('e_cast_win_40', c.ew40)
    mergeMax('e_cast_win_50', c.ew50)
  } catch {
    /* tabela pode não existir em installs antigos */
  }

  rates.hall_daily_10k = pct(byMode.daily?.hall ?? 0, totalUsers)
  rates.hall_cast_10k = pct(byMode.cast?.hall ?? 0, totalUsers)
  rates.hall_classic_10k = pct(byMode.classic?.hall ?? 0, totalUsers)

  const { rows: tripleRows } = await query(
    `SELECT COUNT(*)::int AS n FROM (
       SELECT user_id FROM user_progress
       WHERE mode IN ('daily', 'cast', 'classic')
         AND COALESCE(total_score, 0) >= 10000
       GROUP BY user_id
       HAVING COUNT(*) = 3
     ) t`,
  )
  rates.hall_triple_10k = pct(tripleRows[0]?.n ?? 0, totalUsers)

  communityCache = { at: now, rates }
  return rates
}

export function withCommunityRates(achievements, rates) {
  return achievements.map((a) => ({
    ...a,
    communityPct: rates[a.id] ?? 0,
  }))
}
