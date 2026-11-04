import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { query, pool } from '../src/db.js'
import { resolvedKeywords, tmdbIdFromMovie } from '../src/keywords.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const { rows } = await query(
  `SELECT d.puzzle_date::text AS d, m.id, m.title, m.title_pt, m.cast_json, m.source_url, m.attribution
   FROM keywords_daily d
   JOIN movies m ON m.id = d.movie_id
   ORDER BY d.puzzle_date DESC
   LIMIT 10`,
)
for (const r of rows) {
  console.log('---', r.d, '|', r.title_pt || r.title, '| tmdb', tmdbIdFromMovie(r))
  console.log(resolvedKeywords(r).slice(0, 18).join(', '))
  console.log(
    'curatedPt?',
    Array.isArray(r.cast_json?._keywords?.curatedPt),
    r.cast_json?._keywords?.curatedPt?.length,
  )
}
await pool.end()
