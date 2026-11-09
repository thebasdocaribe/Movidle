/**
 * Exporta crop_json dos personagens do banco LOCAL.
 * Uso (na pasta server/):
 *   node scripts/export_character_crops.mjs
 * Gera: server/data/character_crops_export.json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { query, pool } from '../src/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.join(__dirname, '../data/character_crops_export.json')

const { rows } = await query(
  `SELECT id::text AS id,
          name,
          name_pt,
          film_title,
          image_path,
          crop_json,
          movie_id::text AS movie_id
   FROM characters
   WHERE crop_json IS NOT NULL
     AND crop_json::text <> '{}'
     AND crop_json::text <> 'null'
   ORDER BY lower(name)`,
)

const payload = {
  exportedAt: new Date().toISOString(),
  count: rows.length,
  characters: rows.map((r) => ({
    id: r.id,
    name: r.name,
    namePt: r.name_pt,
    filmTitle: r.film_title,
    imagePath: r.image_path,
    movieId: r.movie_id,
    cropJson: r.crop_json,
  })),
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8')

console.log(`OK ${payload.count} personagens com crop → ${outPath}`)
await pool.end()
