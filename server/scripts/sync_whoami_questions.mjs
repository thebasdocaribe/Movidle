import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from '../src/db.js'
import {
  seedWhoamiCatalog,
  DEFAULT_QUESTIONS,
  WHOAMI_QUESTIONS_DEACTIVATE,
} from '../src/whoami.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

await seedWhoamiCatalog()
console.log(
  JSON.stringify(
    {
      activeSeed: DEFAULT_QUESTIONS.length,
      deactivated: WHOAMI_QUESTIONS_DEACTIVATE.length,
    },
    null,
    2,
  ),
)
await pool.end()
