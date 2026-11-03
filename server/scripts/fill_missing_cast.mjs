/**
 * Preenche cast_json/director nos filmes que já têm pôster mas elenco vazio.
 * Não troca poster_path.
 */
import dotenv from 'dotenv'
dotenv.config()
import pg from 'pg'

const key = process.env.TMDB_API_KEY?.trim()
if (!key) throw new Error('TMDB_API_KEY ausente')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const TMDB = 'https://api.themoviedb.org/3'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function tmdb(pathname, params = {}) {
  const url = new URL(`${TMDB}${pathname}`)
  url.searchParams.set('api_key', key)
  url.searchParams.set('language', 'pt-BR')
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') url.searchParams.set(k, String(v))
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${pathname} ${res.status}`)
  return res.json()
}

function yearOf(m) {
  const y = Number((m.release_date || '').slice(0, 4))
  return Number.isFinite(y) ? y : null
}

function personSlot(p) {
  if (!p?.name) return null
  return { name: p.name, image_url: null }
}

const REGION = {
  US: 'EUA',
  GB: 'Reino Unido',
  DE: 'Alemanha',
  FR: 'França',
  JP: 'Japão',
  RU: 'Rússia',
  SU: 'URSS',
  IT: 'Itália',
  SE: 'Suécia',
  DK: 'Dinamarca',
  BR: 'Brasil',
}

function buildCast(details, credits) {
  const crew = credits.crew || []
  const cast = credits.cast || []
  const writer = crew.find(
    (c) => c.job === 'Screenplay' || c.job === 'Writer' || c.job === 'Story',
  )
  const iso = details.production_countries?.[0]?.iso_3166_1
  return {
    region: REGION[iso] || iso || '—',
    screenwriter: personSlot(writer),
    protagonist: personSlot(cast[0]),
    antagonist: cast[2] ? personSlot(cast[2]) : { none: true },
    secondary: personSlot(cast[1]),
  }
}

async function resolveHit(row) {
  const queries = [...new Set([row.title, row.title_pt, ...(row.aliases || [])])]
    .filter(Boolean)

  let best = null
  let bestScore = -Infinity
  for (const q of queries) {
    const data = await tmdb('/search/movie', {
      query: q,
      include_adult: 'false',
    })
    await sleep(200)
    for (const m of data.results || []) {
      if (!m.id) continue
      let score = (m.popularity || 0) / 10
      const y = yearOf(m)
      if (row.year && y != null) {
        const diff = Math.abs(y - row.year)
        if (diff === 0) score += 1000
        else if (diff === 1) score += 500
        else if (diff <= 2) score += 200
        else score -= diff * 50
      }
      // Prefer exact-ish title match
      const ql = String(q).toLowerCase()
      const tl = String(m.title || '').toLowerCase()
      const ol = String(m.original_title || '').toLowerCase()
      if (tl === ql || ol === ql) score += 300
      if (score > bestScore) {
        bestScore = score
        best = m
      }
    }
  }
  return best
}

const { rows } = await pool.query(`
  SELECT id, title, title_pt, year, aliases, poster_path
  FROM movies
  WHERE cast_json IS NULL
     OR cast_json = '[]'::jsonb
     OR cast_json = '{}'::jsonb
  ORDER BY year NULLS LAST, title
`)

console.log(`Preenchendo elenco de ${rows.length} filmes…\n`)
const ok = []
const fail = []

for (const row of rows) {
  const label = `${row.year || '????'} · ${row.title_pt || row.title}`
  process.stdout.write(`→ ${label} … `)
  try {
    const hit = await resolveHit(row)
    await sleep(200)
    if (!hit?.id) {
      console.log('NÃO ACHEI')
      fail.push({ ...row, reason: 'search_empty' })
      continue
    }

    const full = await tmdb(`/movie/${hit.id}`)
    await sleep(200)
    const credits = await tmdb(`/movie/${hit.id}/credits`)
    await sleep(200)

    const castJson = buildCast(full, credits)
    const director =
      credits.crew?.find((c) => c.job === 'Director')?.name || null

    // exige pelo menos protagonista ou diretor
    if (!director && !castJson.protagonist) {
      console.log('SEM CRÉDITOS ÚTEIS', full.title)
      fail.push({ ...row, reason: 'no_credits', tmdb: full.title })
      continue
    }

    await pool.query(
      `UPDATE movies
       SET director = COALESCE($2, director),
           cast_json = $3::jsonb,
           attribution = COALESCE(attribution, $4),
           source_url = COALESCE(source_url, $5)
       WHERE id = $1`,
      [
        row.id,
        director,
        JSON.stringify(castJson),
        `TMDB #${full.id}`,
        `https://www.themoviedb.org/movie/${full.id}`,
      ],
    )

    const y = yearOf(full)
    console.log(
      `${full.title || full.original_title} (${y}) · dir ${director || '—'}`,
    )
    ok.push({
      id: row.id,
      from: label,
      to: full.title,
      year: y,
      tmdbId: full.id,
    })
  } catch (err) {
    console.log('ERRO', err.message)
    fail.push({ ...row, reason: err.message })
  }
}

const { rows: counts } = await pool.query(`
  SELECT
    count(*)::int AS total,
    count(*) FILTER (
      WHERE cast_json IS NOT NULL
        AND cast_json != '[]'::jsonb
        AND cast_json != '{}'::jsonb
    )::int AS ready
  FROM movies
`)

console.log('\n=== RESUMO ===')
console.log(`OK: ${ok.length}  FAIL: ${fail.length}`)
console.log(`Banco: ${counts[0].ready}/${counts[0].total} prontos no Poster`)
if (fail.length) {
  console.log('\nAinda faltam:')
  for (const f of fail) {
    console.log(
      `- ${f.year || '????'} | ${f.title_pt || f.title} | ${f.reason}`,
    )
  }
}

await pool.end()
