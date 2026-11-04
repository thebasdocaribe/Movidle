/**
 * Grava cast_json._keywords { raw, curated } via TMDB.
 *   node scripts/backfill_keywords_tmdb.mjs
 *   node scripts/backfill_keywords_tmdb.mjs --limit 100
 *   node scripts/backfill_keywords_tmdb.mjs --force
 */
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { curateKeywords } from '../src/keywords.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const CATALOG_PATH = path.join(__dirname, '../data/movies_catalog.json')
const TMDB = 'https://api.themoviedb.org/3'
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : null
const FORCE = process.argv.includes('--force')

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

async function tmdbKeywords(id) {
  const urlEn = new URL(`${TMDB}/movie/${id}/keywords`)
  urlEn.searchParams.set('api_key', apiKey())
  const urlPt = new URL(`${TMDB}/movie/${id}/keywords`)
  urlPt.searchParams.set('api_key', apiKey())
  urlPt.searchParams.set('language', 'pt-BR')

  for (let i = 0; i < 4; i++) {
    const [resEn, resPt] = await Promise.all([fetch(urlEn), fetch(urlPt)])
    if (resEn.status === 429 || resPt.status === 429) {
      await sleep(1500 * (i + 1))
      continue
    }
    if (!resEn.ok) throw new Error(`TMDB ${resEn.status}`)
    const dataEn = await resEn.json()
    const listEn = Array.isArray(dataEn.keywords) ? dataEn.keywords : []
    let listPt = []
    if (resPt.ok) {
      const dataPt = await resPt.json()
      listPt = Array.isArray(dataPt.keywords) ? dataPt.keywords : []
    }
    const ptById = new Map(
      listPt.filter((k) => k?.id).map((k) => [k.id, String(k.name || '')]),
    )
    return listEn
      .filter((k) => k?.id && k?.name)
      .map((k) => ({
        id: k.id,
        name: String(k.name),
        ...(ptById.get(k.id) ? { namePt: ptById.get(k.id) } : {}),
      }))
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
  .filter((x) => {
    if (!x.id) return false
    if (FORCE) return true
    return !Array.isArray(x.m.cast_json?._keywords?.curated)
  })

const queue = LIMIT != null ? targets.slice(0, LIMIT) : targets
console.log(`Backfill keywords · ${queue.length}`)

const pool = makePool()
let ok = 0
let enough = 0

for (let i = 0; i < queue.length; i++) {
  const { m, index, id } = queue[i]
  process.stdout.write(`[${i + 1}/${queue.length}] #${id} … `)
  try {
    const raw = await tmdbKeywords(id)
    await sleep(120)
    const curated = curateKeywords(raw, m)
    const next = {
      ...(m.cast_json || {}),
      _keywords: { raw, curated },
    }
    catalog[index] = { ...m, cast_json: next }
    await pool.query(
      `UPDATE movies SET cast_json = $2::jsonb
       WHERE lower(title) = lower($1) AND ($3::int IS NULL OR year = $3::int)`,
      [m.title, JSON.stringify(next), m.year ?? null],
    )
    ok += 1
    if (curated.length >= 10) enough += 1
    console.log(`${curated.length} curated (${raw.length} raw)`)
  } catch (err) {
    console.log('ERRO', err.message)
  }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n')
await pool.end()
console.log(`OK ${ok}/${queue.length} · elegíveis (≥10): ${enough}`)
