/**
 * Marca movies.whoami_pool a partir de WHOAMI_POOL_V1.
 * Coluna sobrevive a updates de cast_json do catálogo.
 */
import { query } from './db.js'
import { WHOAMI_POOL_V1 } from './whoamiPoolCatalog.js'

function stripDiacritics(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function norm(s) {
  return stripDiacritics(s)
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function movieHaystack(m) {
  const parts = [m.title, m.title_pt]
  if (Array.isArray(m.aliases)) parts.push(...m.aliases)
  else if (typeof m.aliases === 'string') parts.push(m.aliases)
  return norm(parts.filter(Boolean).join(' | '))
}

function scoreMatch(hay, needle, year, yearHint) {
  const n = norm(needle)
  if (!n || !hay) return 0
  let score = 0
  if (hay === n) score = 100
  else if (
    hay.startsWith(n + ' ') ||
    hay.includes(' | ' + n + ' | ') ||
    hay.endsWith(' | ' + n) ||
    hay.startsWith(n + ' | ')
  ) {
    score = 90
  } else if (hay.includes(n)) score = 70
  else return 0

  if (/\b2\b|\bii\b|\biii\b|\b3\b/.test(hay) && yearHint != null) {
    if (Number(year) !== Number(yearHint)) score -= 35
  }

  if (yearHint != null && year != null) {
    const dy = Math.abs(Number(year) - Number(yearHint))
    if (dy === 0) score += 30
    else if (dy <= 1) score += 8
    else score -= 50
  }

  if (n.length <= 4) {
    if (yearHint == null || Number(year) !== Number(yearHint)) score -= 60
  }
  return score
}

function bestMatch(entry, movies) {
  let best = null
  let bestScore = 0
  for (const m of movies) {
    const hay = m._hay
    for (const needle of entry.needles) {
      const sc = scoreMatch(hay, needle, m.year, entry.yearHint)
      if (sc > bestScore) {
        bestScore = sc
        best = m
      }
    }
  }
  if (bestScore < 75) return null
  if (entry.yearHint != null && best?.year != null) {
    const dy = Math.abs(Number(best.year) - Number(entry.yearHint))
    if (dy > 2 && bestScore < 110) return null
  }
  return { movie: best, score: bestScore }
}

export async function seedWhoamiPool() {
  const { rows: movies } = await query(
    `SELECT id::text AS id, title, title_pt, year, aliases
     FROM movies
     WHERE year IS NOT NULL`,
  )
  for (const m of movies) m._hay = movieHaystack(m)

  const matchedIds = new Set()
  const matched = []
  const missing = []

  for (const entry of WHOAMI_POOL_V1) {
    const hit = bestMatch(entry, movies)
    if (!hit) {
      missing.push({
        label: entry.label,
        bucket: entry.bucket,
        yearHint: entry.yearHint,
      })
      continue
    }
    const dup = matchedIds.has(hit.movie.id)
    matchedIds.add(hit.movie.id)
    matched.push({
      label: entry.label,
      id: hit.movie.id,
      title: hit.movie.title_pt || hit.movie.title,
      year: hit.movie.year,
      score: hit.score,
      dup,
    })
  }

  await query(`UPDATE movies SET whoami_pool = false WHERE whoami_pool = true`)

  const ids = [...matchedIds]
  if (ids.length) {
    await query(
      `UPDATE movies SET whoami_pool = true WHERE id::text = ANY($1::text[])`,
      [ids],
    )
  }

  const { rows: countRows } = await query(
    `SELECT count(*)::int AS n FROM movies WHERE whoami_pool = true`,
  )

  return {
    catalogEntries: WHOAMI_POOL_V1.length,
    uniqueMatched: matchedIds.size,
    flaggedInDb: countRows[0]?.n ?? 0,
    missingCount: missing.length,
    missing,
    matched,
  }
}
