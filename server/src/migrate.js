import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { seedCharacterCatalog } from './characterCatalog.js'
import { seedMoviesCatalog } from './moviesCatalog.js'
import { pool } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_DIR = path.join(__dirname, '../../db')

const MIGRATION_FILES = [
  'schema.sql',
  'auth.sql',
  'duel.sql',
  'daily_stats.sql',
  'cast_mode.sql',
  'cast_endless.sql',
  'character_mode.sql',
  'whoami_mode.sql',
  'keywords_mode.sql',
  'profile.sql',
  'daily_rotation.sql',
]

/** Clips em web/public/clips (vão pro dist no build). */
const CLIP_BY_TITLE = [
  ['Night of the Living Dead', '/clips/night-of-the-living-dead.mp4', 1968],
  ['Carnival of Souls', '/clips/carnival-of-souls.mp4'],
  ['Charade', '/clips/charade.mp4'],
  ['Detour', '/clips/detour.mp4'],
  ['D.O.A.', '/clips/doa.mp4'],
  ["The Brain That Wouldn't Die", '/clips/the-brain-that-wouldnt-die.mp4'],
  ['The Last Man on Earth', '/clips/the-last-man-on-earth.mp4'],
  ['Angel and the Badman', '/clips/angel-and-the-badman.mp4'],
  ['Beat the Devil', '/clips/beat-the-devil.mp4'],
  ['Nothing Sacred', '/clips/nothing-sacred.mp4'],
  ['Winnie-the-Pooh: Blood and Honey 2', '/clips/winnie-the-pooh-blood-and-honey-2.mp4'],
  ['Buddy', '/clips/buddy.mp4'],
  ['キュア', '/clips/cure.mp4'],
  ['The Ritual', '/clips/the-ritual.mp4'],
  ['Water Park Shark', '/clips/water-park-shark.mp4'],
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

    try {
      const movieStats = await seedMoviesCatalog(client)
      console.log(
        `[migrate] filmes catálogo: +${movieStats.inserted} novos, ${movieStats.updated} atualizados (${movieStats.total} no dump)`,
      )
    } catch (err) {
      console.warn('[migrate] seed filmes:', err.message)
    }

    for (const [title, clipPath, year] of CLIP_BY_TITLE) {
      await client.query(
        `UPDATE movies SET clip_path = $1
         WHERE lower(title) = lower($2)
           AND ($3::int IS NULL OR year = $3::int)
           AND (clip_path IS NULL OR clip_path = '')`,
        [clipPath, title, year ?? null],
      )
    }
    await client.query(
      `UPDATE movies SET clip_path = NULL
       WHERE title = 'Night of the Living Dead'
         AND year = 1990
         AND clip_path = '/clips/night-of-the-living-dead.mp4'`,
    )
    await client.query(
      `UPDATE movies SET clip_path = '/clips/reefer-madness.mp4'
       WHERE title ILIKE 'Reefer Madness%'
         AND (clip_path IS NULL OR clip_path = '')`,
    )
    console.log('[migrate] clip_path atualizado')

    try {
      const charStats = await seedCharacterCatalog(client)
      console.log(
        `[migrate] personagens: +${charStats.inserted} novos, ${charStats.updated} atualizados (${charStats.total} com foto, ${charStats.pending || 0} pendentes)`,
      )
    } catch (err) {
      console.warn('[migrate] seed personagens:', err.message)
    }
  } finally {
    client.release()
  }
}

// `node src/migrate.js` no server/
const isDirect =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isDirect) {
  migrate()
    .then(() => {
      console.log('[migrate] concluído')
      process.exit(0)
    })
    .catch((err) => {
      console.error('[migrate] falhou:', err)
      process.exit(1)
    })
}
