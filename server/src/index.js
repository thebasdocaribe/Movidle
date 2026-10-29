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
  hasPlayedCastDaily,
  hasPlayedDaily,
  isValidEmail,
  normalizeEmail,
  signToken,
  verifyPassword,
} from './auth.js'
import { query } from './db.js'
import { enrichHintsWithTmdb, tmdbConfigured } from './tmdb.js'
import {
  applyDuelGuess,
  createDuel,
  getDuelByCode,
  joinDuel,
  serializeDuel,
} from './duel.js'
import {
  sendBugReportEmail,
  sendPasswordResetEmail,
  sendVerifyEmail,
} from './mail.js'
import { migrate } from './migrate.js'
import { matchesCharacter, matchesTitle, normalizeGuess } from './normalize.js'
import { CAST_POINTS, scoreRound } from './scoring.js'

const CHARACTER_MAX_TAKE = 6
const CHARACTER_POINTS = CAST_POINTS

async function countDailySolved(dateStr) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS n
     FROM user_daily_plays
     WHERE puzzle_date = $1::date AND won = true`,
    [dateStr],
  )
  return rows[0]?.n ?? 0
}

async function recordDailyGuess({
  dateStr,
  userId,
  guessRaw,
  guessNorm,
  correct,
}) {
  if (!guessNorm) return 0
  if (userId) {
    await query(
      `INSERT INTO daily_guesses (puzzle_date, user_id, guess_norm, guess_raw, correct)
       SELECT $1::date, $2::uuid, $3, $4, $5
       WHERE NOT EXISTS (
         SELECT 1 FROM daily_guesses
         WHERE puzzle_date = $1::date
           AND user_id = $2::uuid
           AND guess_norm = $3
       )`,
      [dateStr, userId, guessNorm, guessRaw, correct],
    )
  } else {
    await query(
      `INSERT INTO daily_guesses (puzzle_date, user_id, guess_norm, guess_raw, correct)
       VALUES ($1::date, NULL, $2, $3, $4)`,
      [dateStr, guessNorm, guessRaw, correct],
    )
  }
  const { rows } = await query(
    `SELECT COUNT(DISTINCT COALESCE(user_id::text, id::text))::int AS n
     FROM daily_guesses
     WHERE puzzle_date = $1::date AND guess_norm = $2`,
    [dateStr, guessNorm],
  )
  return rows[0]?.n ?? 0
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const app = express()
const PORT = Number(process.env.PORT || 3001)
/** Tentativa N toca os primeiros N segundos do MP4 (N takes de 1s concatenados). */
const TAKE_DURATIONS = [1, 2, 3, 4, 5, 6]
const POINTS_BY_TAKE = [100, 50, 25, 15, 10, 5]
const CAST_MAX_TAKE = 7

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
  try {
    const { rows } = await query(
      `SELECT d.puzzle_date::text AS puzzle_key,
              m.id AS movie_id,
              m.title,
              m.title_pt,
              m.aliases,
              m.poster_path,
              m.clip_path,
              m.attribution,
            m.year,
            m.director,
            m.cast_json,
            m.poster_wide_path
     FROM daily_puzzles d
     JOIN movies m ON m.id = d.movie_id
     WHERE d.puzzle_date = $1::date`,
      [dateStr],
    )
    return rows[0] || null
  } catch (err) {
    // Schema antigo sem director/cast_json — migrate ainda não rodou
    console.warn('[daily] fallback sem cast cols:', err.message)
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
}

function dayNumber(dateStr) {
  // meio-dia UTC evita bug de fuso no parse
  return Math.floor(Date.parse(`${dateStr}T12:00:00Z`) / 86400000)
}

/** Se não existe daily pra data, escolhe filme estável (mesmo pra todo mundo) e grava. */
async function moviesWithClips() {
  const { rows } = await query(
    `SELECT id
     FROM movies
     WHERE clip_path IS NOT NULL AND clip_path <> ''
     ORDER BY title ASC`,
  )
  return rows
}

/** Clássico diário: só filmes com clipe (não pôster). */
async function ensureDailyPuzzle(dateStr) {
  const existing = await getPuzzleByDate(dateStr)
  if (existing?.clip_path) return existing

  const movies = await moviesWithClips()
  if (movies.length === 0) {
    // Sem clips no banco — devolve o que tiver (dev/seed incompleto)
    if (existing) return existing
    return null
  }

  // Nunca repetir enquanto ainda houver filme com clip não usado.
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

  if (existing && !existing.clip_path) {
    // Corrige dia antigo sorteado sem clipe (calendário / seed)
    await query(
      `UPDATE daily_puzzles SET movie_id = $2::uuid WHERE puzzle_date = $1::date`,
      [dateStr, movieId],
    )
  } else {
    await query(
      `INSERT INTO daily_puzzles (puzzle_date, movie_id)
       VALUES ($1::date, $2::uuid)
       ON CONFLICT (puzzle_date) DO NOTHING`,
      [dateStr, movieId],
    )
  }

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
            year,
            director,
            cast_json,
            poster_wide_path
     FROM movies
     WHERE id = $1::uuid`,
    [movieId],
  )
  return rows[0] || null
}

