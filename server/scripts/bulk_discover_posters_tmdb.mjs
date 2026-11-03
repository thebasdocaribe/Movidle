/**
 * Bulk Poster pool via TMDB Discover (~2–3k) + trash cult conhecido.
 *
 * Uso:
 *   node scripts/bulk_discover_posters_tmdb.mjs --dry-run
 *   node scripts/bulk_discover_posters_tmdb.mjs --target 2800
 *   node scripts/bulk_discover_posters_tmdb.mjs --target 2800 --limit 40   # smoke
 *
 * Env: TMDB_API_KEY + DATABASE_URL ou PG* (via server/.env)
 *
 * - Pôster via CDN TMDB (não baixa jpg local)
 * - Atualiza DB + server/data/movies_catalog.json (seed no deploy)
 */
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const ROOT = path.resolve(__dirname, '../..')
const CATALOG_PATH = path.join(__dirname, '../data/movies_catalog.json')
const TMDB = 'https://api.themoviedb.org/3'
const IMG = 'https://image.tmdb.org/t/p/w500'
const PERSON_IMG = 'https://image.tmdb.org/t/p/w185'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const catalogOnly = args.includes('--catalog-only')
const targetIdx = args.indexOf('--target')
const TARGET = targetIdx >= 0 ? Number(args[targetIdx + 1]) : 2800
const limitIdx = args.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : null

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
  url.searchParams.set('language', 'pt-BR')
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
      throw new Error(`TMDB ${pathname} ${res.status}: ${text.slice(0, 200)}`)
    }
    return res.json()
  }
  throw new Error(`TMDB rate limit: ${pathname}`)
}

function yearOf(m) {
  const d = m.release_date || ''
  const y = Number(d.slice(0, 4))
  return Number.isFinite(y) ? y : null
}

function regionFrom(details) {
  const c = details.production_countries?.[0]?.iso_3166_1
  const map = {
    US: 'EUA',
    BR: 'Brasil',
    GB: 'Reino Unido',
    UK: 'Reino Unido',
    FR: 'França',
    DE: 'Alemanha',
    IT: 'Itália',
    ES: 'Espanha',
    JP: 'Japão',
    KR: 'Coreia do Sul',
    CN: 'China',
    MX: 'México',
    CA: 'Canadá',
    AU: 'Austrália',
    NZ: 'Nova Zelândia',
    SE: 'Suécia',
    NO: 'Noruega',
    DK: 'Dinamarca',
    FI: 'Finlândia',
    IE: 'Irlanda',
    NL: 'Holanda',
    BE: 'Bélgica',
    PT: 'Portugal',
    AR: 'Argentina',
    CL: 'Chile',
    IN: 'Índia',
    LV: 'Letônia',
  }
  return map[c] || c || '—'
}

function personSlot(p) {
  if (!p?.name) return null
  return {
    name: p.name,
    image_url: p.profile_path ? `${PERSON_IMG}${p.profile_path}` : null,
  }
}

function buildCastJson(details, credits, meta) {
  const crew = credits.crew || []
  const cast = credits.cast || []
  const writers = crew.filter(
    (c) =>
      c.job === 'Screenplay' ||
      c.job === 'Writer' ||
      c.job === 'Story' ||
      c.department === 'Writing',
  )
  const writer = writers[0] || null
  const lead = cast[0] || null
  const secondary = cast[1] || null
  const antHit =
    cast.find((c) =>
      /antagon|villain|killer|monster|murder/i.test(c.character || ''),
    ) ||
    cast[2] ||
    null
  const director = crew.find((c) => c.job === 'Director') || null

  return {
    region: regionFrom(details),
    director_image_url: director?.profile_path
      ? `${PERSON_IMG}${director.profile_path}`
      : null,
    screenwriter: personSlot(writer),
    protagonist: personSlot(lead),
    antagonist: antHit ? personSlot(antHit) : { none: true },
    secondary: personSlot(secondary),
    _tmdb: {
      id: meta.id,
      popularity: meta.popularity ?? details.popularity ?? 0,
      vote_count: meta.vote_count ?? details.vote_count ?? 0,
    },
  }
}

