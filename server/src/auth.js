import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { query } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'cineblitz-dev-secret-change-me'
const TOKEN_TTL_MS = 60 * 60 * 1000

const USER_COLS = `id, username, display_name, email, email_verified, password_hash`

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '30d' },
  )
}

export function authOptional(req, _res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    req.user = null
    next()
    return
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = { id: payload.sub, username: payload.username }
  } catch {
    req.user = null
  }
  next()
}

export function authRequired(req, res, next) {
  authOptional(req, res, () => {
    if (!req.user) {
      res.status(401).json({ error: 'Faça login' })
      return
    }
    next()
  })
}

export function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function findUserByUsername(username) {
  const { rows } = await query(
    `SELECT ${USER_COLS}
     FROM users WHERE lower(username) = lower($1)`,
    [username],
  )
  return rows[0] || null
}

export async function findUserByEmail(email) {
  const { rows } = await query(
    `SELECT ${USER_COLS}
     FROM users WHERE lower(email) = lower($1)`,
    [normalizeEmail(email)],
  )
  return rows[0] || null
}

export async function findUserByLogin(login) {
  const value = String(login || '').trim()
  if (!value) return null
  if (value.includes('@')) return findUserByEmail(value)
  return findUserByUsername(value)
}

export async function findUserById(id) {
  const { rows } = await query(
    `SELECT ${USER_COLS} FROM users WHERE id = $1`,
    [id],
  )
  return rows[0] || null
}

export async function createUser({ username, email, password }) {
  const hash = await bcrypt.hash(password, 10)
  const name = username.trim()
  const mail = normalizeEmail(email)
  const { rows } = await query(
    `INSERT INTO users (username, display_name, email, password_hash, email_verified)
     VALUES ($1, $2, $3, $4, true)
     RETURNING ${USER_COLS}`,
    [name, name, mail, hash],
  )
  const user = rows[0]
  await query(
    `INSERT INTO user_progress (user_id, mode) VALUES
     ($1, 'daily'), ($1, 'classic'), ($1, 'cast')
     ON CONFLICT DO NOTHING`,
    [user.id],
  )
  return user
}

export async function verifyPassword(user, password) {
  return bcrypt.compare(password, user.password_hash)
}

function hashOpaqueToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

async function createOpaqueToken(table, userId) {
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashOpaqueToken(token)
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)
  await query(
    `UPDATE ${table} SET used_at = now()
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  )
  await query(
    `INSERT INTO ${table} (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt.toISOString()],
  )
  return token
}

export async function createPasswordResetToken(userId) {
  return createOpaqueToken('password_reset_tokens', userId)
}

export async function createEmailVerifyToken(userId) {
  return createOpaqueToken('email_verify_tokens', userId)
}

export async function consumePasswordResetToken(token, newPassword) {
  const tokenHash = hashOpaqueToken(token)
  const { rows } = await query(
    `SELECT id, user_id FROM password_reset_tokens
     WHERE token_hash = $1
       AND used_at IS NULL
       AND expires_at > now()`,
    [tokenHash],
  )
  const row = rows[0]
  if (!row) return null

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
    passwordHash,
    row.user_id,
  ])
  await query(
    `UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`,
    [row.id],
  )
  return row.user_id
}

export async function consumeEmailVerifyToken(token) {
  const tokenHash = hashOpaqueToken(token)
  const { rows } = await query(
    `SELECT id, user_id FROM email_verify_tokens
     WHERE token_hash = $1
       AND used_at IS NULL
       AND expires_at > now()`,
    [tokenHash],
  )
  const row = rows[0]
  if (!row) return null

  await query(
    `UPDATE users SET email_verified = true WHERE id = $1`,
    [row.user_id],
  )
  await query(
    `UPDATE email_verify_tokens SET used_at = now() WHERE id = $1`,
    [row.id],
  )
  return findUserById(row.user_id)
}

export async function getProgress(userId) {
  const { rows } = await query(
    `SELECT mode, total_score, first_try_streak, wins
     FROM user_progress WHERE user_id = $1`,
    [userId],
  )
  const empty = { totalScore: 0, firstTryStreak: 0, wins: 0 }
  const out = {
    daily: { ...empty },
    classic: { ...empty },
    cast: { ...empty },
    character: { ...empty },
  }
  for (const row of rows) {
    if (out[row.mode]) {
      out[row.mode] = {
        totalScore: row.total_score,
        firstTryStreak: row.first_try_streak,
        wins: row.wins,
      }
    }
  }
  return out
}

export async function getRank(mode, limit = 20) {
  // Daily: quem já jogou o daily aparece (mesmo com 0 pts / derrota)
  if (mode === 'daily') {
    const { rows } = await query(
      `SELECT u.username AS name,
              u.username,
              p.total_score AS score,
              p.first_try_streak AS streak
       FROM user_progress p
       JOIN users u ON u.id = p.user_id
       WHERE p.mode = 'daily'
         AND EXISTS (
           SELECT 1 FROM user_daily_plays d WHERE d.user_id = p.user_id
         )
       ORDER BY p.total_score DESC, p.updated_at ASC
       LIMIT $1`,
      [limit],
    )
    return rows
  }

  if (mode === 'cast') {
    const { rows } = await query(
      `SELECT u.username AS name,
              u.username,
              p.total_score AS score,
              p.first_try_streak AS streak
       FROM user_progress p
       JOIN users u ON u.id = p.user_id
       WHERE p.mode = 'cast'
         AND EXISTS (
           SELECT 1 FROM user_cast_daily_plays d WHERE d.user_id = p.user_id
         )
       ORDER BY p.total_score DESC, p.updated_at ASC
       LIMIT $1`,
      [limit],
    )
    return rows
  }

  const { rows } = await query(
    `SELECT u.username AS name,
            u.username,
            p.total_score AS score,
            p.first_try_streak AS streak
     FROM user_progress p
     JOIN users u ON u.id = p.user_id
     WHERE p.mode = $1 AND (p.total_score > 0 OR p.wins > 0)
     ORDER BY p.total_score DESC, p.updated_at ASC
     LIMIT $2`,
    [mode, limit],
  )
  return rows
}

export async function hasPlayedDaily(userId, dateStr) {
  const { rows } = await query(
    `SELECT 1 FROM user_daily_plays
     WHERE user_id = $1 AND puzzle_date = $2::date`,
    [userId, dateStr],
  )
  return rows.length > 0
}

export async function hasPlayedCastDaily(userId, dateStr) {
  const { rows } = await query(
    `SELECT 1 FROM user_cast_daily_plays
     WHERE user_id = $1 AND puzzle_date = $2::date`,
    [userId, dateStr],
  )
  return rows.length > 0
}
