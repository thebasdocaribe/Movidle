import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from '../src/db.js'
import { seedWhoamiPool } from '../src/whoamiPoolSeed.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const result = await seedWhoamiPool()
console.log(
  JSON.stringify(
    {
      catalogEntries: result.catalogEntries,
      uniqueMatched: result.uniqueMatched,
      flaggedInDb: result.flaggedInDb,
      missingCount: result.missingCount,
      missing: result.missing,
      matchedSample: result.matched.slice(0, 15),
      lowScore: result.matched.filter((m) => m.score < 85).slice(0, 30),
    },
    null,
    2,
  ),
)
await pool.end()
