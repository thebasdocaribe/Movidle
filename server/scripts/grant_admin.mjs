/**
 * Marca username como admin. Uso: node scripts/grant_admin.mjs thebas_do_caribe
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { query, pool } from '../src/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sqlPath = path.join(__dirname, '../../db/admin.sql')
await query(fs.readFileSync(sqlPath, 'utf8'))

const username = String(process.argv[2] || 'thebas_do_caribe').trim()
if (!username) {
  console.error('Passe o username')
  process.exit(1)
}

const { rows } = await query(
  `UPDATE users SET is_admin = true
   WHERE lower(username) = lower($1)
   RETURNING id::text AS id, username, is_admin`,
  [username],
)

if (!rows[0]) {
  console.error('Usuário não encontrado:', username)
  process.exit(1)
}

console.log(JSON.stringify(rows[0], null, 2))
await pool.end()