function directorOf(credits) {
  return credits.crew?.find((c) => c.job === 'Director')?.name || null
}

function aliasesFor(details) {
  const set = new Set()
  if (details.title) set.add(details.title)
  if (details.original_title) set.add(details.original_title)
  return [...set].filter(Boolean)
}

function tmdbIdFromEntry(m) {
  const fromMeta = m?.cast_json?._tmdb?.id
  if (fromMeta) return Number(fromMeta)
  const url = m?.source_url || ''
  const m1 = /themoviedb\.org\/movie\/(\d+)/i.exec(url)
  if (m1) return Number(m1[1])
  const att = m?.attribution || ''
  const m2 = /TMDB\s*#(\d+)/i.exec(att)
  if (m2) return Number(m2[1])
  return null
}

/** Cult / trash / meme que o povo conhece mesmo com voto baixo */
const FORCE_TRASH = [
  { query: '365 Days', year: 2020 },
  { query: '365 Days: This Day', year: 2022 },
  { query: 'The Next 365 Days', year: 2022 },
  { query: 'Killer Sofa', year: 2019 },
  { query: 'Basket Case', year: 1982 },
  { query: 'Basket Case 2', year: 1990 },
  { query: 'The Room', year: 2003 },
  { query: 'Troll 2', year: 1990 },
  { query: 'Birdemic: Shock and Terror', year: 2010 },
  { query: 'Sharknado', year: 2013 },
  { query: 'Sharknado 2: The Second One', year: 2014 },
  { query: 'Samurai Cop', year: 1991 },
  { query: 'Miami Connection', year: 1987 },
  { query: 'Death Bed: The Bed That Eats', year: 1977 },
  { query: 'Rubber', year: 2010 },
  { query: 'The Happening', year: 2008 },
  { query: 'Cats', year: 2019 },
  { query: 'Morbius', year: 2022 },
  { query: 'Disaster Movie', year: 2008 },
  { query: 'Epic Movie', year: 2007 },
  { query: 'Scary Movie', year: 2000 },
  { query: 'Date Movie', year: 2006 },
  { query: 'Meet the Feebles', year: 1989 },
  { query: 'Pink Flamingos', year: 1972 },
  { query: 'Human Centipede', year: 2009 },
  { query: 'A Serbian Film', year: 2010 },
  { query: 'The Toxic Avenger', year: 1984 },
  { query: 'Class of Nuke \'Em High', year: 1986 },
  { query: 'Manos: The Hands of Fate', year: 1966 },
  { query: 'Plan 9 from Outer Space', year: 1959 },
  { query: 'Battlefield Earth', year: 2000 },
  { query: 'Gigli', year: 2003 },
  { query: 'Movie 43', year: 2013 },
  { query: 'The Emoji Movie', year: 2017 },
  { query: 'Jack and Jill', year: 2011 },
  { query: 'Norbit', year: 2007 },
  { query: 'Crossroads', year: 2002 },
  { query: 'Glitter', year: 2001 },
  { query: 'Winnie the Pooh: Blood and Honey', year: 2023 },
  { query: 'Cocaine Bear', year: 2023 },
  { query: 'Velocipastor', year: 2018 },
  { query: 'Samurai Cop 2: Deadly Vengeance', year: 2015 },
  { query: 'Mac and Me', year: 1988 },
  { query: 'Howard the Duck', year: 1986 },
  { query: 'Batman & Robin', year: 1997 },
  { query: 'Superman IV: The Quest for Peace', year: 1987 },
  { query: 'Jaws: The Revenge', year: 1987 },
  { query: 'Halloween III: Season of the Witch', year: 1982 },
  { query: 'Freddy Got Fingered', year: 2001 },
  { query: 'The Wicker Man', year: 2006 },
  { query: 'Left Behind', year: 2014 },
  { query: 'After Earth', year: 2013 },
  { query: 'Jupiter Ascending', year: 2015 },
  { query: 'The Last Airbender', year: 2010 },
  { query: 'Dragonball Evolution', year: 2009 },
  { query: 'Fantastic Four', year: 2015 },
  { query: 'Madame Web', year: 2024 },
  { query: 'Kraven the Hunter', year: 2024 },
  { query: 'Borderlands', year: 2024 },
  { query: 'Argylle', year: 2024 },
  { query: 'Rebel Moon', year: 2023 },
  { query: 'Red Notice', year: 2021 },
  { query: 'The Gray Man', year: 2022 },
  { query: 'Purple Hearts', year: 2022 },
  { query: 'Tall Girl', year: 2019 },
  { query: 'To All the Boys I\'ve Loved Before', year: 2018 },
  { query: 'The Kissing Booth', year: 2018 },
  { query: 'After', year: 2019 },
  { query: 'Fifty Shades of Grey', year: 2015 },
  { query: 'Twilight', year: 2008 },
  { query: 'The Twilight Saga: New Moon', year: 2009 },
  { query: 'The Twilight Saga: Eclipse', year: 2010 },
  { query: 'The Twilight Saga: Breaking Dawn - Part 1', year: 2011 },
  { query: 'The Twilight Saga: Breaking Dawn - Part 2', year: 2012 },
]

