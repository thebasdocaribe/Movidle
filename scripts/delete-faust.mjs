import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { query } from '../server/src/db.js'

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../server/.env') })

const r = await query(
  `DELETE FROM characters
   WHERE lower(name) = 'faust' OR lower(name_pt) = 'fausto'
   RETURNING name`,
)
console.log('removed', r.rows)
process.exit(0)
