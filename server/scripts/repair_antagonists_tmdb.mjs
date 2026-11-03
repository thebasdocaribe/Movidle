/**
 * Refaz antagonista do cast_json via TMDB (sem cair no 3º do cartaz).
 *
 *   node scripts/repair_antagonists_tmdb.mjs
 *   node scripts/repair_antagonists_tmdb.mjs --only-hp
 *   node scripts/repair_antagonists_tmdb.mjs --dry-run
 */
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { buildCastJsonFromTmdb } from './lib/castFromTmdb.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const CATALOG_PATH = path.join(__dirname, '../data/movies_catalog.json')
const TMDB = 'https://api.themoviedb.org/3'
const dryRun = process.argv.includes('--dry-run')
const onlyHp = process.argv.includes('--only-hp')

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

async function tmdb(pathname, params = {}) {
  const url = new URL(`${TMDB}${pathname}`)
  url.searchParams.set('api_key', apiKey())
  url.searchParams.set('language', 'en-US')
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') url.searchParams.set(k, String(v))
  }
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url)
    if (res.status === 429) {
      await sleep(1200 * (attempt + 1))
      continue
    }
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`TMDB ${pathname} ${res.status}: ${text.slice(0, 160)}`)
    }
    return res.json()
  }
  throw new Error(`TMDB rate limit ${pathname}`)
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

function isHp(m) {
  const blob = [m.title, m.title_pt, ...(m.aliases || [])].join(' ')
  return /harry\s*potter/i.test(blob)
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'))
  const targets = catalog
    .map((m, index) => ({ m, index, id: tmdbIdOf(m) }))
    .filter((x) => x.id && (!onlyHp || isHp(x.m)))

  console.log(
    `Reparar antagonista · ${targets.length} filmes` +
      (onlyHp ? ' (só HP)' : '') +
      (dryRun ? ' · DRY' : ''),
  )

  const pool = dryRun ? null : makePool()
  let changed = 0
  let none = 0
  const samples = []

  for (let i = 0; i < targets.length; i++) {
    const { m, index, id } = targets[i]
    process.stdout.write(`[${i + 1}/${targets.length}] #${id} ${m.title_pt || m.title} … `)
    try {
      const details = await tmdb(`/movie/${id}`)
      await sleep(140)
      const credits = await tmdb(`/movie/${id}/credits`)
      await sleep(140)

      const nextCast = buildCastJsonFromTmdb(details, credits, {
        id,
        popularity: m.cast_json?._tmdb?.popularity,
        vote_count: m.cast_json?._tmdb?.vote_count,
      })
      // Mantém região PT se já tinha
      if (m.cast_json?.region) nextCast.region = m.cast_json.region

      const prevAnt = m.cast_json?.antagonist?.name || (m.cast_json?.antagonist?.none ? '(none)' : '?')
      const nextAnt = nextCast.antagonist?.name || '(none)'
      if (nextCast.antagonist?.none) none += 1

      if (prevAnt === nextAnt) {
        console.log(`ok (${nextAnt})`)
        continue
      }

      console.log(`${prevAnt} → ${nextAnt}`)
      changed += 1
      if (samples.length < 40) {
        samples.push({
          title: m.title_pt || m.title,
          year: m.year,
          from: prevAnt,
          to: nextAnt,
        })
      }

      if (dryRun) continue

      catalog[index] = { ...m, cast_json: nextCast }
      await pool.query(
        `UPDATE movies SET cast_json = $2::jsonb
         WHERE lower(title) = lower($1) AND ($3::int IS NULL OR year = $3::int)`,
        [m.title, JSON.stringify(nextCast), m.year ?? null],
      )
    } catch (err) {
      console.log('ERRO', err.message)
    }
  }

  if (!dryRun) {
    fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n')
    if (pool) await pool.end()
  }

  console.log('\n=== RESUMO ===')
  console.log(`Alterados: ${changed} · sem antagonista: ${none}`)
  console.log(samples)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