/** vote_count mínimo + páginas por faixa de ano */
function discoverPlan(year) {
  if (year >= 2020) return { minVotes: 120, pages: 3 }
  if (year >= 2010) return { minVotes: 250, pages: 3 }
  if (year >= 2000) return { minVotes: 350, pages: 2 }
  if (year >= 1990) return { minVotes: 350, pages: 2 }
  if (year >= 1980) return { minVotes: 300, pages: 2 }
  if (year >= 1970) return { minVotes: 250, pages: 2 }
  if (year >= 1960) return { minVotes: 200, pages: 2 }
  return { minVotes: 150, pages: 1 }
}

async function discoverYear(year) {
  const { minVotes, pages } = discoverPlan(year)
  const out = []
  for (let page = 1; page <= pages; page++) {
    const data = await tmdb('/discover/movie', {
      primary_release_year: year,
      sort_by: 'popularity.desc',
      'vote_count.gte': minVotes,
      include_adult: 'false',
      page,
    })
    await sleep(180)
    out.push(...(data.results || []))
    if (page >= (data.total_pages || 1)) break
  }
  return out
}

/** Horror / cult extra (vote mais baixo) */
async function discoverHorrorYear(year) {
  const data = await tmdb('/discover/movie', {
    primary_release_year: year,
    sort_by: 'popularity.desc',
    with_genres: '27',
    'vote_count.gte': 80,
    include_adult: 'false',
    page: 1,
  })
  await sleep(180)
  return data.results || []
}

async function resolveForce(entry) {
  if (entry.tmdbId) {
    const details = await tmdb(`/movie/${entry.tmdbId}`)
    await sleep(180)
    return details
  }
  const data = await tmdb('/search/movie', {
    query: entry.query,
    include_adult: 'false',
    year: entry.year || undefined,
  })
  await sleep(180)
  const list = data.results || []
  if (!list.length) return null
  if (entry.year) {
    const exact = list.find((m) => yearOf(m) === entry.year)
    if (exact) return exact
    list.sort(
      (a, b) =>
        Math.abs((yearOf(a) || 0) - entry.year) -
        Math.abs((yearOf(b) || 0) - entry.year),
    )
  }
  return list[0]
}

function catalogKey(title, year) {
  return `${String(title || '').toLowerCase()}::${year ?? ''}`
}

