/**
 * Preenche image_url / director_image_url no cast_json via TMDB credits
 * (profile_path já vem no /credits — sem search/person por nome).
 */
import dotenv from 'dotenv'
dotenv.config()
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const key = process.env.TMDB_API_KEY?.trim()
if (!key) throw new Error('TMDB_API_KEY ausente')

const IMG = 'https://image.tmdb.org/t/p/w185'
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function tmdb(pathname, params = {}) {
  const url = new URL(`https://api.themoviedb.org/3${pathname}`)
  url.searchParams.set('api_key', key)
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, String(v))
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${pathname} ${res.status}`)
  return res.json()
}

function photoUrl(person) {
  if (!person?.profile_path) return null
  return `${IMG}${person.profile_path}`
}

function withPhoto(slot, person) {
  if (!slot || slot.none) return slot
  if (!person) return slot
  return {
    ...slot,
    name: slot.name || person.name,
    image_url: photoUrl(person) || slot.image_url || null,
  }
}

function findByName(list, name) {
  if (!name || !list?.length) return null
  const n = name.toLowerCase().trim()
  return (
    list.find((p) => String(p.name || '').toLowerCase() === n) ||
    list.find((p) => String(p.name || '').toLowerCase().includes(n)) ||
    null
  )
}

function tmdbIdFromSource(url) {
  const m = String(url || '').match(/themoviedb\.org\/movie\/(\d+)/i)
  return m ? Number(m[1]) : null
}

const { rows } = await pool.query(`
  SELECT id, title, title_pt, year, director, source_url, cast_json
  FROM movies
  WHERE cast_json IS NOT NULL
    AND cast_json != '[]'::jsonb
    AND cast_json != '{}'::jsonb
  ORDER BY year NULLS LAST, title
`)

let ok = 0
let fail = 0

for (const row of rows) {
  const label = row.title_pt || row.title
  process.stdout.write(`→ ${label} … `)
  try {
    let tmdbId = tmdbIdFromSource(row.source_url)
    if (!tmdbId) {
      const q = row.title || row.title_pt
      const search = await tmdb('/search/movie', {
        query: q,
        year: row.year || undefined,
      })
      await sleep(180)
      const hit =
        search.results?.find(
          (m) =>
            row.year &&
            String(m.release_date || '').startsWith(String(row.year)),
        ) || search.results?.[0]
      tmdbId = hit?.id
    }
    if (!tmdbId) {
      console.log('sem TMDB id')
      fail += 1
      continue
    }

    const credits = await tmdb(`/movie/${tmdbId}/credits`)
    await sleep(180)

    const cast = credits.cast || []
    const crew = credits.crew || []
    const director = crew.find((c) => c.job === 'Director') || null
    const meta =
      row.cast_json && typeof row.cast_json === 'object' ? { ...row.cast_json } : {}

    meta.director_image_url =
      photoUrl(director) || meta.director_image_url || null
    meta.screenwriter = withPhoto(
      meta.screenwriter,
      findByName(crew, meta.screenwriter?.name) ||
        crew.find(
          (c) =>
            c.job === 'Screenplay' ||
            c.job === 'Writer' ||
            c.job === 'Story',
        ),
    )
    meta.protagonist = withPhoto(
      meta.protagonist,
      findByName(cast, meta.protagonist?.name) || cast[0],
    )
    meta.secondary = withPhoto(
      meta.secondary,
      findByName(cast, meta.secondary?.name) || cast[1],
    )
    if (meta.antagonist && !meta.antagonist.none) {
      meta.antagonist = withPhoto(
        meta.antagonist,
        findByName(cast, meta.antagonist?.name) || cast[2],
      )
    }

    const directorName = director?.name || row.director

    await pool.query(
      `UPDATE movies
       SET cast_json = $2::jsonb,
           director = COALESCE($3, director),
           source_url = COALESCE(source_url, $4),
           attribution = COALESCE(attribution, $5)
       WHERE id = $1`,
      [
        row.id,
        JSON.stringify(meta),
        directorName,
        `https://www.themoviedb.org/movie/${tmdbId}`,
        `TMDB #${tmdbId}`,
      ],
    )
    console.log('ok')
    ok += 1
  } catch (err) {
    console.log('ERRO', err.message)
    fail += 1
  }
}

console.log(`\nOK ${ok}  FAIL ${fail}`)

// Re-export catalog for deploy seed
const { rows: all } = await pool.query(`
  SELECT title, title_pt, year, aliases, license, source_url, attribution,
         poster_path, poster_wide_path, clip_path, director, cast_json
  FROM movies
  ORDER BY year NULLS LAST, title
`)
const out = path.resolve(__dirname, '../data/movies_catalog.json')
fs.writeFileSync(out, JSON.stringify(all))
console.log(`Catalogo atualizado: ${all.length} filmes`)
await pool.end()