function slugifyPerson(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function personThumb(name, imageUrl) {
  if (imageUrl) return imageUrl
  if (!name || name === '—') return null
  return `/cast/${slugifyPerson(name)}.jpg`
}

function creditName(entry, emptyLabel) {
  if (entry == null) return emptyLabel
  if (typeof entry === 'string') return entry
  if (entry.none) return emptyLabel
  return entry.name || emptyLabel
}

function creditImage(entry) {
  if (!entry || typeof entry === 'string') return null
  return entry.image_url || entry.imageUrl || null
}

/** 7 slots fixos estilo Loldle — ordem = ordem das dicas */
function buildCastHints(puzzle) {
  const raw = puzzle.cast_json
  const meta =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}

  // Compat: cast_json antigo era array de {role,name}
  if (Array.isArray(raw) && raw.length > 0) {
    const byRole = Object.fromEntries(
      raw.map((c) => [c.role, c]).filter(([r]) => r),
    )
    return [
      {
        kind: 'director',
        label: 'Diretor',
        name: puzzle.director || '—',
        imageUrl: null,
      },
      {
        kind: 'screenwriter',
        label: 'Roteirista',
        name: '—',
        imageUrl: null,
      },
      {
        kind: 'protagonist',
        label: 'Protagonista',
        name: byRole.protagonista?.name || '—',
        imageUrl: byRole.protagonista?.image_url || null,
      },
      {
        kind: 'antagonist',
        label: 'Antagonista',
        name: byRole.antagonista?.name || 'Sem antagonista',
        imageUrl: byRole.antagonista?.image_url || null,
        empty: !byRole.antagonista,
      },
      {
        kind: 'secondary',
        label: 'Secundário',
        name: byRole.secundario?.name || '—',
        imageUrl: byRole.secundario?.image_url || null,
      },
      {
        kind: 'year',
        label: 'Ano',
        name: puzzle.year != null ? String(puzzle.year) : '—',
        imageUrl: null,
      },
      {
        kind: 'region',
        label: 'Origem',
        name: '—',
        imageUrl: null,
      },
    ]
  }

  const ant = meta.antagonist
  const hasAntagonist = ant != null && ant !== false && !ant?.none

  const dirName = puzzle.director || '—'
  const swName = creditName(meta.screenwriter, '—')
  const proName = creditName(meta.protagonist, '—')
  const secName = creditName(meta.secondary, '—')
  const antName = hasAntagonist ? creditName(ant, '—') : 'Sem antagonista'

  return [
    {
      kind: 'director',
      label: 'Diretor',
      name: dirName,
      imageUrl: personThumb(dirName, meta.director_image_url || null),
    },
    {
      kind: 'screenwriter',
      label: 'Roteirista',
      name: swName,
      imageUrl: personThumb(swName, creditImage(meta.screenwriter)),
    },
    {
      kind: 'protagonist',
      label: 'Protagonista',
      name: proName,
      imageUrl: personThumb(proName, creditImage(meta.protagonist)),
    },
    {
      kind: 'antagonist',
      label: 'Antagonista',
      name: antName,
      imageUrl: hasAntagonist
        ? personThumb(antName, creditImage(ant))
        : null,
      empty: !hasAntagonist,
    },
    {
      kind: 'secondary',
      label: 'Secundário',
      name: secName,
      imageUrl: personThumb(secName, creditImage(meta.secondary)),
    },
    {
      kind: 'year',
      label: 'Ano',
      name: puzzle.year != null ? String(puzzle.year) : '—',
      imageUrl: null,
    },
    {
      kind: 'region',
      label: 'Origem',
      name: creditName(meta.region, '—'),
      imageUrl: null,
    },
  ]
}