async function upsertMovie(pool, row) {
  const existing = await pool.query(
    `SELECT id FROM movies
     WHERE (
         lower(title) = lower($1)
         OR lower(coalesce(title_pt,'')) = lower($2)
       )
       AND ($3::int IS NULL OR year = $3::int)
     LIMIT 1`,
    [row.title, row.title_pt, row.year],
  )

  if (existing.rows[0]) {
    await pool.query(
      `UPDATE movies SET
         title = $2,
         title_pt = $3,
         year = $4,
         aliases = $5,
         poster_path = COALESCE(NULLIF(poster_path, ''), $6),
         director = COALESCE($7, director),
         cast_json = $8::jsonb,
         attribution = $9,
         source_url = $10,
         license = COALESCE(license, 'review')
       WHERE id = $1`,
      [
        existing.rows[0].id,
        row.title,
        row.title_pt,
        row.year,
        row.aliases,
        row.poster_path,
        row.director,
        JSON.stringify(row.cast_json),
        row.attribution,
        row.source_url,
      ],
    )
    return 'updated'
  }

  await pool.query(
    `INSERT INTO movies
       (title, title_pt, year, aliases, license, source_url, attribution,
        poster_path, clip_path, director, cast_json)
     VALUES
       ($1,$2,$3,$4,'review',$5,$6,$7,NULL,$8,$9::jsonb)`,
    [
      row.title,
      row.title_pt,
      row.year,
      row.aliases,
      row.source_url,
      row.attribution,
      row.poster_path,
      row.director,
      JSON.stringify(row.cast_json),
    ],
  )
  return 'inserted'
}

