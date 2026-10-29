import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const { Pool } = pg

function makePool() {
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.PGSSL === 'false'
          ? false
          : { rejectUnauthorized: false },
    })
  }

  const password = process.env.PGPASSWORD
  if (password === undefined || password === null || password === '') {
    console.error('Defina PGPASSWORD em server/.env (ou DATABASE_URL) e reinicie a API.')
  }

  return new Pool({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'cineblitz',
    user: process.env.PGUSER || 'postgres',
    password: password == null ? '' : String(password),
  })
}

export const pool = makePool()

export async function query(text, params) {
  return pool.query(text, params)
}
