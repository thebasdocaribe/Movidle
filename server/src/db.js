import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const { Pool } = pg

const password = process.env.PGPASSWORD
if (password === undefined || password === null || password === '') {
  console.error('Defina PGPASSWORD em server/.env e reinicie a API.')
}

export const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'cineblitz',
  user: process.env.PGUSER || 'postgres',
  password: password == null ? '' : String(password),
})

export async function query(text, params) {
  return pool.query(text, params)
}
