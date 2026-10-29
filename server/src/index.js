import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import {
  authOptional,
  authRequired,
  consumeEmailVerifyToken,
  consumePasswordResetToken,
  createEmailVerifyToken,
  createPasswordResetToken,
  createUser,
  findUserByEmail,
  findUserByLogin,
  findUserByUsername,
  getProgress,
  getRank,
  hasPlayedDaily,
  isValidEmail,
  normalizeEmail,
  signToken,
  verifyPassword,
} from './auth.js'
import { query } from './db.js'
import {
  applyDuelGuess,
  createDuel,
  getDuelByCode,
  joinDuel,
  serializeDuel,
} from './duel.js'
import { sendPasswordResetEmail, sendVerifyEmail } from './mail.js'
import { matchesTitle, normalizeGuess } from './normalize.js'
import { scoreRound } from './scoring.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const app = express()
const PORT = Number(process.env.PORT || 3001)
/** Tentativa N toca os primeiros N segundos do MP4 (N takes de 1s concatenados). */
const TAKE_DURATIONS = [1, 2, 3, 4, 5, 6]
const POINTS_BY_TAKE = [100, 50, 25, 15, 10, 5]

app.use(cors())
app.use(express.json())
app.use(authOptional)

function todayBRT() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function isDateId(id) {
  return /^\d{4}-\d{2}-\d{2}$/.test(id)
}

async function getPuzzleByDate(dateStr) {
  const { rows } = await query(
    `SELECT d.puzzle_date::text AS puzzle_key,
            m.id AS movie_id,
            m.title,
            m.title_pt,
            m.aliases,
            m.poster_path,
            m.clip_path,
            m.attribution,
            m.year
     FROM daily_puzzles d
     JOIN movies m ON m.id = d.movie_id
     WHERE d.puzzle_date = $1::date`,
    [dateStr],
  )
  return rows[0] || null
}

function dayNumber(dateStr) {
  // meio-dia UTC evita bug de fuso no parse
  return Math.floor(Date.parse(`${dateStr}T12:00:00Z`) / 86400000)
}

/** Se não existe daily pra data, escolhe filme estável (mesmo pra todo mundo) e grava. */
async function ensureDailyPuzzle(dateStr) {
  const existing = await getPuzzleByDate(dateStr)
  if (existing) return existing

  const { rows: movies } = await query(
    `SELECT id
     FROM movies
     WHERE license = 'public_domain'
     ORDER BY title ASC`,
  )

  if (movies.length === 0) {
    const { rows: anyMovies } = await query(
      `SELECT id FROM movies ORDER BY title ASC`,
    )
    if (anyMovies.length === 0) return null
    movies.push(...anyMovies)
  }

  // Nunca repetir enquanto ainda houver filme não usado no histórico de dailies.
  // Quando o pool zerar, reinicia o ciclo.
  const { rows: used } = await query(
    `SELECT DISTINCT movie_id::text AS id
     FROM daily_puzzles
     WHERE puzzle_date < $1::date`,
    [dateStr],
  )
  const usedIds = new Set(used.map((r) => r.id))
  let pool = movies.filter((m) => !usedIds.has(String(m.id)))
  if (pool.length === 0) pool = movies

  const index = dayNumber(dateStr) % pool.length
  const movieId = pool[index].id

  await query(
    `INSERT INTO daily_puzzles (puzzle_date, movie_id)
     VALUES ($1::date, $2::uuid)
     ON CONFLICT (puzzle_date) DO NOTHING`,
    [dateStr, movieId],
  )

  return getPuzzleByDate(dateStr)
}

async function getMovieById(movieId) {
  const { rows } = await query(
    `SELECT id::text AS puzzle_key,
            id AS movie_id,
            title,
            title_pt,
            aliases,
            poster_path,
            clip_path,
            attribution,
            year
     FROM movies
     WHERE id = $1::uuid`,
    [movieId],
  )
  return rows[0] || null
}

async function resolvePuzzle(puzzleId) {
  if (isDateId(puzzleId)) return getPuzzleByDate(puzzleId)
  return getMovieById(puzzleId)
}

