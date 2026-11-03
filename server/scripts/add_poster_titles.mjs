/**
 * Acrescenta títulos pontuais ao pool Poster (DB + movies_catalog.json).
 *
 *   node scripts/add_poster_titles.mjs
 *   node scripts/add_poster_titles.mjs --dry-run
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
const IMG = 'https://image.tmdb.org/t/p/w500'
const PERSON_IMG = 'https://image.tmdb.org/t/p/w185'
const dryRun = process.argv.includes('--dry-run')

/** query/year ou tmdbId forçado + aliases PT extras */
const WANT = [
  {
    tmdbId: 608654,
    aliases: ['Banana Split Movie', 'The Banana Splits Movie', 'Banana Splits'],
  },
  {
    tmdbId: 9992,
    aliases: [
      'Arthur e os Minimoys',
      'Arthur and the Minimoys',
      'Arthur and the Invisibles',
    ],
  },
  {
    tmdbId: 26505,
    aliases: [
      'Arthur e os Minimoys 2',
      'Arthur and the Revenge of Maltazard',
      'Arthur e a Vingança de Maltazard',
    ],
  },
  {
    tmdbId: 42949,
    aliases: [
      'Arthur e os Minimoys 3',
      'Arthur 3: The War of the Two Worlds',
      'Arthur e a Guerra dos Dois Mundos',
    ],
  },
  { tmdbId: 51620, aliases: ['Corrida Mortal 2', 'Death Race 2'] },
  {
    tmdbId: 156717,
    aliases: ['Corrida Mortal 3', 'Death Race 3', 'Death Race: Inferno'],
  },
  { tmdbId: 8968, aliases: ['Bong do Mal', 'Boogeyman', 'O Bong do Mal'] },
  { tmdbId: 14913, aliases: ['Bong do Mal 2', 'Boogeyman 2'] },
  { tmdbId: 15262, aliases: ['Bong do Mal 3', 'Boogeyman 3'] },
  {
    tmdbId: 532408,
    aliases: ['O Bong do Mal', 'The Boogeyman', 'Bong do Mal 2023'],
  },
  // Hellboys: clássicos + reboot + Crooked Man
  { tmdbId: 1487, aliases: ['Hellboy', 'Hellboy 1', 'Hellboy 2004'] },
  {
    tmdbId: 11253,
    aliases: ['Hellboy 2', 'Hellboy II', 'Hellboy II: The Golden Army'],
  },
  { tmdbId: 456740, aliases: ['Hellboy 2019', 'Hellboy (2019)'] },
  {
    tmdbId: 1087822,
    aliases: ['Hellboy: The Crooked Man', 'Hellboy Crooked Man'],
  },
  { tmdbId: 2486, aliases: ['Eragon'] },
  {
    tmdbId: 14164,
    aliases: ['Dragon Ball Evolution', 'Dragonball Evolution'],
  },
  {
    tmdbId: 242161,
    aliases: [
      'Casseta e Planeta o Filme',
      'Casseta & Planeta o Filme',
      'Casseta & Planeta: A Taça do Mundo é Nossa!',
    ],
  },
  {
    tmdbId: 342573,
    aliases: [
      'Casseta e Planeta 2',
      'Casseta & Planeta: Seus Problemas Acabaram!!!',
    ],
  },
  {
    tmdbId: 30913,
    aliases: [
      'A Meia-Noite Levarei Sua Alma',
      'À Meia-Noite Levarei Sua Alma',
      "At Midnight I'll Take Your Soul",
      'Mojica',
      'Ze do Caixao',
      'Zé do Caixão',
    ],
  },
  {
    tmdbId: 30914,
    aliases: [
      'Esta Noite Encarnarei no Teu Cadaver',
      'Esta Noite Encarnarei no Teu Cadáver',
      'This Night I Will Possess Your Corpse',
    ],
  },
  {
    tmdbId: 107016,
    aliases: [
      'O Estranho Mundo de Zé do Caixão',
      'The Strange World of Coffin Joe',
    ],
  },
  {
    tmdbId: 91378,
    aliases: [
      'O Despertar da Besta',
      'The Awakening of the Beast',
      'O Ritual dos Sádicos',
    ],
  },
  {
    tmdbId: 127832,
    aliases: ['Exorcismo Negro', 'The Bloody Exorcism of Coffin Joe'],
  },
  {
    tmdbId: 23508,
    aliases: ['A Encarnação do Demônio', 'Embodiment of Evil'],
  },
  { tmdbId: 71326, aliases: ['Bunnyman', 'Bunny Man'] },
  {
    tmdbId: 281869,
    aliases: ['Bunnyman 2', 'Bunnyman Massacre', 'The Bunnyman Massacre'],
  },
  { tmdbId: 11962, aliases: ['Joe e as Baratas', "Joe's Apartment"] },
]

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
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`TMDB ${pathname} ${res.status}: ${text.slice(0, 180)}`)
  }
  return res.json()
}

function yearOf(m) {
  const y = Number((m.release_date || '').slice(0, 4))
  return Number.isFinite(y) ? y : null
}

