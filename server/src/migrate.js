import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_DIR = path.join(__dirname, '../../db')

const MIGRATION_FILES = [
  'schema.sql',
  'auth.sql',
  'duel.sql',
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
  } finally {
    client.release()
  }
}