async function main() {
  console.log(
    `Bulk Poster TMDB · target=${TARGET}` +
      (LIMIT ? ` · limit=${LIMIT}` : '') +
      (dryRun ? ' · DRY-RUN' : '') +
      '\n',
  )

  const catalog = fs.existsSync(CATALOG_PATH)
    ? JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'))
    : []
  if (!Array.isArray(catalog)) throw new Error('movies_catalog.json inválido')

  const knownIds = new Set()
  const knownKeys = new Set()
  for (const m of catalog) {
    const id = tmdbIdFromEntry(m)
    if (id) knownIds.add(id)
    knownKeys.add(catalogKey(m.title, m.year))
    if (m.title_pt) knownKeys.add(catalogKey(m.title_pt, m.year))
  }
  console.log(`Catálogo atual: ${catalog.length} · tmdb ids: ${knownIds.size}`)

  /** @type {Map<number, {id:number, popularity:number, vote_count:number, poster_path:string|null, title:string, release_date:string, force?:boolean}>} */
  const candidates = new Map()

  function addCandidate(m, force = false) {
    if (!m?.id || !m.poster_path) return
    if (m.adult) return
    const y = yearOf(m)
    if (y != null && (y < 1950 || y > 2026)) return
    const prev = candidates.get(m.id)
    if (prev && !force) return
    candidates.set(m.id, {
      id: m.id,
      popularity: m.popularity || 0,
      vote_count: m.vote_count || 0,
      poster_path: m.poster_path,
      title: m.title || m.original_title || '?',
      release_date: m.release_date || '',
      force,
    })
  }

  // 1) Force trash / meme
  console.log(`\n— Force trash (${FORCE_TRASH.length}) —`)
  for (const entry of FORCE_TRASH) {
    process.stdout.write(`  ${entry.query} … `)
    try {
      const hit = await resolveForce(entry)
      if (!hit?.id) {
        console.log('não achei')
        continue
      }
      // search hit may lack poster — still keep id; enrich later
      if (!hit.poster_path) {
        const details = await tmdb(`/movie/${hit.id}`)
        await sleep(180)
        addCandidate(details, true)
        console.log(`${details.title} (${yearOf(details)})`)
      } else {
        addCandidate(hit, true)
        console.log(`${hit.title} (${yearOf(hit)})`)
      }
    } catch (err) {
      console.log('erro', err.message)
    }
  }

  // 2) Discover popular by year
  console.log('\n— Discover por ano —')
  for (let year = 1955; year <= 2025; year++) {
    process.stdout.write(`  ${year} … `)
    try {
      const pop = await discoverYear(year)
      for (const m of pop) addCandidate(m, false)
      // horror pass 1970+
      if (year >= 1970 && year <= 2024) {
        const horror = await discoverHorrorYear(year)
        for (const m of horror) addCandidate(m, false)
      }
      console.log(`${candidates.size} acumulados`)
    } catch (err) {
      console.log('erro', err.message)
    }
  }

  // Prefer force + high popularity; skip already in catalog
  const ranked = [...candidates.values()]
    .filter((c) => !knownIds.has(c.id))
    .sort((a, b) => {
      if (a.force !== b.force) return a.force ? -1 : 1
      return (b.popularity || 0) - (a.popularity || 0)
    })

  const need = Math.max(0, TARGET - catalog.length)
  let queue = ranked.slice(0, need)
  if (LIMIT != null) queue = queue.slice(0, LIMIT)

  console.log(
    `\nCandidatos novos: ${ranked.length} · a importar agora: ${queue.length}` +
      ` (catálogo→~${catalog.length + queue.length})\n`,
  )

  if (dryRun) {
    const sample = queue.slice(0, 25).map((c) => ({
      id: c.id,
      title: c.title,
      year: yearOf(c),
      pop: Math.round(c.popularity),
      votes: c.vote_count,
      force: Boolean(c.force),
    }))
    console.log('Sample:', sample)
    const reportPath = path.join(__dirname, 'bulk_discover_dryrun.json')
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          catalogNow: catalog.length,
          candidatesNew: ranked.length,
          wouldImport: queue.length,
          sample,
          topForce: queue.filter((c) => c.force).slice(0, 40),
        },
        null,
        2,
      ),
    )
    console.log('Dry-run report:', reportPath)
    return
  }

  const pool = catalogOnly ? null : makePool()
  const ok = []
  const fail = []
  const nextCatalog = [...catalog]

  for (let i = 0; i < queue.length; i++) {
    const c = queue[i]
    const tag = `[${i + 1}/${queue.length}]`
    process.stdout.write(`${tag} #${c.id} ${c.title} … `)
    try {
      const details = await tmdb(`/movie/${c.id}`)
      await sleep(160)
      const credits = await tmdb(`/movie/${c.id}/credits`)
      await sleep(160)

      if (!details.poster_path) {
        console.log('sem pôster')
        fail.push({ id: c.id, reason: 'no_poster' })
        continue
      }

      const title = details.original_title || details.title
      const titlePt = details.title || title
      const year = yearOf(details)
      const key = catalogKey(title, year)
      if (knownKeys.has(key) || knownKeys.has(catalogKey(titlePt, year))) {
        console.log('já no catálogo (title+year)')
        knownIds.add(c.id)
        continue
      }

      const castJson = buildCastJson(details, credits, c)
      const director = directorOf(credits)
      const aliases = aliasesFor(details)
      if (titlePt && titlePt !== title) aliases.push(titlePt)

      const row = {
        title,
        title_pt: titlePt,
        year,
        aliases: [...new Set(aliases)],
        license: 'review',
        source_url: `https://www.themoviedb.org/movie/${details.id}`,
        attribution: `TMDB #${details.id}`,
        poster_path: `${IMG}${details.poster_path}`,
        poster_wide_path: null,
        clip_path: null,
        director,
        cast_json: castJson,
      }

      if (pool) {
        const action = await upsertMovie(pool, row)
        process.stdout.write(`${action} · `)
      }

      nextCatalog.push(row)
      knownIds.add(c.id)
      knownKeys.add(key)
      knownKeys.add(catalogKey(titlePt, year))
      ok.push({ id: details.id, title: titlePt, year })
      console.log(`${titlePt} (${year})`)
    } catch (err) {
      console.log('ERRO', err.message)
      fail.push({ id: c.id, reason: err.message })
    }
  }

  // Persist catalog (stable-ish: keep old order, append new)
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(nextCatalog, null, 2) + '\n')
  console.log(`\nCatálogo gravado: ${nextCatalog.length} → ${CATALOG_PATH}`)

  if (pool) await pool.end()

  const report = {
    ok: ok.length,
    fail,
    catalogTotal: nextCatalog.length,
    imported: ok,
  }
  const reportPath = path.join(__dirname, 'bulk_discover_report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log('=== RESUMO ===')
  console.log(`OK: ${ok.length}  FAIL: ${fail.length}  CATALOG: ${nextCatalog.length}`)
  console.log('Report:', reportPath)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