function publicPuzzle(puzzle, extra = {}) {
  const hasClip = Boolean(puzzle.clip_path)
  return {
    puzzleId: puzzle.puzzle_key,
    takeDurations: TAKE_DURATIONS,
    media: hasClip
      ? { type: 'video', url: puzzle.clip_path }
      : { type: 'image', url: puzzle.poster_path },
    posterUrl: puzzle.poster_path || null,
    attribution: puzzle.attribution || null,
    ...extra,
  }
}

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1')
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err.message) })
  }
})

app.get('/api/daily', async (req, res) => {
  try {
    const date = String(req.query.date || todayBRT())
    const puzzle = await ensureDailyPuzzle(date)
    if (!puzzle) {
      res.status(404).json({ error: 'Sem filmes no catálogo para montar o daily' })
      return
    }

    let alreadyPlayed = false
    if (req.user) {
      alreadyPlayed = await hasPlayedDaily(req.user.id, date)
    }

    res.json(
      publicPuzzle(puzzle, {
        mode: 'daily',
        date,
        puzzleId: date,
        alreadyPlayed,
      }),
    )
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

function isStrongPassword(password) {
  return (
    password.length >= 6 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    email: user.email,
    emailVerified: Boolean(user.email_verified),
  }
}

function appPublicUrl() {
  return (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')
}

async function issueVerifyEmail(user) {
  const raw = await createEmailVerifyToken(user.id)
  const verifyLink = `${appPublicUrl()}/?verify=${raw}`
  await sendVerifyEmail({
    toEmail: user.email,
    username: user.username,
    verifyLink,
  })
}

function verificationResponse({ created }) {
  return {
    ok: true,
    needsVerification: true,
    emailSent: true,
    message: created
      ? 'Conta criada. Confirme pelo link enviado ao seu e-mail (válido 1h).'
      : 'Conta ainda pendente. Reenviamos o link de confirmação pro e-mail.',
  }
}

app.get('/api/auth/check-username', async (req, res) => {
  try {
    const username = String(req.query.u || '').trim()
    if (username.length < 3 || username.length > 32) {
      res.json({ available: false, reason: 'length' })
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      res.json({ available: false, reason: 'chars' })
      return
    }
    const existing = await findUserByUsername(username)
    res.json({ available: !existing })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.post('/api/auth/register', async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim()
    const email = normalizeEmail(req.body?.email)
    const password = String(req.body?.password || '')
    const passwordConfirm = String(req.body?.passwordConfirm || '')

    if (username.length < 3 || username.length > 32) {
      res.status(400).json({ error: 'Usuário deve ter 3–32 caracteres' })
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      res.status(400).json({ error: 'Use só letras, números e _' })
      return
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'E-mail inválido' })
      return
    }
    if (!isStrongPassword(password)) {
      res.status(400).json({
        error:
          'Senha: mín. 6, 1 maiúscula, 1 número e 1 caractere especial',
      })
      return
    }
    if (password !== passwordConfirm) {
      res.status(400).json({ error: 'As senhas não coincidem' })
      return
    }

    const byUser = await findUserByUsername(username)
    const byEmail = await findUserByEmail(email)

    if (byUser?.email_verified) {
      res.status(409).json({ error: 'Nome de usuário já está em uso' })
      return
    }
    if (byEmail?.email_verified) {
      res.status(409).json({ error: 'E-mail já cadastrado' })
      return
    }

    // Conta pendente: não cria de novo — reenvia confirmação
    if (byEmail && !byEmail.email_verified) {
      await issueVerifyEmail(byEmail)
      res.status(200).json(verificationResponse({ created: false }))
      return
    }

    if (byUser && !byUser.email_verified) {
      res.status(409).json({
        error:
          'Esse usuário está reservado por uma conta ainda não confirmada',
      })
      return
    }

    const user = await createUser({ username, email, password })
    try {
      await issueVerifyEmail(user)
    } catch (mailErr) {
      await query('DELETE FROM users WHERE id = $1', [user.id])
      throw mailErr
    }

    res.status(201).json(verificationResponse({ created: true }))
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const login = String(req.body?.login || req.body?.username || '').trim()
    const password = String(req.body?.password || '')
    const user = await findUserByLogin(login)
    if (!user || !(await verifyPassword(user, password))) {
      res.status(401).json({ error: 'Usuário/e-mail ou senha inválidos' })
      return
    }
    if (!user.email_verified) {
      res.status(403).json({
        error: 'Confirme seu e-mail antes de entrar',
        code: 'EMAIL_NOT_VERIFIED',
      })
      return
    }
    const token = signToken(user)
    const progress = await getProgress(user.id)
    res.json({
      token,
      user: publicUser(user),
      progress,
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const token = String(req.body?.token || '')
    if (!token) {
      res.status(400).json({ error: 'Token inválido' })
      return
    }
    const user = await consumeEmailVerifyToken(token)
    if (!user) {
      res.status(400).json({ error: 'Link expirado ou inválido' })
      return
    }
    const jwtToken = signToken(user)
    const progress = await getProgress(user.id)
    res.json({
      token: jwtToken,
      user: publicUser(user),
      progress,
      message: 'E-mail confirmado!',
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email)
    if (!isValidEmail(email)) {
      res.json({
        ok: true,
        message:
          'Se o e-mail existir e ainda não estiver confirmado, reenviamos o link.',
      })
      return
    }
    const user = await findUserByEmail(email)
    if (user && !user.email_verified) {
      await issueVerifyEmail(user)
      res.json(verificationResponse({ created: false }))
      return
    }
    res.json({
      ok: true,
      message:
        'Se o e-mail existir e ainda não estiver confirmado, reenviamos o link.',
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email)
    const generic = {
      ok: true,
      message:
        'Se o e-mail estiver cadastrado, enviamos um link de recuperação.',
    }
    if (!isValidEmail(email)) {
      res.json(generic)
      return
    }

    const user = await findUserByEmail(email)
    if (!user) {
      res.json(generic)
      return
    }

    const resetToken = await createPasswordResetToken(user.id)
    const resetLink = `${appPublicUrl()}/?reset=${resetToken}`

    await sendPasswordResetEmail({
      toEmail: user.email,
      username: user.username,
      resetLink,
    })

    res.json(generic)
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const token = String(req.body?.token || '')
    const password = String(req.body?.password || '')
    if (!token) {
      res.status(400).json({ error: 'Token inválido' })
      return
    }
    if (!isStrongPassword(password)) {
      res.status(400).json({
        error:
          'Senha: mín. 6, 1 maiúscula, 1 número e 1 caractere especial',
      })
      return
    }
    const userId = await consumePasswordResetToken(token, password)
    if (!userId) {
      res.status(400).json({ error: 'Link expirado ou inválido' })
      return
    }
    res.json({ ok: true, message: 'Senha atualizada. Faça login.' })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.get('/api/me', authRequired, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, username, display_name, email, email_verified
       FROM users WHERE id = $1`,
      [req.user.id],
    )
    const user = rows[0]
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' })
      return
    }
    const progress = await getProgress(user.id)
    const alreadyPlayed = await hasPlayedDaily(user.id, todayBRT())
    res.json({
      user: publicUser(user),
      progress,
      dailyPlayedToday: alreadyPlayed,
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.get('/api/rank', async (req, res) => {
  try {
    const mode = req.query.mode === 'classic' ? 'classic' : 'daily'
    const rows = await getRank(mode, 30)
    res.json({
      mode,
      entries: rows.map((r, i) => ({
        rank: i + 1,
        name: r.name,
        username: r.username,
        score: r.score,
        streak: r.streak,
      })),
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

/** Fecha o round autenticado: aplica mult no server, grava score e daily 1x */
app.post('/api/round/finish', authRequired, async (req, res) => {
  try {
    const mode = req.body?.mode === 'classic' ? 'classic' : 'daily'
    const puzzleId = String(req.body?.puzzleId || '')
    const outcome = req.body?.outcome === 'win' ? 'win' : 'lose'
    const take = Number(req.body?.take)

    if (!puzzleId || !Number.isInteger(take) || take < 1 || take > 6) {
      res.status(400).json({ error: 'Dados inválidos' })
      return
    }

    const puzzle = await resolvePuzzle(puzzleId)
    if (!puzzle) {
      res.status(404).json({ error: 'Puzzle não encontrado' })
      return
    }

    if (mode === 'daily') {
      const date = isDateId(puzzleId) ? puzzleId : todayBRT()
      if (await hasPlayedDaily(req.user.id, date)) {
        res.status(409).json({ error: 'Você já jogou o daily de hoje' })
        return
      }
    }

    const { rows: progRows } = await query(
      `SELECT total_score, first_try_streak, wins
       FROM user_progress WHERE user_id = $1 AND mode = $2`,
      [req.user.id, mode],
    )
    let totalScore = progRows[0]?.total_score ?? 0
    let firstTryStreak = progRows[0]?.first_try_streak ?? 0
    let wins = progRows[0]?.wins ?? 0

    const scored = scoreRound({
      won: outcome === 'win',
      take,
      firstTryStreak,
    })

    totalScore += scored.points
    firstTryStreak = scored.nextStreak
    if (outcome === 'win') wins += 1

    await query(
      `INSERT INTO user_progress (user_id, mode, total_score, first_try_streak, wins, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (user_id, mode) DO UPDATE SET
         total_score = EXCLUDED.total_score,
         first_try_streak = EXCLUDED.first_try_streak,
         wins = EXCLUDED.wins,
         updated_at = now()`,
      [req.user.id, mode, totalScore, firstTryStreak, wins],
    )

    if (mode === 'daily') {
      const date = isDateId(puzzleId) ? puzzleId : todayBRT()
      await query(
        `INSERT INTO user_daily_plays (user_id, puzzle_date, won, take, points)
         VALUES ($1, $2::date, $3, $4, $5)
         ON CONFLICT (user_id, puzzle_date) DO NOTHING`,
        [req.user.id, date, outcome === 'win', take, scored.points],
      )
    }

    const progress = await getProgress(req.user.id)
    res.json({
      points: scored.points,
      multiplier: scored.multiplier,
      progress,
      title: puzzle.title,
      titlePt: puzzle.title_pt,
      year: puzzle.year,
      posterUrl: puzzle.poster_path,
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

/** Clássico / infinito: prioriza filmes com clip; ciclo reinicia quando acaba o pool */
app.get('/api/classic/next', async (req, res) => {
  try {
    const exclude = String(req.query.exclude || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    async function pick(withClipOnly, useExclude) {
      const params = []
      const where = []
      if (withClipOnly) where.push(`clip_path IS NOT NULL`)
      if (useExclude && exclude.length > 0) {
        params.push(exclude)
        where.push(`NOT (id::text = ANY($${params.length}::text[]))`)
      }
      const sql = `
        SELECT id::text AS puzzle_key,
               id AS movie_id,
               title,
               title_pt,
               aliases,
               poster_path,
               clip_path,
               attribution,
               year
        FROM movies
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY random()
        LIMIT 1`
      const { rows } = await query(sql, params)
      return rows[0] || null
    }

    // 1) clip ainda não jogado nesta sessão
    // 2) reinicia ciclo só com clips
    // 3) fallback: qualquer filme (poster)
    const puzzle =
      (await pick(true, true)) ||
      (await pick(true, false)) ||
      (await pick(false, true)) ||
      (await pick(false, false))

    if (!puzzle) {
      res.status(404).json({ error: 'Sem mais filmes no catálogo' })
      return
    }

    res.json(
      publicPuzzle(puzzle, {
        mode: 'classic',
        movieId: puzzle.movie_id,
      }),
    )
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.get('/api/autocomplete', async (req, res) => {
  try {
    const q = normalizeGuess(req.query.q)
    if (!q || q.length < 1) {
      res.json({ suggestions: [] })
      return
    }

    const { rows } = await query(
      `SELECT title, title_pt, year, aliases
       FROM movies
       ORDER BY title ASC`,
    )

    const scored = []
    for (const row of rows) {
      const candidates = [row.title, row.title_pt, ...(row.aliases || [])].filter(
        Boolean,
      )
      let best = null
      for (const c of candidates) {
        const n = normalizeGuess(c)
        if (!n.includes(q) && !n.startsWith(q)) continue
        const starts = n.startsWith(q)
        const rank = starts ? 0 : 1
        if (!best || rank < best.rank || (rank === best.rank && n < best.norm)) {
          best = { label: c, norm: n, rank }
        }
      }
      if (best) {
        scored.push({
          title: row.title,
          titlePt: row.title_pt,
          year: row.year,
          label: row.year != null ? `${best.label} (${row.year})` : best.label,
          rank: best.rank,
          sortKey: best.norm,
        })
      }
    }

    scored.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank
      return a.sortKey.localeCompare(b.sortKey)
    })

    res.json({
      suggestions: scored.slice(0, 10).map(({ title, titlePt, year, label }) => ({
        title,
        titlePt,
        year,
        label,
      })),
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.post('/api/guess', async (req, res) => {
  try {
    const puzzleId = String(req.body?.puzzleId || '')
    const attempt = Number(req.body?.attempt)
    const guess = String(req.body?.guess || '')

    if (!puzzleId || !Number.isInteger(attempt) || attempt < 1 || attempt > 6) {
      res.status(400).json({ error: 'puzzleId e attempt (1-6) obrigatórios' })
      return
    }

    const puzzle = await resolvePuzzle(puzzleId)
    if (!puzzle) {
      res.status(404).json({ error: 'Puzzle não encontrado' })
      return
    }

    const correct = matchesTitle(guess, puzzle)
    const points = correct ? POINTS_BY_TAKE[attempt - 1] : 0
    const reveal = correct || attempt === 6

    res.json({
      correct,
      points: correct ? points : 0,
      ...(reveal
        ? {
            title: puzzle.title,
            titlePt: puzzle.title_pt,
            year: puzzle.year,
            posterUrl: puzzle.poster_path,
          }
        : {}),
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.post('/api/give-up', async (req, res) => {
  try {
    const puzzleId = String(req.body?.puzzleId || '')
    if (!puzzleId) {
      res.status(400).json({ error: 'puzzleId obrigatório' })
      return
    }

    const puzzle = await resolvePuzzle(puzzleId)
    if (!puzzle) {
      res.status(404).json({ error: 'Puzzle não encontrado' })
      return
    }

    res.json({
      points: 0,
      title: puzzle.title,
      titlePt: puzzle.title_pt,
      year: puzzle.year,
      posterUrl: puzzle.poster_path,
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

/** ---- Duelo 1v1 ---- */
app.post('/api/duel/create', authRequired, async (req, res) => {
  try {
    const duel = await createDuel({
      hostId: req.user.id,
      hostUsername: req.user.username,
    })
    res.status(201).json(await serializeDuel(duel, req.user.id))
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.post('/api/duel/:code/join', authRequired, async (req, res) => {
  try {
    const duel = await getDuelByCode(req.params.code)
    if (!duel) {
      res.status(404).json({ error: 'Sala não encontrada' })
      return
    }
    const updated = await joinDuel(duel, {
      guestId: req.user.id,
      guestUsername: req.user.username,
    })
    res.json(await serializeDuel(updated, req.user.id))
  } catch (err) {
    res.status(err.status || 500).json({ error: String(err.message) })
  }
})

app.get('/api/duel/:code', authRequired, async (req, res) => {
  try {
    const duel = await getDuelByCode(req.params.code)
    if (!duel) {
      res.status(404).json({ error: 'Sala não encontrada' })
      return
    }
    const member =
      req.user.id === duel.host_id || req.user.id === duel.guest_id
    if (!member) {
      res.status(403).json({ error: 'Você não está nesta sala' })
      return
    }
    res.json(await serializeDuel(duel, req.user.id))
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.post('/api/duel/:code/act', authRequired, async (req, res) => {
  try {
    const duel = await getDuelByCode(req.params.code)
    if (!duel) {
      res.status(404).json({ error: 'Sala não encontrada' })
      return
    }
    const member =
      req.user.id === duel.host_id || req.user.id === duel.guest_id
    if (!member) {
      res.status(403).json({ error: 'Você não está nesta sala' })
      return
    }
    const guess = String(req.body?.guess ?? '')
    const updated = await applyDuelGuess(duel, {
      userId: req.user.id,
      guess,
    })
    res.json(await serializeDuel(updated, req.user.id))
  } catch (err) {
    res.status(err.status || 500).json({ error: String(err.message) })
  }
})

// Produção (Railway): serve o build do Vite (API + front na mesma URL)
const distPath = path.join(__dirname, '../../web/dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`API cineblitz em http://localhost:${PORT}`)
})
