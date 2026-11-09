/**
 * Importa crop_json pro banco de PRODUÇÃO (ou qualquer TARGET).
 *
 * 1) Exporte local:  node scripts/export_character_crops.mjs
 * 2) Pegue a External Database URL no Render (cineblitz-db).
 * 3) Rode (PowerShell, pasta server/):
 *
 *   $env:TARGET_DATABASE_URL="postgres://USER:PASS@HOST/cineblitz"
 *   node scripts/import_character_crops.mjs
 *
 * Casa por: image_path → id → name+film_title
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const targetUrl =
  process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL || ''
if (!targetUrl) {
  console.error(
    'Defina TARGET_DATABASE_URL (External URL do Render) e rode de novo.',
  )
  process.exit(1)
}

const inPath =
  process.argv[2] ||
  path.join(__dirname, '../data/character_crops_export.json')

if (!fs.existsSync(inPath)) {
  console.error('Arquivo não encontrado:', inPath)
  console.error('Rode antes: node scripts/export_character_crops.mjs')
  process.exit(1)
}

const payload = JSON.parse(fs.readFileSync(inPath, 'utf8'))
const list = payload.characters || []
if (!list.length) {
  console.error('Export vazio')
  process.exit(1)
}

const pool = new pg.Pool({
  connectionString: targetUrl,
  ssl: { rejectUnauthorized: false },
})

let updated = 0
let missing = 0
const missingRows = []

for (const ch of list) {
  const crop = ch.cropJson
  if (!crop || typeof crop !== 'object') continue

  let row = null
  if (ch.imagePath) {
    const { rows } = await pool.query(
      `UPDATE characters
       SET crop_json = $2::jsonb
       WHERE image_path = $1
       RETURNING id::text AS id, name`,
      [ch.imagePath, JSON.stringify(crop)],
    )
    row = rows[0]
  }
  if (!row && ch.id) {
    const { rows } = await pool.query(
      `UPDATE characters
       SET crop_json = $2::jsonb
       WHERE id::text = $1
       RETURNING id::text AS id, name`,
      [ch.id, JSON.stringify(crop)],
    )
    row = rows[0]
  }
  if (!row && ch.name) {
    const { rows } = await pool.query(
      `UPDATE characters
       SET crop_json = $3::jsonb
       WHERE lower(name) = lower($1)
         AND (
           ($2::text IS NULL AND film_title IS NULL)
           OR lower(coalesce(film_title, '')) = lower(coalesce($2, ''))
         )
       RETURNING id::text AS id, name`,
      [ch.name, ch.filmTitle || null, JSON.stringify(crop)],
    )
    row = rows[0]
  }

  if (row) {
    updated += 1
  } else {
    missing += 1
    missingRows.push({
      name: ch.name,
      filmTitle: ch.filmTitle,
      imagePath: ch.imagePath,
    })
  }
}

console.log(
  JSON.stringify(
    {
      source: inPath,
      total: list.length,
      updated,
      missing,
      sampleMissing: missingRows.slice(0, 15),
    },
    null,
    2,
  ),
)

await pool.end()
if (missing > 0) process.exitCode = 2
