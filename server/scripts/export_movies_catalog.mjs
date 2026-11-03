/**
 * Exporta movies do DB local → server/data/movies_catalog.json
 * (pro seed no deploy)
 */
import dotenv from 'dotenv'
dotenv.config()
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const out = path.resolve(__dirname, '../data/movies_catalog.json')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const { rows } = await pool.query(`
  SELECT title, title_pt, year, aliases, license, source_url, attribution,
         poster_path, poster_wide_path, clip_path, director, cast_json
  FROM movies
  ORDER BY year NULLS LAST, title
`)
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify(rows, null, 0))
console.log(`Exportados ${rows.length} filmes → ${out}`)
console.log(`Tamanho: ${(fs.statSync(out).size / 1024 / 1024).toFixed(2)} MB`)
await pool.end()
