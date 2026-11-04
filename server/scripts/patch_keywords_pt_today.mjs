/**
 * Traduz curated → curatedPt do filme do dia (keywords) e persiste.
 *   node scripts/patch_keywords_pt_today.mjs
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import {
  ensurePortugueseKeywords,
  resolvedKeywords,
} from '../src/keywords.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

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

const pool = makePool()
const { rows } = await pool.query(
  `SELECT d.puzzle_date::text AS puzzle_date,
          m.id, m.title, m.title_pt, m.cast_json, m.source_url, m.attribution
   FROM keywords_daily d
   JOIN movies m ON m.id = d.movie_id
   ORDER BY d.puzzle_date DESC
   LIMIT 5`,
)

for (const row of rows) {
  console.log(row.puzzle_date, row.title)
  console.log('  before', resolvedKeywords(row).slice(0, 6))
  const { movie, words, changed } = await ensurePortugueseKeywords(row)
  console.log('  after ', words.slice(0, 6), changed ? '(saved)' : '(ok)')
  if (changed) {
    await pool.query(`UPDATE movies SET cast_json = $2::jsonb WHERE id = $1`, [
      row.id,
      JSON.stringify(movie.cast_json),
    ])
  }
}

await pool.end()
console.log('done')
