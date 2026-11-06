import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { query, pool } from '../src/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const { rows: dailies } = await query(
  `SELECT d.puzzle_date::text AS day, m.title, m.title_pt, m.id::text AS id
   FROM cast_daily d
   JOIN movies m ON m.id = d.movie_id
   ORDER BY d.puzzle_date`,
)
const byId = new Map()
for (const r of dailies) {
  const list = byId.get(r.id) || []
  list.push(r.day)
  byId.set(r.id, list)
}
const dups = [...byId.entries()].filter(([, days]) => days.length > 1)
console.log('cast_daily days', dailies.length, 'unique movies', byId.size, 'repeated', dups.length)
for (const [, days] of dups.slice(0, 15)) {
  const sample = dailies.find((d) => d.day === days[0])
  console.log(' ', sample?.title_pt || sample?.title, days.join(', '))
}
console.log('recent:')
for (const r of dailies.slice(-8)) {
  console.log(' ', r.day, r.title_pt || r.title)
}

const { rows: used } = await query(
  `SELECT count(*)::int AS n FROM daily_pool_used WHERE mode = 'cast'`,
)
console.log('cast pool used', used[0]?.n)
await pool.end()
