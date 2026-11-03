import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CATALOG_PATH = path.join(__dirname, '../data/movies_catalog.json')

/**
 * Upsert do catálogo de filmes (pôsteres + cast) no deploy.
 * Chave: lower(title) + year (evita sobrescrever remakes).
 */
export async function seedMoviesCatalog(client) {
  if (!fs.existsSync(CATALOG_PATH)) {
    console.warn('[migrate] movies_catalog.json ausente — pulando seed filmes')
    return { inserted: 0, updated: 0, total: 0 }
  }

  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'))
  if (!Array.isArray(catalog) || catalog.length === 0) {
    return { inserted: 0, updated: 0, total: 0 }
  }

  let inserted = 0
  let updated = 0

  for (const m of catalog) {
    const title = m.title
    const titlePt = m.title_pt || m.title
    const year = m.year ?? null
    const aliases = Array.isArray(m.aliases) ? m.aliases : []
    const license = m.license || 'review'
    const sourceUrl = m.source_url || null
    const attribution = m.attribution || null
    const posterPath = m.poster_path
    const posterWide = m.poster_wide_path || null
    const clipPath = m.clip_path || null
    const director = m.director || null
    const castJson = m.cast_json ?? {}

    if (!title || !posterPath) continue

    const { rows } = await client.query(
      `SELECT id FROM movies
       WHERE lower(title) = lower($1)
         AND ($2::int IS NULL OR year = $2::int)
       LIMIT 1`,
      [title, year],
    )

    if (rows.length === 0) {
      await client.query(
        `INSERT INTO movies
           (title, title_pt, year, aliases, license, source_url, attribution,
            poster_path, poster_wide_path, clip_path, director, cast_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)`,
        [
          title,
          titlePt,
          year,
          aliases,
          license,
          sourceUrl,
          attribution,
          posterPath,
          posterWide,
          clipPath,
          director,
          JSON.stringify(castJson),
        ],
      )
      inserted += 1
    } else {
      await client.query(
        `UPDATE movies SET
           title_pt = $2,
           aliases = $3,
           license = COALESCE($4, license),
           source_url = COALESCE($5, source_url),
           attribution = COALESCE($6, attribution),
           poster_path = $7,
           poster_wide_path = COALESCE($8, poster_wide_path),
           clip_path = COALESCE($9, clip_path),
           director = COALESCE($10, director),
           cast_json = $11::jsonb,
           year = COALESCE($12, year)
         WHERE id = $1`,
        [
          rows[0].id,
          titlePt,
          aliases,
          license,
          sourceUrl,
          attribution,
          posterPath,
          posterWide,
          clipPath,
          director,
          JSON.stringify(castJson),
          year,
        ],
      )
      updated += 1
    }
  }

  return { inserted, updated, total: catalog.length }
}
