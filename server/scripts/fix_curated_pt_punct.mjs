import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const pool = process.env.DATABASE_URL
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new pg.Pool({
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE || 'cineblitz',
      user: process.env.PGUSER || 'postgres',
      password: String(process.env.PGPASSWORD || ''),
    })

const { rows } = await pool.query(
  `SELECT m.id, m.cast_json
   FROM keywords_daily d
   JOIN movies m ON m.id = d.movie_id
   WHERE d.puzzle_date = CURRENT_DATE`,
)
if (!rows[0]) {
  console.log('sem filme hoje')
  await pool.end()
  process.exit(0)
}
const cj = rows[0].cast_json
const pt = (cj._keywords?.curatedPt || []).map((w) =>
  String(w)
    .replace(/[.,;:!?]+$/g, '')
    .trim(),
)
cj._keywords = { ...cj._keywords, curatedPt: pt }
await pool.query(`UPDATE movies SET cast_json = $2::jsonb WHERE id = $1`, [
  rows[0].id,
  JSON.stringify(cj),
])
console.log(pt.slice(0, 8))
await pool.end()
