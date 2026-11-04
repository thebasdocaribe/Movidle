/**
 * Zera progresso/conquistas de um user (teste).
 *   node scripts/reset_user_achievements.mjs thebas
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const username = String(process.argv[2] || '').trim()
if (!username) {
  console.error('Uso: node scripts/reset_user_achievements.mjs <username>')
  process.exit(1)
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

const pool = makePool()
const { rows } = await pool.query(
  `SELECT id, username FROM users WHERE lower(username) = lower($1)`,
  [username],
)
if (!rows[0]) {
  console.error('User não encontrado:', username)
  await pool.end()
  process.exit(1)
}
const id = rows[0].id
console.log('Resetando', rows[0].username, id)

await pool.query(`DELETE FROM user_cast_endless WHERE user_id = $1`, [id]).catch(() => {})
await pool.query(
  `UPDATE user_progress SET
     total_score = 0,
     first_try_streak = 0,
     wins = 0,
     updated_at = now()
   WHERE user_id = $1`,
  [id],
)
await pool.query(`DELETE FROM user_daily_plays WHERE user_id = $1`, [id]).catch(() => {})
await pool.query(`DELETE FROM user_cast_daily_plays WHERE user_id = $1`, [id]).catch(() => {})
await pool.query(
  `DELETE FROM user_character_daily_plays WHERE user_id = $1`,
  [id],
).catch(() => {})
await pool.query(
  `DELETE FROM user_whoami_daily_plays WHERE user_id = $1`,
  [id],
).catch(() => {})
await pool.query(
  `DELETE FROM user_keywords_daily_plays WHERE user_id = $1`,
  [id],
).catch(() => {})

console.log('OK — progresso e plays diários zerados (conquistas recalculam do zero)')
await pool.end()
