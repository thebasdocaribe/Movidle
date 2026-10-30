import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { seedCharacterCatalog } from './characterCatalog.js'
import { pool } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_DIR = path.join(__dirname, '../../db')

const MIGRATION_FILES = [
  'schema.sql',
  'auth.sql',
  'duel.sql',
  'daily_stats.sql',
  'cast_mode.sql',
  'character_mode.sql',
  'profile.sql',
]

/** Clips em web/public/clips (vão pro dist no build). */
const CLIP_BY_TITLE = [
  ['Night of the Living Dead', '/clips/night-of-the-living-dead.mp4'],
  ['Carnival of Souls', '/clips/carnival-of-souls.mp4'],
  ['Charade', '/clips/charade.mp4'],
  ['Detour', '/clips/detour.mp4'],
  ['D.O.A.', '/clips/doa.mp4'],
  ["The Brain That Wouldn't Die", '/clips/the-brain-that-wouldnt-die.mp4'],
  ['The Last Man on Earth', '/clips/the-last-man-on-earth.mp4'],
  ['Angel and the Badman', '/clips/angel-and-the-badman.mp4'],
  ['Beat the Devil', '/clips/beat-the-devil.mp4'],
  ['Nothing Sacred', '/clips/nothing-sacred.mp4'],
]

export async function migrate() {
  if (!process.env.DATABASE_URL && !process.env.PGPASSWORD) {
    console.warn('[migrate] Sem DATABASE_URL/PGPASSWORD — pulando.')
    return
  }

  const client = await pool.connect()
  try {
    for (const file of MIGRATION_FILES) {
      const full = path.join(DB_DIR, file)
      if (!fs.existsSync(full)) {
        console.warn(`[migrate] Arquivo ausente: ${file}`)
        continue
      }
      const sql = fs.readFileSync(full, 'utf8')
      await client.query(sql)
      console.log(`[migrate] OK ${file}`)
    }

    const { rows: countRows } = await client.query(
      'SELECT COUNT(*)::int AS n FROM movies',
    )
    if (countRows[0].n === 0) {
      const seedPath = path.join(DB_DIR, 'seed.sql')
      if (fs.existsSync(seedPath)) {
        await client.query(fs.readFileSync(seedPath, 'utf8'))
        console.log('[migrate] OK seed.sql (catálogo vazio)')
      }
    } else {
      console.log(`[migrate] catálogo já tem ${countRows[0].n} filmes`)
    }

    for (const [title, clipPath] of CLIP_BY_TITLE) {
      await client.query(
        `UPDATE movies SET clip_path = $1
         WHERE title = $2 AND (clip_path IS NULL OR clip_path = '')`,
        [clipPath, title],
      )
    }
    await client.query(
      `UPDATE movies SET clip_path = '/clips/reefer-madness.mp4'
       WHERE title ILIKE 'Reefer Madness%'
         AND (clip_path IS NULL OR clip_path = '')`,
    )
    console.log('[migrate] clip_path atualizado')

    try {
      const charStats = await seedCharacterCatalog(client)
      console.log(
        `[migrate] personagens: +${charStats.inserted} novos, ${charStats.updated} atualizados (${charStats.total} no catálogo)`,
      )
    } catch (err) {
      console.warn('[migrate] seed personagens:', err.message)
    }
  } finally {
    client.release()
  }
}