async function publicCastPuzzle(puzzle, extra = {}) {
  const hints = await enrichHintsWithTmdb(buildCastHints(puzzle))
  return {
    puzzleId: puzzle.puzzle_key || String(puzzle.movie_id || puzzle.id || ''),
    mode: 'cast',
    posterUrl: puzzle.poster_wide_path || puzzle.poster_path || null,
    posterPortrait: puzzle.poster_path || null,
    attribution: puzzle.attribution || null,
    maxTakes: CAST_MAX_TAKE,
    hints,
    tmdb: tmdbConfigured(),
    ...extra,
  }
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

    const solvedCount = await countDailySolved(date)

    res.json(
      publicPuzzle(puzzle, {
        mode: 'daily',
        date,
        puzzleId: date,
        alreadyPlayed,
        solvedCount,
      }),
    )
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.get('/api/cast/daily', async (req, res) => {
  try {
    const date = String(req.query.date || todayBRT())
    let puzzle = await ensureDailyPuzzle(date)
    if (!puzzle) {
      res.status(404).json({ error: 'Sem filmes no catálogo' })
      return
    }
    // Se o daily do dia não tem elenco, pega um PD com cast_json
    const cj = puzzle.cast_json
    const hasCastMeta =
      (cj && typeof cj === 'object' && !Array.isArray(cj) && Object.keys(cj).length > 0) ||
      (Array.isArray(cj) && cj.length > 0)
    if (!puzzle.director || !hasCastMeta) {
      const { rows } = await query(
        `SELECT id::text AS puzzle_key,
                id AS movie_id,
                title, title_pt, aliases, poster_path, poster_wide_path,
                clip_path, attribution, year, director, cast_json
         FROM movies
         WHERE director IS NOT NULL
           AND cast_json IS NOT NULL
           AND cast_json != '{}'::jsonb
           AND cast_json != '[]'::jsonb
         ORDER BY title ASC`,
      )
      if (rows.length === 0) {
        res.status(404).json({ error: 'Sem filmes com elenco cadastrado' })
        return
      }
      puzzle = rows[dayNumber(date) % rows.length]
      puzzle.puzzle_key = date
    }

    let alreadyPlayed = false
    if (req.user) {
      alreadyPlayed = await hasPlayedCastDaily(req.user.id, date)
    }

    res.json(
      await publicCastPuzzle(puzzle, {
        date,
        puzzleId: date,
        alreadyPlayed,
      }),
    )
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

/** Elenco infinito: filmes com cast_json preenchido */
app.get('/api/cast/next', async (req, res) => {
  try {
    const exclude = String(req.query.exclude || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const params = []
    let where = `director IS NOT NULL
      AND cast_json IS NOT NULL
      AND cast_json != '{}'::jsonb
      AND cast_json != '[]'::jsonb`
    if (exclude.length > 0) {
      params.push(exclude)
      where += ` AND NOT (id::text = ANY($${params.length}::text[]))`
    }

    let { rows } = await query(
      `SELECT id::text AS puzzle_key,
              id AS movie_id,
              title, title_pt, aliases, poster_path, poster_wide_path,
              clip_path, attribution, year, director, cast_json
       FROM movies
       WHERE ${where}
       ORDER BY random()
       LIMIT 1`,
      params,
    )

    if (rows.length === 0 && exclude.length > 0) {
      ;({ rows } = await query(
        `SELECT id::text AS puzzle_key,
                id AS movie_id,
                title, title_pt, aliases, poster_path, poster_wide_path,
                clip_path, attribution, year, director, cast_json
         FROM movies
         WHERE director IS NOT NULL
           AND cast_json IS NOT NULL
           AND cast_json != '{}'::jsonb
           AND cast_json != '[]'::jsonb
         ORDER BY random()
         LIMIT 1`,
      ))
    }

    if (rows.length === 0) {
      res.status(404).json({ error: 'Sem filmes com elenco' })
      return
    }

    res.json(await publicCastPuzzle(rows[0], { endless: true }))
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.post('/api/cast/guess', async (req, res) => {
  try {
    const puzzleId = String(req.body?.puzzleId || '')
    const attempt = Number(req.body?.attempt)
    const guess = String(req.body?.guess || '')

    if (
      !puzzleId ||
      !Number.isInteger(attempt) ||
      attempt < 1 ||
      attempt > CAST_MAX_TAKE
    ) {
      res.status(400).json({ error: 'puzzleId e attempt (1-7) obrigatórios' })
      return
    }

    const puzzle = await resolvePuzzle(puzzleId)
    if (!puzzle) {
      res.status(404).json({ error: 'Puzzle não encontrado' })
      return
    }

    const correct = matchesTitle(guess, puzzle)
    const points = correct ? CAST_POINTS[attempt - 1] : 0
    const reveal = correct || attempt === CAST_MAX_TAKE

    let alsoGuessedCount = null
    if (isDateId(puzzleId) && guess.trim()) {
      alsoGuessedCount = await recordDailyGuess({
        dateStr: puzzleId,
        userId: req.user?.id || null,
        guessRaw: guess.trim(),
        guessNorm: normalizeGuess(guess),
        correct,
      })
    }

    res.json({
      correct,
      points: correct ? points : 0,
      hintsUnlocked: attempt,
      ...(alsoGuessedCount != null ? { alsoGuessedCount } : {}),
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

async function getCharacterById(id) {
  const { rows } = await query(
    `SELECT id::text AS puzzle_key, id, name, name_pt, aliases,
            film_title, image_path, attribution
     FROM characters WHERE id = $1::uuid`,
    [id],
  )
  return rows[0] || null
}

async function ensureCharacterDaily(dateStr) {
  const { rows: existing } = await query(
    `SELECT c.id::text AS puzzle_key, c.id, c.name, c.name_pt, c.aliases,
            c.film_title, c.image_path, c.attribution
     FROM character_daily d
     JOIN characters c ON c.id = d.character_id
     WHERE d.puzzle_date = $1::date`,
    [dateStr],
  )
  if (existing[0]) return existing[0]

  const { rows: pool } = await query(
    `SELECT id FROM characters ORDER BY name ASC`,
  )
  if (pool.length === 0) return null
  const movieId = pool[dayNumber(dateStr) % pool.length].id
  await query(
    `INSERT INTO character_daily (puzzle_date, character_id)
     VALUES ($1::date, $2::uuid)
     ON CONFLICT (puzzle_date) DO NOTHING`,
    [dateStr, movieId],
  )
  const { rows } = await query(
    `SELECT c.id::text AS puzzle_key, c.id, c.name, c.name_pt, c.aliases,
            c.film_title, c.image_path, c.attribution
     FROM character_daily d
     JOIN characters c ON c.id = d.character_id
     WHERE d.puzzle_date = $1::date`,
    [dateStr],
  )
  return rows[0] || null
}

function publicCharacterPuzzle(ch, extra = {}) {
  return {
    puzzleId: ch.puzzle_key || String(ch.id),
    mode: 'character',
    imageUrl: ch.image_path,
    filmHint: null,
    attribution: ch.attribution || null,
    maxTakes: CHARACTER_MAX_TAKE,
    ...extra,
  }
}

app.get('/api/character/daily', async (req, res) => {
  try {
    const date = String(req.query.date || todayBRT())
    const ch = await ensureCharacterDaily(date)
    if (!ch) {
      res.status(404).json({ error: 'Sem personagens cadastrados' })
      return
    }
    let alreadyPlayed = false
    if (req.user) {
      const { rows } = await query(
        `SELECT 1 FROM user_character_daily_plays
         WHERE user_id = $1 AND puzzle_date = $2::date`,
        [req.user.id, date],
      )
      alreadyPlayed = rows.length > 0
    }
    res.json(
      publicCharacterPuzzle(ch, {
        date,
        puzzleId: date,
        alreadyPlayed,
      }),
    )
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.get('/api/character/next', async (req, res) => {
  try {
    const exclude = String(req.query.exclude || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const params = []
    let where = 'TRUE'
    if (exclude.length > 0) {
      params.push(exclude)
      where = `NOT (id::text = ANY($${params.length}::text[]))`
    }
    let { rows } = await query(
      `SELECT id::text AS puzzle_key, id, name, name_pt, aliases,
              film_title, image_path, attribution
       FROM characters WHERE ${where}
       ORDER BY random() LIMIT 1`,
      params,
    )
    if (rows.length === 0) {
      ;({ rows } = await query(
        `SELECT id::text AS puzzle_key, id, name, name_pt, aliases,
                film_title, image_path, attribution
         FROM characters ORDER BY random() LIMIT 1`,
      ))
    }
    if (rows.length === 0) {
      res.status(404).json({ error: 'Sem personagens' })
      return
    }
    res.json(publicCharacterPuzzle(rows[0], { endless: true }))
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.get('/api/character/autocomplete', async (req, res) => {
  try {
    const q = normalizeGuess(req.query.q)
    if (!q) {
      res.json({ suggestions: [] })
      return
    }
    const { rows } = await query(
      `SELECT name, name_pt, film_title
       FROM characters
       WHERE name ILIKE $1 OR name_pt ILIKE $1
          OR EXISTS (
            SELECT 1 FROM unnest(aliases) a WHERE a ILIKE $1
          )
       ORDER BY name ASC
       LIMIT 12`,
      [`%${q}%`],
    )
    res.json({
      suggestions: rows.map((r) => ({
        title: r.name,
        titlePt: r.name_pt,
        label: r.name_pt
          ? `${r.name_pt} (${r.name})`
          : r.film_title
            ? `${r.name} · ${r.film_title}`
            : r.name,
      })),
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.post('/api/character/guess', async (req, res) => {
  try {
    const puzzleId = String(req.body?.puzzleId || '')
    const attempt = Number(req.body?.attempt)
    const guess = String(req.body?.guess || '')
    const endless = Boolean(req.body?.endless)

    if (
      !puzzleId ||
      !Number.isInteger(attempt) ||
      attempt < 1 ||
      attempt > CHARACTER_MAX_TAKE
    ) {
      res.status(400).json({ error: 'puzzleId e attempt inválidos' })
      return
    }

    let ch = null
    const dateKey = isDateId(puzzleId) ? puzzleId : null
    if (dateKey) {
      ch = await ensureCharacterDaily(dateKey)
    } else {
      ch = await getCharacterById(puzzleId)
    }
    if (!ch) {
      res.status(404).json({ error: 'Personagem não encontrado' })
      return
    }

    const correct = matchesCharacter(guess, ch)
    const reveal = correct || attempt >= CHARACTER_MAX_TAKE
    let points = 0
    let progress = null

    if (req.user && reveal) {
      const today = todayBRT()
      const isArchive = Boolean(dateKey && dateKey < today)
      if (!endless && dateKey) {
        const { rows: played } = await query(
          `SELECT 1 FROM user_character_daily_plays
           WHERE user_id = $1 AND puzzle_date = $2::date`,
          [req.user.id, dateKey],
        )
        if (played.length > 0) {
          res.status(409).json({ error: 'Você já jogou este dia' })
          return
        }
      }

      if (!isArchive) {
        const { rows: progRows } = await query(
          `SELECT total_score, first_try_streak, wins
           FROM user_progress WHERE user_id = $1 AND mode = 'character'`,
          [req.user.id],
        )
        let totalScore = progRows[0]?.total_score ?? 0
        let firstTryStreak = progRows[0]?.first_try_streak ?? 0
        let wins = progRows[0]?.wins ?? 0
        const scored = scoreRound({
          won: correct,
          take: attempt,
          firstTryStreak,
          pointsTable: CHARACTER_POINTS,
        })
        points = scored.points
        totalScore += scored.points
        firstTryStreak = scored.nextStreak
        if (correct) wins += 1
        await query(
          `INSERT INTO user_progress (user_id, mode, total_score, first_try_streak, wins, updated_at)
           VALUES ($1, 'character', $2, $3, $4, now())
           ON CONFLICT (user_id, mode) DO UPDATE SET
             total_score = EXCLUDED.total_score,
             first_try_streak = EXCLUDED.first_try_streak,
             wins = EXCLUDED.wins,
             updated_at = now()`,
          [req.user.id, totalScore, firstTryStreak, wins],
        )
      }

      if (!endless && dateKey) {
        await query(
          `INSERT INTO user_character_daily_plays (user_id, puzzle_date, won, take, points)
           VALUES ($1, $2::date, $3, $4, $5)
           ON CONFLICT (user_id, puzzle_date) DO NOTHING`,
          [req.user.id, dateKey, correct, attempt, points],
        )
      }
      progress = await getProgress(req.user.id)
    } else if (correct) {
      points = CHARACTER_POINTS[attempt - 1] ?? 5
    }

    res.json({
      correct,
      points,
      progress,
      ...(reveal
        ? {
            name: ch.name,
            namePt: ch.name_pt,
            filmTitle: ch.film_title,
            imageUrl: ch.image_path,
          }
        : {}),
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.post('/api/feedback/bug', async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim()
    const description = String(req.body?.description || '').trim()
    const email = String(req.body?.email || '').trim()
    if (title.length < 3 || description.length < 10) {
      res.status(400).json({ error: 'Preencha título e descrição' })
      return
    }

    try {
      await sendBugReportEmail({
        title,
        description,
        fromEmail: email,
        username: req.user?.username,
      })
      res.json({ ok: true, message: 'Relatório enviado. Obrigado!' })
    } catch {
      const to =
        process.env.BUG_REPORT_EMAIL ||
        process.env.EMAIL_TO ||
        'suporte@cineblitz.local'
      const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
        `[CineBlitz bug] ${title}`,
      )}&body=${encodeURIComponent(
        `${description}\n\n— ${email || 'anon'} @${req.user?.username || '?'}`,
      )}`
      res.json({
        ok: true,
        mailto,
        message:
          'E-mail automático indisponível — abrindo seu cliente de e-mail.',
      })
    }
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

    if (byUser) {
      res.status(409).json({ error: 'Nome de usuário já está em uso' })
      return
    }
    if (byEmail) {
      res.status(409).json({ error: 'E-mail já cadastrado' })
      return
    }

    const user = await createUser({ username, email, password })
    // Contas antigas sem verify: marca como ok ao criar nova
    await query(`UPDATE users SET email_verified = true WHERE id = $1`, [
      user.id,
    ])
    const token = signToken(user)
    const progress = await getProgress(user.id)
    res.status(201).json({
      token,
      user: publicUser({ ...user, email_verified: true }),
      progress,
    })
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
    // Sem confirmação de e-mail — libera login direto
    if (!user.email_verified) {
      await query(`UPDATE users SET email_verified = true WHERE id = $1`, [
        user.id,
      ])
      user.email_verified = true
    }
    const token = signToken(user)
    const progress = await getProgress(user.id)
    res.json({
      token,
      user: publicUser(user),
      progress,
    })
  } catch (err) {
    console.error('[login]', err)
    res.status(500).json({
      error: err?.message ? String(err.message) : 'Erro interno no login',
    })
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
    const date = todayBRT()
    const alreadyPlayed = await hasPlayedDaily(user.id, date)
    const castPlayedToday = await hasPlayedCastDaily(user.id, date)
    res.json({
      user: publicUser(user),
      progress,
      dailyPlayedToday: alreadyPlayed,
      castPlayedToday,
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.get('/api/rank', async (req, res) => {
  try {
    const mode =
      req.query.mode === 'classic'
        ? 'classic'
        : req.query.mode === 'cast'
          ? 'cast'
          : 'daily'
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
    const rawMode = String(req.body?.mode || 'daily')
    const mode =
      rawMode === 'classic' ? 'classic' : rawMode === 'cast' ? 'cast' : 'daily'
    const puzzleId = String(req.body?.puzzleId || '')
    const outcome = req.body?.outcome === 'win' ? 'win' : 'lose'
    const take = Number(req.body?.take)
    const maxTake = mode === 'cast' ? CAST_MAX_TAKE : 6

    if (!puzzleId || !Number.isInteger(take) || take < 1 || take > maxTake) {
      res.status(400).json({ error: 'Dados inválidos' })
      return
    }

    const puzzle = await resolvePuzzle(puzzleId)
    if (!puzzle) {
      res.status(404).json({ error: 'Puzzle não encontrado' })
      return
    }

    const today = todayBRT()
    const playDate =
      mode === 'daily' || mode === 'cast'
        ? isDateId(puzzleId)
          ? puzzleId
          : today
        : null
    /** Arquivo (calendário): jogável, mas 0 pts e sem streak/rank */
    const isArchive = Boolean(playDate && playDate < today)

    if (mode === 'daily' && playDate) {
      if (await hasPlayedDaily(req.user.id, playDate)) {
        res.status(409).json({
          error: isArchive
            ? 'Você já jogou este dia'
            : 'Você já jogou o daily de hoje',
        })
        return
      }
    }
    if (mode === 'cast' && playDate) {
      if (await hasPlayedCastDaily(req.user.id, playDate)) {
        res.status(409).json({
          error: isArchive
            ? 'Você já jogou o elenco deste dia'
            : 'Você já jogou o elenco de hoje',
        })
        return
      }
    }

    let scored = { points: 0, multiplier: 1, nextStreak: 0 }

    if (!isArchive) {
      const { rows: progRows } = await query(
        `SELECT total_score, first_try_streak, wins
         FROM user_progress WHERE user_id = $1 AND mode = $2`,
        [req.user.id, mode],
      )
      let totalScore = progRows[0]?.total_score ?? 0
      let firstTryStreak = progRows[0]?.first_try_streak ?? 0
      let wins = progRows[0]?.wins ?? 0

      scored = scoreRound({
        won: outcome === 'win',
        take,
        firstTryStreak,
        pointsTable: mode === 'cast' ? CAST_POINTS : undefined,
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
    }

    if (mode === 'daily' && playDate) {
      await query(
        `INSERT INTO user_daily_plays (user_id, puzzle_date, won, take, points)
         VALUES ($1, $2::date, $3, $4, $5)
         ON CONFLICT (user_id, puzzle_date) DO NOTHING`,
        [req.user.id, playDate, outcome === 'win', take, scored.points],
      )
    }
    if (mode === 'cast' && playDate) {
      await query(
        `INSERT INTO user_cast_daily_plays (user_id, puzzle_date, won, take, points)
         VALUES ($1, $2::date, $3, $4, $5)
         ON CONFLICT (user_id, puzzle_date) DO NOTHING`,
        [req.user.id, playDate, outcome === 'win', take, scored.points],
      )
    }

    const progress = await getProgress(req.user.id)
    res.json({
      points: scored.points,
      multiplier: scored.multiplier,
      archive: isArchive,
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

    // Só clipes — Maratona não cai em pôster
    const puzzle = (await pick(true, true)) || (await pick(true, false))

    if (!puzzle) {
      res.status(404).json({ error: 'Sem filmes com clipe no catálogo' })
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

    let alsoGuessedCount = null
    if (isDateId(puzzleId)) {
      const guessNorm = normalizeGuess(guess)
      alsoGuessedCount = await recordDailyGuess({
        dateStr: puzzleId,
        userId: req.user?.id || null,
        guessRaw: guess.trim(),
        guessNorm,
        correct,
      })
    }

    res.json({
      correct,
      points: correct ? points : 0,
      ...(alsoGuessedCount != null ? { alsoGuessedCount } : {}),
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

// Produção (Render): serve o build do Vite (API + front na mesma URL)
const distPath = path.join(__dirname, '../../web/dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

async function boot() {
  try {
    await migrate()
  } catch (err) {
    console.error('[migrate] falhou:', err)
  }
  const server = app.listen(PORT, () => {
    console.log(`API cineblitz em http://localhost:${PORT}`)
    console.log('Deixe esta janela ABERTA enquanto joga.')
  })
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `Porta ${PORT} já está em uso por OUTRO node antigo.\n` +
          `No PowerShell: Get-NetTCPConnection -LocalPort ${PORT} | Select OwningProcess\n` +
          `Depois: Stop-Process -Id <PID> -Force\n` +
          `E rode npm start de novo.`,
      )
    } else {
      console.error('[listen]', err)
    }
    process.exit(1)
  })
}

boot().catch((err) => {
  console.error('[boot]', err)
  process.exit(1)
})