function regionFrom(details) {
  const c = details.production_countries?.[0]?.iso_3166_1
  const map = {
    US: 'EUA',
    BR: 'Brasil',
    GB: 'Reino Unido',
    FR: 'França',
    DE: 'Alemanha',
    IT: 'Itália',
    JP: 'Japão',
    KR: 'Coreia do Sul',
    MX: 'México',
    CA: 'Canadá',
    AR: 'Argentina',
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
  const director = crew.find((c) => c.job === 'Director') || null
  const antHit =
    cast.find((c) =>
      /antagon|villain|killer|monster|murder/i.test(c.character || ''),
    ) ||
    cast[2] ||
    null
  return {
    region: regionFrom(details),
    director_image_url: director?.profile_path
      ? `${PERSON_IMG}${director.profile_path}`
      : null,
    screenwriter: personSlot(writers[0]),
    protagonist: personSlot(cast[0]),
    antagonist: antHit ? personSlot(antHit) : { none: true },
    secondary: personSlot(cast[1]),
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

async function resolve(entry) {
  if (entry.tmdbId) return tmdb(`/movie/${entry.tmdbId}`)
  const data = await tmdb('/search/movie', {
    query: entry.query,
    include_adult: 'false',
    year: entry.year || undefined,
  })
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

async function upsertMovie(pool, row) {
  const existing = await pool.query(
    `SELECT id, poster_path, cast_json FROM movies
     WHERE (
         lower(title) = lower($1)
         OR lower(coalesce(title_pt,'')) = lower($2)
       )
       AND ($3::int IS NULL OR year = $3::int)
     LIMIT 1`,
    [row.title, row.title_pt, row.year],
  )

  if (existing.rows[0]) {
    const prevAliases = []
    await pool.query(
      `UPDATE movies SET
         title_pt = $2,
         aliases = (
           SELECT ARRAY(
             SELECT DISTINCT unnest(coalesce(aliases, '{}'::text[]) || $3::text[])
           )
         ),
         poster_path = COALESCE(NULLIF(poster_path, ''), $4),
         director = COALESCE($5, director),
         cast_json = CASE
           WHEN cast_json IS NULL OR cast_json = '{}'::jsonb OR cast_json = '[]'::jsonb
           THEN $6::jsonb ELSE cast_json END,
         attribution = COALESCE(attribution, $7),
         source_url = COALESCE(source_url, $8)
       WHERE id = $1`,
      [
        existing.rows[0].id,
        row.title_pt,
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
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'))
  const byId = new Map()
  for (let i = 0; i < catalog.length; i++) {
    const id = tmdbIdFromEntry(catalog[i])
    if (id) byId.set(id, i)
  }

  const pool = dryRun ? null : makePool()
  const report = []

  for (const entry of WANT) {
    const label = entry.tmdbId
      ? `id:${entry.tmdbId}`
      : `${entry.query} (${entry.year || '?'})`
    process.stdout.write(`→ ${label} … `)
    try {
      const hit = await resolve(entry)
      await sleep(160)
      if (!hit?.id) {
        console.log('NÃO ACHEI')
        report.push({ label, status: 'missing' })
        continue
      }

      const details =
        hit.poster_path && hit.production_countries
          ? hit
          : await tmdb(`/movie/${hit.id}`)
      await sleep(160)
      const credits = await tmdb(`/movie/${hit.id}/credits`)
      await sleep(160)

      if (!details.poster_path) {
        console.log('sem pôster')
        report.push({ label, status: 'no_poster', id: details.id })
        continue
      }

      const title = details.original_title || details.title
      const titlePt = details.title || title
      const year = yearOf(details)
      const aliases = [
        ...(entry.aliases || []),
        title,
        titlePt,
        details.original_title,
        details.title,
      ].filter(Boolean)

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
        director: directorOf(credits),
        cast_json: buildCastJson(details, credits, {
          id: details.id,
          popularity: details.popularity,
          vote_count: details.vote_count,
        }),
      }

      if (dryRun) {
        console.log(`[dry] ${titlePt} (${year})`)
        report.push({ label, status: 'dry', id: details.id, title: titlePt, year })
        continue
      }

      const action = await upsertMovie(pool, row)
      const idx = byId.get(details.id)
      if (idx != null) {
        const prev = catalog[idx]
        catalog[idx] = {
          ...prev,
          ...row,
          aliases: [...new Set([...(prev.aliases || []), ...row.aliases])],
          poster_path: prev.poster_path?.startsWith('/posters/')
            ? prev.poster_path
            : row.poster_path,
          cast_json: prev.cast_json?._tmdb ? prev.cast_json : row.cast_json,
        }
      } else {
        catalog.push(row)
        byId.set(details.id, catalog.length - 1)
      }
      console.log(`${action} · ${titlePt} (${year})`)
      report.push({
        label,
        status: action,
        id: details.id,
        title: titlePt,
        year,
      })
    } catch (err) {
      console.log('ERRO', err.message)
      report.push({ label, status: 'error', error: err.message })
    }
  }

  if (!dryRun) {
    fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n')
    console.log(`\nCatálogo: ${catalog.length} → ${CATALOG_PATH}`)
    if (pool) await pool.end()
  }

  const out = path.join(__dirname, 'add_poster_titles_report.json')
  fs.writeFileSync(out, JSON.stringify(report, null, 2))
  console.log('Report:', out)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
