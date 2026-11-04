/**
 * Grava cast_json._traits.genres (+ region) via TMDB.
 *   node scripts/backfill_traits_tmdb.mjs
 *   node scripts/backfill_traits_tmdb.mjs --limit 100
 */
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const CATALOG_PATH = path.join(__dirname, '../data/movies_catalog.json')
const TMDB = 'https://api.themoviedb.org/3'
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : null

function apiKey() {
  const k = process.env.TMDB_API_KEY?.trim()
  if (!k) throw new Error('TMDB_API_KEY ausente')
  return k
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function makePool() {
  if (process.env.DATABASE_URL) {
    return new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.PGSSL === 'false'
          ? false
          : { rejectUnauthorized: false },
    })
  }
  return new pg.Pool({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'cineblitz',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD == null ? '' : String(process.env.PGPASSWORD),
  })
}

async function tmdb(pathname) {
  const url = new URL(`${TMDB}${pathname}`)
  url.searchParams.set('api_key', apiKey())
  url.searchParams.set('language', 'pt-BR')
  for (let i = 0; i < 4; i++) {
    const res = await fetch(url)
    if (res.status === 429) {
      await sleep(1500 * (i + 1))
      continue
    }
    if (!res.ok) throw new Error(`TMDB ${res.status}`)
    return res.json()
  }
  throw new Error('TMDB rate limit')
}

function tmdbIdOf(m) {
  const id = m?.cast_json?._tmdb?.id
  if (id) return Number(id)
  const url = m?.source_url || ''
  const hit = /themoviedb\.org\/movie\/(\d+)/i.exec(url)
  if (hit) return Number(hit[1])
  const att = m?.attribution || ''
  const hit2 = /TMDB\s*#(\d+)/i.exec(att)
  if (hit2) return Number(hit2[1])
  return null
}

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'))
const targets = catalog
  .map((m, index) => ({ m, index, id: tmdbIdOf(m) }))
  .filter((x) => x.id && !x.m.cast_json?._traits?.genres?.length)

const queue = LIMIT != null ? targets.slice(0, LIMIT) : targets
console.log(`Backfill traits · ${queue.length} (faltando gêneros)`)

const pool = makePool()
let ok = 0

for (let i = 0; i < queue.length; i++) {
  const { m, index, id } = queue[i]
  process.stdout.write(`[${i + 1}/${queue.length}] #${id} … `)
  try {
    const details = await tmdb(`/movie/${id}`)
    await sleep(150)
    const genres = (details.genres || []).map((g) => g.id).filter(Boolean)
    const region =
      m.cast_json?.region ||
      details.production_countries?.[0]?.iso_3166_1 ||
      '—'
    const next = {
      ...(m.cast_json || {}),
      _traits: {
        genres,
        region: m.cast_json?.region || region,
        runtime: details.runtime || null,
      },
    }
    catalog[index] = { ...m, cast_json: next }
    await pool.query(
      `UPDATE movies SET cast_json = $2::jsonb
       WHERE lower(title) = lower($1) AND ($3::int IS NULL OR year = $3::int)`,
      [m.title, JSON.stringify(next), m.year ?? null],
    )
    ok += 1
    console.log(genres.join(',') || 'sem gênero')
  } catch (err) {
    console.log('ERRO', err.message)
  }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n')
await pool.end()
console.log(`OK ${ok}/${queue.length}`)
