import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import {
  authAdminRequired,
  authOptional,
  authRequired,
  consumeEmailVerifyToken,
  consumePasswordResetToken,
  createEmailVerifyToken,
  createPasswordResetToken,
  createUser,
  findUserByEmail,
  findUserById,
  findUserByLogin,
  findUserByUsername,
  getProgress,
  getRank,
  searchUsers,
  getCastDailyPlayResult,
  getCharacterDailyPlayResult,
  getDailyPlayResult,
  hasPlayedCastDaily,
  hasPlayedCharacterDaily,
  hasPlayedDaily,
  hasPlayedKeywordsDaily,
  hasPlayedWhoamiDaily,
  isValidEmail,
  normalizeEmail,
  signToken,
  verifyPassword,
} from './auth.js'
import { CHARACTER_EPOCH } from './characterCatalog.js'
import {
  resolveCropStages,
  sanitizeCropJson,
  slugCharacter,
} from './characterCrops.js'
import { drawWithoutReplacement } from './dailyRotation.js'
import { query } from './db.js'
import { migrate } from './migrate.js'
import {
  buildAchievements,
  CATEGORY_LABEL,
  diffUnlockedAchievements,
  loadCommunityRates,
  withCommunityRates,
} from './achievements.js'
import {
  buildCastJsonFromTmdb,
  directorNameFromCredits,
  posterUrlFromPath,
  previewCastHints,
} from './castFromTmdb.js'
import {
  loadDailyWinsByMode,
  recordModeOutcome,
} from './modeProgress.js'
import {
  enrichHintsWithTmdb,
  fetchMovieBundle,
  fetchMovieDetails,
  fetchMovieKeywords,
  searchTmdbMovies,
  tmdbConfigured,
} from './tmdb.js'
import {
  KEYWORDS_MAX_WRONG,
  KEYWORDS_MIN_CURATED,
  KEYWORDS_PER_WRONG,
  KEYWORDS_PIXEL_AT,
  KEYWORDS_REVEAL_BY_WRONG,
  KEYWORDS_START,
  curateKeywords,
  ensurePortugueseKeywords,
  keywordsPoints,
  looksLikeSequel,
  movieHasEnoughKeywords,
  resolvedKeywords,
  showPixelPoster,
  sliceRevealed,
  tmdbIdFromMovie as keywordsTmdbId,
} from './keywords.js'
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
import {
  formatCharacterLabel,
  formatMovieLabel,
  matchesCharacter,
  matchesTitle,
  normalizeGuess,
  primaryTitle,
} from './normalize.js'
import { CAST_POINTS, scoreRound } from './scoring.js'
import {
  BOOL_FIELDS,
  BOOL_PATHS,
  deleteAdminQuestion,
  EQ_PATHS,
  evaluateQuestion,
  listAdminQuestions,
  mergeTraitsPatch,
  previewAllAnswers,
  publicAskBank,
  publicTraitsForAdmin,
  RULE_TYPES,
  STUDIO_OPTIONS,
  TAG_OPTIONS,
  traitsCompleteness,
  traitsFromMovie,
  upsertAdminCategory,
  upsertAdminQuestion,
  whoamiPoints,
  WHOAMI_CATEGORIES,
} from './whoami.js'

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
app.use(authOptional)

const CHARACTERS_DIR = path.join(__dirname, '../../web/public/characters')
const CLIPS_DIR = path.join(__dirname, '../../web/public/clips')
const adminJson = express.json({ limit: '12mb' })
const adminClipRaw = express.raw({
  type: ['video/mp4', 'application/octet-stream'],
  limit: '40mb',
})

function decodeDataUrlImage(dataUrl) {
  const m = String(dataUrl || '').match(
    /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/i,
  )
  if (!m) return null
  const ext = m[1].toLowerCase() === 'jpg' ? 'jpg' : m[1].toLowerCase()
  const buffer = Buffer.from(m[2].replace(/\s+/g, ''), 'base64')
  if (buffer.length < 100 || buffer.length > 10 * 1024 * 1024) return null
  return { ext: ext === 'jpeg' ? 'jpg' : ext, buffer }
}

function publicAdminCharacter(row) {
  const stages = resolveCropStages(row.crop_json, row.image_path)
  return {
    id: row.id,
    name: row.name,
    namePt: row.name_pt || row.name,
    filmTitle: row.film_title || null,
    movieId: row.movie_id || null,
    imageUrl: row.image_path,
    attribution: row.attribution || null,
    cropStages: stages,
    hasPhoto: String(row.image_path || '').startsWith('/characters/'),
  }
}

/** Upload/create personagem — body grande, antes do json 1mb. */
app.post('/api/admin/characters', authAdminRequired, adminJson, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim()
    const namePt = String(req.body?.namePt || name).trim() || name
    const filmTitle = String(req.body?.filmTitle || '').trim() || null
    const movieId = req.body?.movieId ? String(req.body.movieId) : null
    const imageData = decodeDataUrlImage(req.body?.imageDataUrl)
    if (!name || name.length < 2) {
      res.status(400).json({ error: 'Nome do personagem obrigatório' })
      return
    }
    if (!imageData) {
      res.status(400).json({ error: 'Envie uma imagem (JPEG/PNG/WebP) em data URL' })
      return
    }

    let resolvedFilm = filmTitle
    let resolvedMovieId = movieId
    if (movieId) {
      const { rows: movies } = await query(
        `SELECT id::text AS id, title, title_pt FROM movies WHERE id = $1::uuid`,
        [movieId],
      )
      if (!movies[0]) {
        res.status(400).json({ error: 'Filme não encontrado no catálogo' })
        return
      }
      resolvedFilm = movies[0].title_pt || movies[0].title
      resolvedMovieId = movies[0].id
    }

    fs.mkdirSync(CHARACTERS_DIR, { recursive: true })
    let slug = slugCharacter(namePt || name) || `char-${Date.now()}`
    let filename = `${slug}.${imageData.ext}`
    let full = path.join(CHARACTERS_DIR, filename)
    let n = 2
    while (fs.existsSync(full)) {
      filename = `${slug}-${n}.${imageData.ext}`
      full = path.join(CHARACTERS_DIR, filename)
      n += 1
    }
    fs.writeFileSync(full, imageData.buffer)
    const imagePath = `/characters/${filename}`
    const cropJson = sanitizeCropJson(req.body?.cropStages || {})

    const { rows } = await query(
      `INSERT INTO characters
         (name, name_pt, aliases, film_title, image_path, attribution, crop_json, movie_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::uuid)
       RETURNING id::text AS id, name, name_pt, film_title, image_path, attribution,
                 crop_json, movie_id::text AS movie_id`,
      [
        name,
        namePt,
        [namePt, name].filter((v, i, a) => v && a.indexOf(v) === i),
        resolvedFilm,
        imagePath,
        resolvedFilm,
        JSON.stringify(cropJson),
        resolvedMovieId,
      ],
    )
    res.status(201).json({ character: publicAdminCharacter(rows[0]) })
  } catch (err) {
    if (String(err.message || '').includes('characters_name_lower_idx')) {
      res.status(409).json({ error: 'Já existe personagem com esse nome' })
      return
    }
    res.status(500).json({ error: String(err.message) })
  }
})

app.patch(
  '/api/admin/characters/:id',
  authAdminRequired,
  adminJson,
  async (req, res) => {
    try {
      const id = String(req.params.id || '')
      const { rows: existing } = await query(
        `SELECT id::text AS id, name, name_pt, film_title, image_path, attribution,
                crop_json, movie_id::text AS movie_id
         FROM characters WHERE id = $1::uuid`,
        [id],
      )
      if (!existing[0]) {
        res.status(404).json({ error: 'Personagem não encontrado' })
        return
      }

      const name =
        req.body?.name !== undefined
          ? String(req.body.name || '').trim()
          : existing[0].name
      const namePt =
        req.body?.namePt !== undefined
          ? String(req.body.namePt || '').trim() || name
          : existing[0].name_pt
      let filmTitle = existing[0].film_title
      let movieId = existing[0].movie_id
      if (req.body?.movieId !== undefined) {
        if (!req.body.movieId) {
          movieId = null
        } else {
          const { rows: movies } = await query(
            `SELECT id::text AS id, title, title_pt FROM movies WHERE id = $1::uuid`,
            [String(req.body.movieId)],
          )
          if (!movies[0]) {
            res.status(400).json({ error: 'Filme não encontrado no catálogo' })
            return
          }
          movieId = movies[0].id
          filmTitle = movies[0].title_pt || movies[0].title
        }
      } else if (req.body?.filmTitle !== undefined) {
        filmTitle = String(req.body.filmTitle || '').trim() || null
      }

      let imagePath = existing[0].image_path
      if (req.body?.imageDataUrl) {
        const imageData = decodeDataUrlImage(req.body.imageDataUrl)
        if (!imageData) {
          res.status(400).json({ error: 'Imagem inválida' })
          return
        }
        fs.mkdirSync(CHARACTERS_DIR, { recursive: true })
        const slug = slugCharacter(namePt || name) || `char-${Date.now()}`
        const filename = `${slug}.${imageData.ext}`
        const full = path.join(CHARACTERS_DIR, filename)
        fs.writeFileSync(full, imageData.buffer)
        imagePath = `/characters/${filename}`
      }

      const cropJson =
        req.body?.cropStages !== undefined
          ? sanitizeCropJson(req.body.cropStages)
          : null

      const { rows } = await query(
        `UPDATE characters SET
           name = $2,
           name_pt = $3,
           film_title = $4,
           image_path = $5,
           attribution = COALESCE($4, attribution),
           crop_json = COALESCE($6::jsonb, crop_json),
           movie_id = $7::uuid
         WHERE id = $1::uuid
         RETURNING id::text AS id, name, name_pt, film_title, image_path, attribution,
                   crop_json, movie_id::text AS movie_id`,
        [
          id,
          name,
          namePt,
          filmTitle,
          imagePath,
          cropJson ? JSON.stringify(cropJson) : null,
          movieId,
        ],
      )
      res.json({ character: publicAdminCharacter(rows[0]) })
    } catch (err) {
      res.status(500).json({ error: String(err.message) })
    }
  },
)

/** Avatares vão em data URL no JSON — default 100kb do Express estoura (413). */
app.use(express.json({ limit: '1mb' }))

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

async function listClassicEligibleIds() {
  const { rows } = await query(
    `SELECT id::text AS id FROM movies
     WHERE clip_path IS NOT NULL AND clip_path <> ''`,
  )
  return rows.map((r) => r.id)
}

async function listCastEligibleIds() {
  const { rows } = await query(
    `SELECT id::text AS id FROM movies
     WHERE director IS NOT NULL
       AND cast_json IS NOT NULL
       AND cast_json != '{}'::jsonb
       AND cast_json != '[]'::jsonb`,
  )
  return rows.map((r) => r.id)
}

async function listCharacterEligibleIds() {
  const { rows } = await query(
    `SELECT id::text AS id FROM characters
     WHERE image_path LIKE '/characters/%'`,
  )
  return rows.map((r) => r.id)
}

async function getCastPuzzleByDate(dateStr) {
  const { rows } = await query(
    `SELECT d.puzzle_date::text AS puzzle_key,
            m.id AS movie_id,
            m.title, m.title_pt, m.aliases, m.poster_path, m.poster_wide_path,
            m.clip_path, m.attribution, m.year, m.director, m.cast_json
     FROM cast_daily d
     JOIN movies m ON m.id = d.movie_id
     WHERE d.puzzle_date = $1::date`,
    [dateStr],
  )
  return rows[0] || null
}

/** Clássico diário: clipe; sorteio sem repetir até esgotar o pool. */
async function ensureDailyPuzzle(dateStr) {
  const existing = await getPuzzleByDate(dateStr)
  if (existing?.clip_path) return existing

  // Evita o mesmo filme do elenco no mesmo dia (se já existir)
  const castSameDay = await getCastPuzzleByDate(dateStr)
  const excludeIds = castSameDay?.movie_id ? [String(castSameDay.movie_id)] : []

  const movieId = await drawWithoutReplacement({
    mode: 'classic',
    dateStr,
    listEligible: listClassicEligibleIds,
    excludeIds,
  })
  if (!movieId) {
    if (existing) return existing
    return null
  }

  if (existing && !existing.clip_path) {
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

/** Poster diário: pool próprio (nunca o mesmo filme do clássico no mesmo dia). */
async function ensureCastDaily(dateStr) {
  const classicSameDay = await getPuzzleByDate(dateStr)
  const classicId = classicSameDay?.movie_id
    ? String(classicSameDay.movie_id)
    : null

  const existing = await getCastPuzzleByDate(dateStr)
  if (existing) {
    const sameAsClassic =
      classicId && String(existing.movie_id) === classicId
    if (!sameAsClassic) return existing

    // Bug legado: cast = clássico. Re-sorteia só se ninguém jogou poster hoje.
    const { rows: plays } = await query(
      `SELECT 1 FROM user_cast_daily_plays WHERE puzzle_date = $1::date LIMIT 1`,
      [dateStr],
    )
    if (plays.length > 0) return existing

    await query(`DELETE FROM cast_daily WHERE puzzle_date = $1::date`, [
      dateStr,
    ])
    await query(
      `DELETE FROM daily_pool_used
       WHERE mode = 'cast' AND item_id = $1::uuid AND used_on = $2::date`,
      [existing.movie_id, dateStr],
    )
  }

  const excludeIds = classicId ? [classicId] : []

  const movieId = await drawWithoutReplacement({
    mode: 'cast',
    dateStr,
    listEligible: listCastEligibleIds,
    excludeIds,
  })
  if (!movieId) return null

  await query(
    `INSERT INTO cast_daily (puzzle_date, movie_id)
     VALUES ($1::date, $2::uuid)
     ON CONFLICT (puzzle_date) DO NOTHING`,
    [dateStr, movieId],
  )

  return getCastPuzzleByDate(dateStr)
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
            poster_wide_path,
            source_url
     FROM movies
     WHERE id = $1::uuid`,
    [movieId],
  )
  return rows[0] || null
}

function personThumb(_name, imageUrl) {
  if (imageUrl && String(imageUrl).startsWith('http')) return imageUrl
  if (imageUrl && !String(imageUrl).startsWith('/cast/')) return imageUrl
  return null
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

async function resolvePuzzle(puzzleId, mode = 'daily') {
  if (isDateId(puzzleId)) {
    if (mode === 'cast') return getCastPuzzleByDate(puzzleId)
    if (mode === 'whoami') return getWhoamiPuzzleByDate(puzzleId)
    if (mode === 'keywords') return getKeywordsPuzzleByDate(puzzleId)
    return getPuzzleByDate(puzzleId)
  }
  return getMovieById(puzzleId)
}

function tmdbIdFromMovie(movie) {
  const id = movie?.cast_json?._tmdb?.id
  if (id) return Number(id)
  const url = movie?.source_url || ''
  const hit = /themoviedb\.org\/movie\/(\d+)/i.exec(url)
  if (hit) return Number(hit[1])
  const att = movie?.attribution || ''
  const hit2 = /TMDB\s*#(\d+)/i.exec(att)
  if (hit2) return Number(hit2[1])
  return null
}

/** Garante _keywords.curated (+ curatedPt) no filme. */
async function ensureKeywordsData(movie) {
  if (!movie) return movie
  let current = movie
  // curatedPt curto/ruim não conta — força refresh do TMDB
  if (!movieHasEnoughKeywords(current)) {
    const tmdbId = keywordsTmdbId(current) || tmdbIdFromMovie(current)
    if (tmdbId && tmdbConfigured()) {
      const raw = await fetchMovieKeywords(tmdbId)
      if (raw?.length) {
        const curated = curateKeywords(raw, current)
        const prevRaw = current.cast_json?._keywords?.raw
        const castJson = {
          ...(typeof current.cast_json === 'object' && current.cast_json
            ? current.cast_json
            : {}),
          _keywords: {
            raw: raw.length >= (prevRaw?.length || 0) ? raw : prevRaw || raw,
            curated,
            // descarta curatedPt velho (frases EN longas / lista curta)
          },
        }
        current = { ...current, cast_json: castJson }
        await query(`UPDATE movies SET cast_json = $2::jsonb WHERE id = $1`, [
          current.movie_id || current.id,
          JSON.stringify(castJson),
        ]).catch(() => {})
      }
    } else if (Array.isArray(current.cast_json?._keywords?.raw)) {
      // Sem TMDB: re-cura o raw local e joga fora curatedPt ruim
      const curated = curateKeywords(current.cast_json._keywords.raw, current)
      current = {
        ...current,
        cast_json: {
          ...current.cast_json,
          _keywords: {
            raw: current.cast_json._keywords.raw,
            curated,
          },
        },
      }
    }
  }
  const { movie: withPt, changed } = ensurePortugueseKeywords(current)
  if (changed) {
    // fire-and-forget: não bloqueia a resposta do daily
    query(`UPDATE movies SET cast_json = $2::jsonb WHERE id = $1`, [
      withPt.movie_id || withPt.id,
      JSON.stringify(withPt.cast_json),
    ]).catch(() => {})
  }
  return withPt
}

async function getKeywordsPuzzleByDate(dateStr) {
  const { rows } = await query(
    `SELECT d.puzzle_date::text AS puzzle_key,
            m.id AS movie_id,
            m.title, m.title_pt, m.aliases, m.poster_path, m.poster_wide_path,
            m.clip_path, m.attribution, m.year, m.director, m.cast_json,
            m.source_url
     FROM keywords_daily d
     JOIN movies m ON m.id = d.movie_id
     WHERE d.puzzle_date = $1::date`,
    [dateStr],
  )
  return rows[0] || null
}

async function ensureKeywordsDaily(dateStr) {
  let puzzle = await getKeywordsPuzzleByDate(dateStr)
  if (puzzle) return ensureKeywordsData(puzzle)

  async function listKeywordsEligible({ allowSequels }) {
    const { rows } = await query(
      `SELECT id::text AS id, cast_json, title, title_pt, source_url, attribution
       FROM movies
       WHERE cast_json IS NOT NULL
         AND cast_json != '{}'::jsonb
         AND year IS NOT NULL
         AND poster_path IS NOT NULL`,
    )
    return rows
      .filter((r) => {
        if (!allowSequels && looksLikeSequel(r)) return false
        if (movieHasEnoughKeywords(r)) return true
        const curated = r.cast_json?._keywords?.curated
        const pt = r.cast_json?._keywords?.curatedPt
        return (
          (Array.isArray(curated) && curated.length >= KEYWORDS_MIN_CURATED) ||
          (Array.isArray(pt) && pt.length >= KEYWORDS_MIN_CURATED)
        )
      })
      .map((r) => r.id)
  }

  // Prefer originals; se o pool esgotar, libera continuações
  let movieId = await drawWithoutReplacement({
    mode: 'keywords',
    dateStr,
    listEligible: () => listKeywordsEligible({ allowSequels: false }),
  })
  if (!movieId) {
    movieId = await drawWithoutReplacement({
      mode: 'keywords',
      dateStr,
      listEligible: () => listKeywordsEligible({ allowSequels: true }),
    })
  }
  if (!movieId) {
    const movieId2 = await drawWithoutReplacement({
      mode: 'keywords',
      dateStr,
      listEligible: async () => {
        const { rows } = await query(
          `SELECT id::text AS id FROM movies
           WHERE cast_json -> '_tmdb' ->> 'id' IS NOT NULL
             AND poster_path IS NOT NULL
             AND year IS NOT NULL`,
        )
        return rows.map((r) => r.id)
      },
    })
    if (!movieId2) return null
    await query(
      `INSERT INTO keywords_daily (puzzle_date, movie_id)
       VALUES ($1::date, $2::uuid)
       ON CONFLICT (puzzle_date) DO NOTHING`,
      [dateStr, movieId2],
    )
    puzzle = await getKeywordsPuzzleByDate(dateStr)
    return ensureKeywordsData(puzzle)
  }
  await query(
    `INSERT INTO keywords_daily (puzzle_date, movie_id)
     VALUES ($1::date, $2::uuid)
     ON CONFLICT (puzzle_date) DO NOTHING`,
    [dateStr, movieId],
  )
  puzzle = await getKeywordsPuzzleByDate(dateStr)
  return ensureKeywordsData(puzzle)
}

function publicKeywordsPuzzle(puzzle, extra = {}) {
  const wrong = Number(extra.wrongGuesses) || 0
  // prefer curatedPt já garantido por ensureKeywordsData
  const words = resolvedKeywords(puzzle)
  const revealed = sliceRevealed(words, wrong)
  const { wrongGuesses: _w, ...rest } = extra
  return {
    puzzleId: puzzle.puzzle_key || String(puzzle.movie_id || puzzle.id),
    mode: 'keywords',
    attribution: puzzle.attribution || null,
    ...rest,
    startWords: KEYWORDS_START,
    perWrong: KEYWORDS_PER_WRONG,
    revealByWrong: KEYWORDS_REVEAL_BY_WRONG,
    maxWrong: KEYWORDS_MAX_WRONG,
    pixelAt: KEYWORDS_PIXEL_AT,
    words: revealed,
    revealedCount: revealed.length,
    poolSize: words.length,
    totalHintSlots: Math.min(
      words.length,
      KEYWORDS_REVEAL_BY_WRONG[KEYWORDS_REVEAL_BY_WRONG.length - 1],
    ),
    showPixelPoster: showPixelPoster(wrong),
    pixelPosterUrl: showPixelPoster(wrong) ? puzzle.poster_path || null : null,
  }
}

/** Garante _traits.genres no filme (TMDB on-demand + cache no DB). */
async function ensureWhoamiTraits(movie) {
  if (!movie) return movie
  const traits = traitsFromMovie(movie)
  if (traits.genres.length > 0) return movie
  const tmdbId = tmdbIdFromMovie(movie)
  if (!tmdbId || !tmdbConfigured()) return movie
  const details = await fetchMovieDetails(tmdbId)
  if (!details) return movie
  const genres = (details.genres || []).map((g) => g.id).filter(Boolean)
  const region =
    movie.cast_json?.region ||
    details.production_countries?.[0]?.iso_3166_1 ||
    '—'
  const castJson = {
    ...(typeof movie.cast_json === 'object' && movie.cast_json
      ? movie.cast_json
      : {}),
    _traits: {
      genres,
      region: movie.cast_json?.region || region,
      runtime: details.runtime || null,
    },
  }
  await query(`UPDATE movies SET cast_json = $2::jsonb WHERE id = $1`, [
    movie.movie_id || movie.id,
    JSON.stringify(castJson),
  ]).catch(() => {})
  return { ...movie, cast_json: castJson }
}

async function getWhoamiPuzzleByDate(dateStr) {
  const { rows } = await query(
    `SELECT d.puzzle_date::text AS puzzle_key,
            m.id AS movie_id,
            m.title, m.title_pt, m.aliases, m.poster_path, m.poster_wide_path,
            m.clip_path, m.attribution, m.year, m.director, m.cast_json,
            m.source_url
     FROM whoami_daily d
     JOIN movies m ON m.id = d.movie_id
     WHERE d.puzzle_date = $1::date`,
    [dateStr],
  )
  return rows[0] || null
}

async function ensureWhoamiDaily(dateStr) {
  let puzzle = await getWhoamiPuzzleByDate(dateStr)
  if (puzzle) return ensureWhoamiTraits(puzzle)

  const movieId = await drawWithoutReplacement({
    mode: 'whoami',
    dateStr,
    listEligible: async () => {
      const { rows } = await query(
        `SELECT id::text AS id FROM movies
         WHERE cast_json IS NOT NULL
           AND cast_json != '{}'::jsonb
           AND year IS NOT NULL`,
      )
      return rows.map((r) => r.id)
    },
  })
  if (!movieId) return null
  await query(
    `INSERT INTO whoami_daily (puzzle_date, movie_id)
     VALUES ($1::date, $2::uuid)
     ON CONFLICT (puzzle_date) DO NOTHING`,
    [dateStr, movieId],
  )
  puzzle = await getWhoamiPuzzleByDate(dateStr)
  return ensureWhoamiTraits(puzzle)
}

async function publicWhoamiPuzzle(puzzle, extra = {}) {
  return {
    puzzleId: puzzle.puzzle_key || String(puzzle.movie_id || puzzle.id),
    mode: 'whoami',
    askBank: await publicAskBank(),
    attribution: puzzle.attribution || null,
    ...extra,
  }
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
    let priorResult = null
    if (req.user) {
      const play = await getDailyPlayResult(req.user.id, date)
      alreadyPlayed = Boolean(play)
      if (play) {
        priorResult = {
          won: play.won,
          take: play.take,
          points: play.points,
          title: puzzle.title,
          titlePt: primaryTitle(puzzle),
          year: puzzle.year,
          posterUrl: puzzle.poster_path,
        }
      }
    }

    const solvedCount = await countDailySolved(date)

    res.json(
      publicPuzzle(puzzle, {
        mode: 'daily',
        date,
        puzzleId: date,
        alreadyPlayed,
        priorResult,
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
    const puzzle = await ensureCastDaily(date)
    if (!puzzle) {
      res.status(404).json({ error: 'Sem posters com elenco cadastrado' })
      return
    }

    let alreadyPlayed = false
    let priorResult = null
    if (req.user) {
      const play = await getCastDailyPlayResult(req.user.id, date)
      alreadyPlayed = Boolean(play)
      if (play) {
        priorResult = {
          won: play.won,
          take: play.take,
          points: play.points,
          title: puzzle.title,
          titlePt: primaryTitle(puzzle),
          year: puzzle.year,
          posterUrl: puzzle.poster_wide_path || puzzle.poster_path,
        }
      }
    }

    res.json(
      await publicCastPuzzle(puzzle, {
        date,
        puzzleId: date,
        alreadyPlayed,
        priorResult,
      }),
    )
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

/** Gates do Poster infinito (vitórias por faixa → sobe o nível). */
const CAST_ENDLESS_GATES = {
  easy: 10,
  mid: 20,
  hard: 10,
  elite: 10,
}

/**
 * pool grande + order random = diversidade (antes top-50 por voto = sempre HP/Marvel).
 * easy: populares conhecíveis, não só os 20 mais votados do TMDB.
 */
const CAST_ENDLESS_TIER_POOL = {
  easy: { label: 'easy', minVotes: 2500, pool: 400, order: 'random' },
  mid: { label: 'mid', minVotes: 600, maxVotes: 12000, pool: 350, order: 'random' },
  hard: {
    label: 'hard',
    minVotes: 80,
    maxVotes: 4000,
    pool: 300,
    order: 'random',
  },
  elite: { label: 'elite', maxVotes: 1200, pool: 250, order: 'random' },
}

/** Agrupa sequências da mesma franquia pra não vir 3 Harry Potter seguidos. */
function franchiseKey(title, titlePt = '') {
  const t = `${title || ''} ${titlePt || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
  const rules = [
    [/harry\s*potter/, 'harry-potter'],
    [/senhor\s*dos\s*aneis|lord\s*of\s*the\s*rings|\bhobbit\b/, 'lotr'],
    [/star\s*wars|guerra\s*nas\s*estrelas/, 'star-wars'],
    [/velozes\s*e\s*furiosos|fast(\s|&)*furious|furious\s*\d/, 'fast-furious'],
    [/spider-?\s*man|homem-?\s*aranha/, 'spiderman'],
    [/batman|cavaleiro\s*das\s*trevas/, 'batman'],
    [/vingadores|\bavengers\b/, 'avengers'],
    [/homem\s*de\s*ferro|\biron\s*man\b/, 'iron-man'],
    [/capitao\s*america|captain\s*america/, 'cap-america'],
    [/guardioes\s*da\s*galaxia|guardians?\s*of\s*the\s*galaxy/, 'gotg'],
    [/john\s*wick/, 'john-wick'],
    [/missao\s*impossivel|mission:\s*impossible/, 'mi'],
    [/jurassic/, 'jurassic'],
    [/piratas?\s*do\s*caribe|pirates?\s*of\s*the\s*caribbean/, 'potc'],
    [/\bmatrix\b/, 'matrix'],
    [/\balien\b/, 'alien'],
    [/exterminador|terminator/, 'terminator'],
    [/\brocky\b|\bcreed\b/, 'rocky'],
    [/jogos\s*mortais|\bsaw\b/, 'saw'],
    [/\bhalloween\b/, 'halloween'],
    [/sexta.?feira\s*13|friday\s*the\s*13/, 'friday-13'],
    [/hora\s*do\s*pesadelo|nightmare\s*on\s*elm/, 'elm-street'],
    [/toy\s*story/, 'toy-story'],
    [/\bshrek\b/, 'shrek'],
    [/era\s*do\s*gelo|ice\s*age/, 'ice-age'],
    [/\bdeadpool\b/, 'deadpool'],
    [/\bx-?\s*men\b/, 'xmen'],
    [/transformers/, 'transformers'],
    [/jogos\s*vorazes|hunger\s*games/, 'hunger-games'],
    [/crepusculo|\btwilight\b/, 'twilight'],
    [/invocacao\s*do\s*mal|\bconjuring\b/, 'conjuring'],
    [/resident\s*evil/, 'resident-evil'],
    [/guerra\s*mundial\s*z|world\s*war\s*z/, 'wwz'],
    [/indiane?\s*jones|indiana\s*jones/, 'indiana-jones'],
    [/mib\b|men\s*in\s*black|homem\s*de\s*preto/, 'mib'],
    [/carros\b|\bcars\b/, 'cars'],
    [/frozen|frozen\s*2|frozen\s*ii/, 'frozen'],
    [/como\s*treinar\s*o\s*seu\s*dragao|how\s*to\s*train\s*your\s*dragon/, 'httyd'],
    [/madagascar/, 'madagascar'],
    [/kung\s*fu\s*panda/, 'kung-fu-panda'],
    [/despicao|despicable|meu\s*malvado/, 'minions'],
    [/blade\s*runner/, 'blade-runner'],
    [/mad\s*max/, 'mad-max'],
    [/godzilla|kong\b/, 'monsterverse'],
    [/scream|panico\b/, 'scream'],
    [/todo\s*mundo\s*em\s*panico|scary\s*movie/, 'scary-movie'],
    [/final\s*destination|premonicao/, 'final-destination'],
    [/paranormal\s*activity|atividade\s*paranormal/, 'paranormal-activity'],
    [/massacre\s*da\s*serra|texas\s*chain/, 'tcm'],
    [/\bexorcista\b|\bexorcist\b/, 'exorcist'],
    [/super\s*mario|mario\s*bros/, 'mario'],
    [/pokemon|pokémon/, 'pokemon'],
    [/dragon\s*ball|dragonball/, 'dragon-ball'],
    [/\bnaruto\b/, 'naruto'],
    [/one\s*piece/, 'one-piece'],
  ]
  for (const [re, key] of rules) {
    if (re.test(t)) return key
  }
  return null
}

/** Chute errou o filme, mas é da mesma franquia (Halloween 1 → Ressurreição). */
function sameFranchise(guess, movie) {
  const answer = franchiseKey(movie?.title, movie?.title_pt)
  if (!answer) return false
  const g = franchiseKey(guess, '')
  return Boolean(g && g === answer)
}

function emptyCastEndlessProgress() {
  return { easyWins: 0, midWins: 0, hardWins: 0, eliteWins: 0, totalWins: 0 }
}

function normalizeCastEndlessRow(row) {
  const easyWins = row?.easy_wins ?? 0
  const midWins = row?.mid_wins ?? 0
  const hardWins = row?.hard_wins ?? 0
  const eliteWins = row?.elite_wins ?? 0
  return {
    easyWins,
    midWins,
    hardWins,
    eliteWins,
    totalWins: easyWins + midWins + hardWins + eliteWins,
  }
}

/** Faixa atual: só sobe depois de cumprir o gate; não volta ao errar. */
function castEndlessCurrentTier(progress) {
  if (progress.easyWins < CAST_ENDLESS_GATES.easy) return 'easy'
  if (progress.midWins < CAST_ENDLESS_GATES.mid) return 'mid'
  if (progress.hardWins < CAST_ENDLESS_GATES.hard) return 'hard'
  return 'elite'
}

async function getCastEndlessProgress(userId) {
  const { rows } = await query(
    `SELECT easy_wins, mid_wins, hard_wins, elite_wins
     FROM user_cast_endless WHERE user_id = $1`,
    [userId],
  )
  return normalizeCastEndlessRow(rows[0])
}

async function recordCastEndlessWin(userId) {
  const before = await getCastEndlessProgress(userId)
  const tier = castEndlessCurrentTier(before)
  const col =
    tier === 'easy'
      ? 'easy_wins'
      : tier === 'mid'
        ? 'mid_wins'
        : tier === 'hard'
          ? 'hard_wins'
          : 'elite_wins'

  await query(
    `INSERT INTO user_cast_endless (user_id, ${col}, updated_at)
     VALUES ($1, 1, now())
     ON CONFLICT (user_id) DO UPDATE SET
       ${col} = user_cast_endless.${col} + 1,
       updated_at = now()`,
    [userId],
  )
  return getCastEndlessProgress(userId)
}

async function franchisesFromMovieIds(ids) {
  if (!ids?.length) return new Set()
  const { rows } = await query(
    `SELECT title, title_pt FROM movies WHERE id::text = ANY($1::text[])`,
    [ids],
  )
  const set = new Set()
  for (const r of rows) {
    const key = franchiseKey(r.title, r.title_pt)
    if (key) set.add(key)
  }
  return set
}

async function pickCastEndlessMovie(exclude, tierLabel = 'easy') {
  const tier =
    CAST_ENDLESS_TIER_POOL[tierLabel] || CAST_ENDLESS_TIER_POOL.easy
  const baseWhere = `director IS NOT NULL
      AND cast_json IS NOT NULL
      AND cast_json != '{}'::jsonb
      AND cast_json != '[]'::jsonb`
  const voteExpr = `COALESCE(
      NULLIF((cast_json -> '_tmdb' ->> 'vote_count')::numeric, 0),
      CASE WHEN cast_json ? '_tmdb' THEN 0 ELSE 10000 END
    )`

  // Últimos jogados → bloqueia a franquia inteira (não só o id)
  const recentIds = exclude.slice(-5)
  const blockedFranchises = await franchisesFromMovieIds(recentIds)

  async function fetchCandidates(opts) {
    const { minVotes, maxVotes, order, poolSize, useExclude } = opts
    const params = []
    const filters = [baseWhere]

    if (useExclude && exclude.length > 0) {
      params.push(exclude)
      filters.push(`NOT (id::text = ANY($${params.length}::text[]))`)
    }
    if (minVotes != null) {
      params.push(minVotes)
      filters.push(`${voteExpr} >= $${params.length}`)
    }
    if (maxVotes != null) {
      params.push(maxVotes)
      filters.push(`${voteExpr} <= $${params.length}`)
    }

    const orderSql =
      order === 'votes_asc'
        ? 'vc ASC NULLS LAST, random()'
        : order === 'votes_desc'
          ? 'vc DESC NULLS LAST, random()'
          : 'random()'

    const { rows } = await query(
      `SELECT id::text AS puzzle_key,
              id AS movie_id,
              title, title_pt, aliases, poster_path, poster_wide_path,
              clip_path, attribution, year, director, cast_json,
              ${voteExpr} AS vc
       FROM movies
       WHERE ${filters.join(' AND ')}
       ORDER BY ${orderSql}
       LIMIT ${Math.max(1, poolSize)}`,
      params,
    )
    return rows
  }

  function filterFranchise(rows) {
    if (!blockedFranchises.size) return rows
    const filtered = rows.filter((r) => {
      const key = franchiseKey(r.title, r.title_pt)
      return !key || !blockedFranchises.has(key)
    })
    return filtered.length ? filtered : rows
  }

  function pickOne(rows) {
    if (!rows.length) return null
    return rows[Math.floor(Math.random() * rows.length)]
  }

  const tries = [
    {
      minVotes: tier.minVotes ?? null,
      maxVotes: tier.maxVotes ?? null,
      order: tier.order,
      poolSize: tier.pool,
      useExclude: true,
    },
    // Fallback: afrouxa votos, mantém exclude + franquia
    {
      minVotes: tierLabel === 'elite' ? null : 400,
      maxVotes: tierLabel === 'easy' ? null : tier.maxVotes ?? null,
      order: 'random',
      poolSize: 250,
      useExclude: true,
    },
    {
      minVotes: null,
      maxVotes: null,
      order: 'random',
      poolSize: 80,
      useExclude: true,
    },
    {
      minVotes: null,
      maxVotes: null,
      order: 'random',
      poolSize: 1,
      useExclude: false,
    },
  ]

  for (const t of tries) {
    const rows = filterFranchise(await fetchCandidates(t))
    const row = pickOne(rows)
    if (row) return { row, tier: tier.label }
  }
  return { row: null, tier: tier.label }
}

/** Elenco infinito: dificuldade pelo progresso persistido do user (gate). */
app.get('/api/cast/next', async (req, res) => {
  try {
    const exclude = String(req.query.exclude || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    let progress = emptyCastEndlessProgress()
    let tierLabel = 'easy'
    if (req.user?.id) {
      progress = await getCastEndlessProgress(req.user.id)
      tierLabel = castEndlessCurrentTier(progress)
    }

    const { row, tier } = await pickCastEndlessMovie(exclude, tierLabel)

    if (!row) {
      res.status(404).json({ error: 'Sem posters disponíveis' })
      return
    }

    const payload = await publicCastPuzzle(row, { endless: true })
    res.json({
      ...payload,
      difficulty: tier,
      endlessProgress: progress,
    })
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

    const puzzle = await resolvePuzzle(puzzleId, 'cast')
    if (!puzzle) {
      res.status(404).json({ error: 'Puzzle não encontrado' })
      return
    }

    const correct = matchesTitle(guess, puzzle)
    const franchise = !correct && sameFranchise(guess, puzzle)
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
      franchise,
      points: correct ? points : 0,
      hintsUnlocked: attempt,
      ...(alsoGuessedCount != null ? { alsoGuessedCount } : {}),
      ...(reveal
        ? {
            title: puzzle.title,
            titlePt: primaryTitle(puzzle),
            year: puzzle.year,
            posterUrl: puzzle.poster_path,
          }
        : {}),
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

/** ——— Quem sou eu ——— */
app.get('/api/whoami/bank', async (_req, res) => {
  try {
    res.json(await publicAskBank())
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.get('/api/whoami/daily', async (req, res) => {
  try {
    const date = String(req.query.date || todayBRT())
    const puzzle = await ensureWhoamiDaily(date)
    if (!puzzle) {
      res.status(404).json({ error: 'Sem filme pro Quem sou eu' })
      return
    }
    let alreadyPlayed = false
    let priorResult = null
    if (req.user?.id) {
      const { rows } = await query(
        `SELECT won, asks, points FROM user_whoami_daily_plays
         WHERE user_id = $1 AND puzzle_date = $2::date`,
        [req.user.id, date],
      )
      if (rows[0]) {
        alreadyPlayed = true
        priorResult = {
          won: rows[0].won,
          asks: rows[0].asks,
          points: rows[0].points,
          title: puzzle.title,
          titlePt: primaryTitle(puzzle),
          year: puzzle.year,
          posterUrl: puzzle.poster_path,
        }
      }
    }
    res.json(
      await publicWhoamiPuzzle(puzzle, {
        date,
        alreadyPlayed,
        priorResult,
      }),
    )
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.get('/api/whoami/next', async (req, res) => {
  try {
    const exclude = String(req.query.exclude || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const params = []
    let where = `cast_json IS NOT NULL
      AND cast_json != '{}'::jsonb
      AND year IS NOT NULL`
    if (exclude.length) {
      params.push(exclude)
      where += ` AND NOT (id::text = ANY($${params.length}::text[]))`
    }
    let { rows } = await query(
      `SELECT id::text AS puzzle_key, id AS movie_id,
              title, title_pt, aliases, poster_path, attribution, year,
              director, cast_json, source_url
       FROM movies WHERE ${where}
       ORDER BY random() LIMIT 1`,
      params,
    )
    if (!rows[0] && exclude.length) {
      ;({ rows } = await query(
        `SELECT id::text AS puzzle_key, id AS movie_id,
                title, title_pt, aliases, poster_path, attribution, year,
                director, cast_json, source_url
         FROM movies
         WHERE cast_json IS NOT NULL AND year IS NOT NULL
         ORDER BY random() LIMIT 1`,
      ))
    }
    if (!rows[0]) {
      res.status(404).json({ error: 'Sem filmes' })
      return
    }
    const puzzle = await ensureWhoamiTraits(rows[0])
    res.json(await publicWhoamiPuzzle(puzzle, { endless: true }))
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.post('/api/whoami/ask', async (req, res) => {
  try {
    const puzzleId = String(req.body?.puzzleId || '')
    const questionId = String(req.body?.questionId || '')
    if (!puzzleId || !questionId) {
      res.status(400).json({ error: 'puzzleId e questionId obrigatórios' })
      return
    }
    const puzzle = await resolvePuzzle(puzzleId, 'whoami')
    if (!puzzle) {
      res.status(404).json({ error: 'Puzzle não encontrado' })
      return
    }
    const enriched = await ensureWhoamiTraits(puzzle)
    const result = await evaluateQuestion(enriched, questionId)
    if (!result.text) {
      res.status(400).json({ error: 'Pergunta inválida' })
      return
    }
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.post('/api/whoami/guess', async (req, res) => {
  try {
    const puzzleId = String(req.body?.puzzleId || '')
    const guess = String(req.body?.guess || '')
    const asksUsed = Math.max(0, Number(req.body?.asksUsed) || 0)
    const wrongGuesses = Math.max(0, Number(req.body?.wrongGuesses) || 0)
    const durationSec = Math.max(0, Number(req.body?.durationSec) || 0)
    if (!puzzleId || !guess.trim()) {
      res.status(400).json({ error: 'puzzleId e guess obrigatórios' })
      return
    }
    const puzzle = await resolvePuzzle(
      puzzleId,
      isDateId(puzzleId) ? 'whoami' : 'daily',
    )
    if (!puzzle) {
      res.status(404).json({ error: 'Puzzle não encontrado' })
      return
    }
    const correct = matchesTitle(guess, puzzle)
    const points = correct
      ? whoamiPoints({
          won: true,
          asksUsed,
          wrongGuesses,
          durationSec,
        })
      : 0
    res.json({
      correct,
      points,
      ...(correct
        ? {
            title: puzzle.title,
            titlePt: primaryTitle(puzzle),
            year: puzzle.year,
            posterUrl: puzzle.poster_path,
          }
        : {}),
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.post('/api/whoami/give-up', async (req, res) => {
  try {
    const puzzleId = String(req.body?.puzzleId || '')
    const asksUsed = Math.max(0, Number(req.body?.asksUsed) || 0)
    const wrongGuesses = Math.max(0, Number(req.body?.wrongGuesses) || 0)
    const durationSec = Math.max(0, Number(req.body?.durationSec) || 0)
    const endless = Boolean(req.body?.endless)
    if (!puzzleId) {
      res.status(400).json({ error: 'puzzleId obrigatório' })
      return
    }
    const puzzle = await resolvePuzzle(
      puzzleId,
      isDateId(puzzleId) ? 'whoami' : 'daily',
    )
    if (!puzzle) {
      res.status(404).json({ error: 'Puzzle não encontrado' })
      return
    }

    let progress = null
    let unlockedAchievements = []
    let points = 0

    if (req.user?.id) {
      const today = todayBRT()
      const playDate = !endless && isDateId(puzzleId) ? puzzleId : null
      const isArchive = Boolean(playDate && playDate < today)
      const beforeSnap = await achievementsSnapshot(req.user.id)
      if (playDate && !isArchive) {
        await query(
          `INSERT INTO user_whoami_daily_plays (user_id, puzzle_date, won, asks, points)
           VALUES ($1, $2::date, false, $3, 0)
           ON CONFLICT (user_id, puzzle_date) DO NOTHING`,
          [req.user.id, playDate, asksUsed],
        )
      }
      if (!isArchive) {
        await recordModeOutcome({
          userId: req.user.id,
          mode: 'whoami',
          won: false,
          points: 0,
          firstTryStreakNext: 0,
          endless: Boolean(endless),
          playDate: endless ? null : playDate,
        })
      }
      const afterSnap = await achievementsSnapshot(req.user.id)
      progress = afterSnap.progress
      unlockedAchievements = diffUnlockedAchievements(
        beforeSnap.achievements,
        afterSnap.achievements,
      )
      void durationSec
      void wrongGuesses
      void points
    }

    res.json({
      givenUp: true,
      points: 0,
      progress,
      unlockedAchievements,
      title: puzzle.title,
      titlePt: primaryTitle(puzzle),
      year: puzzle.year,
      posterUrl: puzzle.poster_path,
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.post('/api/whoami/finish', authRequired, async (req, res) => {
  try {
    const puzzleId = String(req.body?.puzzleId || '')
    const outcome = req.body?.outcome === 'win' ? 'win' : 'lose'
    const asksUsed = Math.max(0, Number(req.body?.asksUsed) || 0)
    const wrongGuesses = Math.max(0, Number(req.body?.wrongGuesses) || 0)
    const durationSec = Math.max(0, Number(req.body?.durationSec) || 0)
    const endless = Boolean(req.body?.endless)
    if (!puzzleId) {
      res.status(400).json({ error: 'puzzleId obrigatório' })
      return
    }
    const puzzle = await resolvePuzzle(
      puzzleId,
      isDateId(puzzleId) ? 'whoami' : 'daily',
    )
    if (!puzzle) {
      res.status(404).json({ error: 'Puzzle não encontrado' })
      return
    }
    const today = todayBRT()
    const playDate = !endless && isDateId(puzzleId) ? puzzleId : null
    const isArchive = Boolean(playDate && playDate < today)
    const points =
      outcome === 'win' && !isArchive
        ? whoamiPoints({ won: true, asksUsed, wrongGuesses, durationSec })
        : 0

    const beforeSnap = await achievementsSnapshot(req.user.id)
    if (playDate && !isArchive) {
      await query(
        `INSERT INTO user_whoami_daily_plays (user_id, puzzle_date, won, asks, points)
         VALUES ($1, $2::date, $3, $4, $5)
         ON CONFLICT (user_id, puzzle_date) DO NOTHING`,
        [req.user.id, playDate, outcome === 'win', asksUsed, points],
      )
    }

    if (!isArchive) {
      const prevStreak = beforeSnap.progress?.whoami?.firstTryStreak ?? 0
      await recordModeOutcome({
        userId: req.user.id,
        mode: 'whoami',
        won: outcome === 'win',
        points,
        firstTryStreakNext: outcome === 'win' ? prevStreak + 1 : 0,
        endless: Boolean(endless),
        playDate: endless ? null : playDate,
      })
    }

    const afterSnap = await achievementsSnapshot(req.user.id)
    res.json({
      points,
      progress: afterSnap.progress,
      unlockedAchievements: diffUnlockedAchievements(
        beforeSnap.achievements,
        afterSnap.achievements,
      ),
      title: puzzle.title,
      titlePt: primaryTitle(puzzle),
      year: puzzle.year,
      posterUrl: puzzle.poster_path,
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

/** ——— Palavra-chave ——— */
app.get('/api/keywords/daily', async (req, res) => {
  try {
    const date = String(req.query.date || todayBRT())
    const puzzle = await ensureKeywordsDaily(date)
    if (!puzzle) {
      res.status(404).json({ error: 'Sem filme pra Palavra-chave' })
      return
    }
    const words = resolvedKeywords(puzzle)
    if (words.length < KEYWORDS_START) {
      res.status(404).json({ error: 'Filme sem palavras suficientes' })
      return
    }
    let alreadyPlayed = false
    let priorResult = null
    if (req.user?.id) {
      const { rows } = await query(
        `SELECT won, guesses, points FROM user_keywords_daily_plays
         WHERE user_id = $1 AND puzzle_date = $2::date`,
        [req.user.id, date],
      )
      if (rows[0]) {
        alreadyPlayed = true
        priorResult = {
          won: rows[0].won,
          guesses: rows[0].guesses,
          points: rows[0].points,
          title: puzzle.title,
          titlePt: primaryTitle(puzzle),
          year: puzzle.year,
          posterUrl: puzzle.poster_path,
        }
      }
    }
    res.json(
      publicKeywordsPuzzle(puzzle, {
        date,
        alreadyPlayed,
        priorResult,
        wrongGuesses: 0,
      }),
    )
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

async function handleKeywordsAdvance({
  puzzleId,
  guess = '',
  skip = false,
  wrongGuesses = 0,
}) {
  const puzzle = await resolvePuzzle(
    puzzleId,
    isDateId(puzzleId) ? 'keywords' : 'daily',
  )
  if (!puzzle) return { status: 404, body: { error: 'Puzzle não encontrado' } }
  const enriched = await ensureKeywordsData(puzzle)
  const isSkip = Boolean(skip) || !String(guess || '').trim()
  const correct = isSkip ? false : matchesTitle(guess, enriched)
  const nextWrong = correct ? wrongGuesses : wrongGuesses + 1
  const lost = !correct && nextWrong >= KEYWORDS_MAX_WRONG
  const attempt = wrongGuesses + 1
  const points = correct ? keywordsPoints({ won: true, attempt }) : 0
  const words = resolvedKeywords(enriched)
  const prevRevealed = sliceRevealed(words, wrongGuesses)
  const revealed = sliceRevealed(words, nextWrong)
  const pixel = showPixelPoster(nextWrong)
  const added = correct
    ? 0
    : Math.max(0, revealed.length - prevRevealed.length)
  return {
    status: 200,
    body: {
      correct,
      skipped: isSkip && !correct,
      points,
      wrongGuesses: nextWrong,
      words: revealed,
      revealedCount: revealed.length,
      poolSize: words.length,
      addedWords: added,
      showPixelPoster: pixel,
      pixelPosterUrl: pixel ? enriched.poster_path || null : null,
      ended: correct || lost,
      ...(correct || lost
        ? {
            title: enriched.title,
            titlePt: primaryTitle(enriched),
            year: enriched.year,
            posterUrl: enriched.poster_path,
          }
        : {}),
    },
  }
}

app.post('/api/keywords/skip', async (req, res) => {
  try {
    const puzzleId = String(req.body?.puzzleId || '')
    const wrongGuesses = Math.min(
      KEYWORDS_MAX_WRONG,
      Math.max(0, Number(req.body?.wrongGuesses) || 0),
    )
    if (!puzzleId) {
      res.status(400).json({ error: 'puzzleId obrigatório' })
      return
    }
    const result = await handleKeywordsAdvance({
      puzzleId,
      skip: true,
      wrongGuesses,
    })
    res.status(result.status).json(result.body)
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.post('/api/keywords/guess', async (req, res) => {
  try {
    const puzzleId = String(req.body?.puzzleId || '')
    const guess = String(req.body?.guess || '')
    const skip =
      req.body?.skip === true ||
      req.body?.skip === 'true' ||
      req.body?.skip === 1 ||
      !guess.trim()
    const wrongGuesses = Math.min(
      KEYWORDS_MAX_WRONG,
      Math.max(0, Number(req.body?.wrongGuesses) || 0),
    )
    if (!puzzleId) {
      res.status(400).json({ error: 'puzzleId obrigatório' })
      return
    }
    // chute vazio = pular (não exige guess)
    const result = await handleKeywordsAdvance({
      puzzleId,
      guess,
      skip,
      wrongGuesses,
    })
    res.status(result.status).json(result.body)
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.post('/api/keywords/finish', authRequired, async (req, res) => {
  try {
    const puzzleId = String(req.body?.puzzleId || '')
    const outcome = req.body?.outcome === 'win' ? 'win' : 'lose'
    const wrongGuesses = Math.min(
      KEYWORDS_MAX_WRONG,
      Math.max(0, Number(req.body?.wrongGuesses) || 0),
    )
    const guesses = Math.min(
      KEYWORDS_MAX_WRONG,
      Math.max(1, Number(req.body?.guesses) || wrongGuesses + (outcome === 'win' ? 1 : 0)),
    )
    if (!puzzleId) {
      res.status(400).json({ error: 'puzzleId obrigatório' })
      return
    }
    const puzzle = await resolvePuzzle(
      puzzleId,
      isDateId(puzzleId) ? 'keywords' : 'daily',
    )
    if (!puzzle) {
      res.status(404).json({ error: 'Puzzle não encontrado' })
      return
    }
    const today = todayBRT()
    const playDate = isDateId(puzzleId) ? puzzleId : null
    const isArchive = Boolean(playDate && playDate < today)
    const attempt = outcome === 'win' ? guesses : wrongGuesses
    const points =
      outcome === 'win' && !isArchive
        ? keywordsPoints({ won: true, attempt })
        : 0

    const beforeSnap = await achievementsSnapshot(req.user.id)
    if (playDate && !isArchive) {
      await query(
        `INSERT INTO user_keywords_daily_plays (user_id, puzzle_date, won, guesses, points)
         VALUES ($1, $2::date, $3, $4, $5)
         ON CONFLICT (user_id, puzzle_date) DO NOTHING`,
        [req.user.id, playDate, outcome === 'win', guesses, points],
      )
    }

    if (!isArchive) {
      const prevStreak = beforeSnap.progress?.keywords?.firstTryStreak ?? 0
      await recordModeOutcome({
        userId: req.user.id,
        mode: 'keywords',
        won: outcome === 'win',
        points,
        firstTryStreakNext:
          outcome === 'win' ? (guesses === 1 ? prevStreak + 1 : prevStreak) : 0,
        endless: false,
        playDate,
      })
    }

    const afterSnap = await achievementsSnapshot(req.user.id)
    res.json({
      points,
      progress: afterSnap.progress,
      unlockedAchievements: diffUnlockedAchievements(
        beforeSnap.achievements,
        afterSnap.achievements,
      ),
      title: puzzle.title,
      titlePt: primaryTitle(puzzle),
      year: puzzle.year,
      posterUrl: puzzle.poster_path,
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

async function getCharacterById(id) {
  const { rows } = await query(
    `SELECT id::text AS puzzle_key, id, name, name_pt, aliases,
            film_title, image_path, attribution, crop_json
     FROM characters WHERE id = $1::uuid`,
    [id],
  )
  return rows[0] || null
}

/** Índice 0 = Odeo no CHARACTER_EPOCH; datas anteriores ao lançamento = null. */
function characterDayIndex(dateStr) {
  const epoch = Date.parse(`${CHARACTER_EPOCH}T12:00:00Z`)
  const day = Date.parse(`${dateStr}T12:00:00Z`)
  if (!Number.isFinite(epoch) || !Number.isFinite(day)) return null
  const idx = Math.floor((day - epoch) / 86400000)
  return idx < 0 ? null : idx
}

async function ensureCharacterDaily(dateStr) {
  if (characterDayIndex(dateStr) === null) return null

  const { rows: existing } = await query(
    `SELECT c.id::text AS puzzle_key, c.id, c.name, c.name_pt, c.aliases,
            c.film_title, c.image_path, c.attribution, c.crop_json
     FROM character_daily d
     JOIN characters c ON c.id = d.character_id
     WHERE d.puzzle_date = $1::date`,
    [dateStr],
  )
  if (existing[0]) return existing[0]

  const characterId = await drawWithoutReplacement({
    mode: 'character',
    dateStr,
    listEligible: listCharacterEligibleIds,
  })
  if (!characterId) return null

  await query(
    `INSERT INTO character_daily (puzzle_date, character_id)
     VALUES ($1::date, $2::uuid)
     ON CONFLICT (puzzle_date) DO NOTHING`,
    [dateStr, characterId],
  )

  const { rows } = await query(
    `SELECT c.id::text AS puzzle_key, c.id, c.name, c.name_pt, c.aliases,
            c.film_title, c.image_path, c.attribution, c.crop_json
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
    cropStages: resolveCropStages(ch.crop_json, ch.image_path),
    ...extra,
  }
}

app.get('/api/character/daily', async (req, res) => {
  try {
    const date = String(req.query.date || todayBRT())
    if (characterDayIndex(date) === null) {
      res.status(404).json({
        error: 'Personagem diário começa em 30/10/2026 — sem dias anteriores',
      })
      return
    }
    const ch = await ensureCharacterDaily(date)
    if (!ch) {
      res.status(404).json({ error: 'Sem personagens cadastrados' })
      return
    }
    let alreadyPlayed = false
    let priorResult = null
    if (req.user) {
      const play = await getCharacterDailyPlayResult(req.user.id, date)
      alreadyPlayed = Boolean(play)
      if (play) {
        priorResult = {
          won: play.won,
          take: play.take,
          points: play.points,
          name: ch.name,
          namePt: ch.name_pt || ch.name,
          filmTitle: ch.film_title,
          imageUrl: ch.image_path,
        }
      }
    }
    res.json(
      publicCharacterPuzzle(ch, {
        date,
        puzzleId: date,
        alreadyPlayed,
        priorResult,
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
    const photoOnly = `image_path LIKE '/characters/%'`
    let { rows } = await query(
      `SELECT id::text AS puzzle_key, id, name, name_pt, aliases,
              film_title, image_path, attribution, crop_json
       FROM characters WHERE (${where}) AND ${photoOnly}
       ORDER BY random() LIMIT 1`,
      params,
    )
    if (rows.length === 0) {
      ;({ rows } = await query(
        `SELECT id::text AS puzzle_key, id, name, name_pt, aliases,
                film_title, image_path, attribution, crop_json
         FROM characters WHERE ${photoOnly}
         ORDER BY random() LIMIT 1`,
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
    // Fold acentos no SQL pra casar "dalmatas" com "Dálmatas" / film_title EN.
    // from/to precisam ter o mesmo length (PostgreSQL translate).
    const fold = (col) =>
      `translate(lower(coalesce(${col}, '')),
        'áàâãäåéèêëíìîïóòôõöøúùûüýÿçñ',
        'aaaaaaeeeeiiiioooooouuuuyycn')`
    const { rows } = await query(
      `WITH matched_films AS (
         SELECT DISTINCT film_title
         FROM characters
         WHERE film_title IS NOT NULL
           AND film_title <> ''
           AND (
             ${fold('film_title')} LIKE $1
             OR EXISTS (
               SELECT 1 FROM unnest(aliases) a
               WHERE ${fold('a')} LIKE $1
             )
           )
       )
       SELECT c.name, c.name_pt, c.film_title,
              CASE
                WHEN ${fold('c.name')} LIKE $1
                  OR ${fold('c.name_pt')} LIKE $1
                  OR EXISTS (
                    SELECT 1 FROM unnest(c.aliases) a
                    WHERE ${fold('a')} LIKE $1
                  )
                THEN 0
                ELSE 1
              END AS name_rank
       FROM characters c
       WHERE ${fold('c.name')} LIKE $1
          OR ${fold('c.name_pt')} LIKE $1
          OR ${fold('c.film_title')} LIKE $1
          OR EXISTS (
            SELECT 1 FROM unnest(c.aliases) a
            WHERE ${fold('a')} LIKE $1
          )
          OR c.film_title IN (SELECT film_title FROM matched_films)
       ORDER BY name_rank ASC, c.film_title ASC NULLS LAST, c.name ASC
       LIMIT 20`,
      [`%${q}%`],
    )
    res.json({
      suggestions: rows.map((r) => ({
        title: r.name,
        titlePt: r.name_pt || r.name,
        label: formatCharacterLabel(r),
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
      // Só bloqueia personagem de HOJE; arquivo pode repetir (0 pts)
      if (!endless && dateKey && !isArchive) {
        const { rows: played } = await query(
          `SELECT 1 FROM user_character_daily_plays
           WHERE user_id = $1 AND puzzle_date = $2::date`,
          [req.user.id, dateKey],
        )
        if (played.length > 0) {
          res.status(409).json({ error: 'Você já jogou o personagem de hoje' })
          return
        }
      }

      let unlockedAchievements = []
      let scoredPoints = 0
      let scoredNextStreak = 0
      if (!isArchive) {
        const beforeSnap = await achievementsSnapshot(req.user.id)
        const firstTryStreak =
          beforeSnap.progress?.character?.firstTryStreak ?? 0
        const scored = scoreRound({
          won: correct,
          take: attempt,
          firstTryStreak,
          pointsTable: CHARACTER_POINTS,
        })
        scoredPoints = scored.points
        scoredNextStreak = scored.nextStreak
        points = scored.points

        if (!endless && dateKey) {
          await query(
            `INSERT INTO user_character_daily_plays (user_id, puzzle_date, won, take, points)
             VALUES ($1, $2::date, $3, $4, $5)
             ON CONFLICT (user_id, puzzle_date) DO NOTHING`,
            [req.user.id, dateKey, correct, attempt, points],
          )
        }

        await recordModeOutcome({
          userId: req.user.id,
          mode: 'character',
          won: correct,
          points: scoredPoints,
          firstTryStreakNext: scoredNextStreak,
          endless: Boolean(endless),
          playDate: endless ? null : dateKey,
        })
        const afterSnap = await achievementsSnapshot(req.user.id)
        unlockedAchievements = diffUnlockedAchievements(
          beforeSnap.achievements,
          afterSnap.achievements,
        )
        progress = afterSnap.progress
      } else if (!endless && dateKey) {
        await query(
          `INSERT INTO user_character_daily_plays (user_id, puzzle_date, won, take, points)
           VALUES ($1, $2::date, $3, $4, 0)
           ON CONFLICT (user_id, puzzle_date) DO UPDATE SET
             won = EXCLUDED.won, take = EXCLUDED.take, points = 0`,
          [req.user.id, dateKey, correct, attempt],
        )
      }
      if (!progress) progress = await getProgress(req.user.id)

      res.json({
        correct,
        points,
        progress,
        unlockedAchievements,
        name: ch.name,
        namePt: ch.name_pt || ch.name,
        filmTitle: ch.film_title,
        imageUrl: ch.image_path,
      })
      return
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
            namePt: ch.name_pt || ch.name,
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

async function achievementsSnapshot(userId) {
  const progress = await getProgress(userId)
  const endless = await getCastEndlessProgress(userId)
  const dailyWinsByMode = await loadDailyWinsByMode(userId)
  return {
    progress,
    endless,
    achievements: buildAchievements({ progress, endless, dailyWinsByMode }),
  }
}

/** Catálogo de Óscares + progresso do user (se logado) + % comunidade */
app.get('/api/oscars', async (req, res) => {
  try {
    const rates = await loadCommunityRates()
    let achievements
    if (req.user?.id) {
      const snap = await achievementsSnapshot(req.user.id)
      achievements = withCommunityRates(snap.achievements, rates)
    } else {
      achievements = withCommunityRates(
        buildAchievements({
          progress: null,
          endless: null,
          dailyWinsByMode: {},
        }),
        rates,
      )
    }
    const unlocked = achievements.filter((a) => !a.locked).length
    res.json({
      achievements,
      categories: CATEGORY_LABEL,
      unlocked,
      total: achievements.length,
      remaining: Math.max(0, achievements.length - unlocked),
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    email: user.email,
    emailVerified: Boolean(user.email_verified),
    avatarUrl: user.avatar_url || null,
    bio: user.bio || '',
    isAdmin: Boolean(user.is_admin),
  }
}

async function publicProfileCard(user, progress = null) {
  const snap = await achievementsSnapshot(user.id)
  const rates = await loadCommunityRates()
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name || user.username,
    avatarUrl: user.avatar_url || null,
    bio: user.bio || '',
    progress: progress || snap.progress,
    endlessProgress: snap.endless,
    achievements: withCommunityRates(snap.achievements, rates),
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
    const user = await findUserById(req.user.id)
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' })
      return
    }
    const progress = await getProgress(user.id)
    const date = todayBRT()
    const alreadyPlayed = await hasPlayedDaily(user.id, date)
    const castPlayedToday = await hasPlayedCastDaily(user.id, date)
    const characterPlayedToday = await hasPlayedCharacterDaily(user.id, date)
    const keywordsPlayedToday = await hasPlayedKeywordsDaily(user.id, date)
    const whoamiPlayedToday = await hasPlayedWhoamiDaily(user.id, date)
    res.json({
      user: publicUser(user),
      progress,
      dailyPlayedToday: alreadyPlayed,
      castPlayedToday,
      characterPlayedToday,
      keywordsPlayedToday,
      whoamiPlayedToday,
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

/** Ping do dashboard — 403 se não for admin. */
app.get('/api/admin/status', authAdminRequired, async (req, res) => {
  try {
    const { rows: movieCount } = await query(
      `SELECT COUNT(*)::int AS n FROM movies`,
    )
    const { rows: clipCount } = await query(
      `SELECT COUNT(*)::int AS n FROM movies
       WHERE clip_path IS NOT NULL AND clip_path <> ''`,
    )
    const { rows: charCount } = await query(
      `SELECT COUNT(*)::int AS n FROM characters
       WHERE image_path LIKE '/characters/%'`,
    )
    res.json({
      ok: true,
      admin: publicUser(req.adminUser),
      stats: {
        movies: movieCount[0]?.n ?? 0,
        clips: clipCount[0]?.n ?? 0,
        characters: charCount[0]?.n ?? 0,
      },
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.get('/api/admin/characters', authAdminRequired, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    const params = []
    let where = `image_path LIKE '/characters/%'`
    if (q) {
      params.push(`%${q}%`)
      where += ` AND (name ILIKE $1 OR name_pt ILIKE $1 OR film_title ILIKE $1)`
    }
    const { rows } = await query(
      `SELECT id::text AS id, name, name_pt, film_title, image_path, attribution,
              crop_json, movie_id::text AS movie_id
       FROM characters
       WHERE ${where}
       ORDER BY lower(COALESCE(name_pt, name)) ASC
       LIMIT 200`,
      params,
    )
    res.json({ characters: rows.map(publicAdminCharacter) })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.get('/api/admin/characters/:id', authAdminRequired, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id::text AS id, name, name_pt, film_title, image_path, attribution,
              crop_json, movie_id::text AS movie_id
       FROM characters WHERE id = $1::uuid`,
      [String(req.params.id)],
    )
    if (!rows[0]) {
      res.status(404).json({ error: 'Personagem não encontrado' })
      return
    }
    res.json({ character: publicAdminCharacter(rows[0]) })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.get('/api/admin/tmdb/search', authAdminRequired, async (req, res) => {
  try {
    if (!tmdbConfigured()) {
      res.status(503).json({ error: 'TMDB_API_KEY não configurada no server' })
      return
    }
    const q = String(req.query.q || '').trim()
    if (q.length < 2) {
      res.json({ results: [] })
      return
    }
    const yearRaw = req.query.year
    const year = yearRaw != null && yearRaw !== '' ? Number(yearRaw) : null
    const results = await searchTmdbMovies(q, {
      year: Number.isFinite(year) ? year : null,
      limit: 12,
    })
    res.json({ results })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.get('/api/admin/tmdb/movie/:tmdbId', authAdminRequired, async (req, res) => {
  try {
    if (!tmdbConfigured()) {
      res.status(503).json({ error: 'TMDB_API_KEY não configurada no server' })
      return
    }
    const tmdbId = Number(req.params.tmdbId)
    if (!Number.isFinite(tmdbId)) {
      res.status(400).json({ error: 'tmdbId inválido' })
      return
    }
    const bundle = await fetchMovieBundle(tmdbId)
    if (!bundle) {
      res.status(404).json({ error: 'Filme não encontrado no TMDB' })
      return
    }
    const { details, credits } = bundle
    const castJson = buildCastJsonFromTmdb(details, credits, {
      id: details.id,
      popularity: details.popularity,
      vote_count: details.vote_count,
    })
    const director = directorNameFromCredits(credits)
    const year = details.release_date
      ? Number(String(details.release_date).slice(0, 4)) || null
      : null
    const title = details.original_title || details.title || ''
    const titlePt = details.title || details.original_title || title
    const posterUrl = posterUrlFromPath(details.poster_path)
    const moviePreview = {
      tmdbId: details.id,
      title,
      titlePt,
      year,
      director,
      posterPath: details.poster_path || null,
      posterUrl,
      overview: details.overview || '',
      castJson,
      hints: previewCastHints({
        director,
        year,
        cast_json: castJson,
      }),
    }

    const { rows: existing } = await query(
      `SELECT id::text AS id, title, title_pt, year, poster_path
       FROM movies
       WHERE cast_json -> '_tmdb' ->> 'id' = $1
          OR (
            (lower(title) = lower($2) OR lower(coalesce(title_pt,'')) = lower($3))
            AND ($4::int IS NULL OR year = $4::int)
          )
       LIMIT 1`,
      [String(details.id), title, titlePt, year],
    )

    res.json({
      movie: moviePreview,
      existingId: existing[0]?.id || null,
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.get('/api/admin/clips', authAdminRequired, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    const params = []
    let where = `clip_path IS NOT NULL AND clip_path <> ''`
    if (q) {
      params.push(`%${q}%`)
      where += ` AND (title ILIKE $1 OR title_pt ILIKE $1)`
    }
    const { rows } = await query(
      `SELECT id::text AS id, title, title_pt, year, poster_path, clip_path
       FROM movies
       WHERE ${where}
       ORDER BY lower(COALESCE(title_pt, title)) ASC
       LIMIT 200`,
      params,
    )
    res.json({
      clips: rows.map((r) => ({
        id: r.id,
        title: r.title,
        titlePt: r.title_pt || r.title,
        year: r.year,
        posterUrl: r.poster_path || null,
        clipUrl: r.clip_path,
      })),
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

/** ——— Admin Quem sou eu (traits + perguntas) ——— */
app.get('/api/admin/whoami/meta', authAdminRequired, async (_req, res) => {
  try {
    res.json({
      categories: WHOAMI_CATEGORIES,
      studios: STUDIO_OPTIONS,
      tags: TAG_OPTIONS,
      ruleTypes: RULE_TYPES,
      boolFields: BOOL_FIELDS,
      boolPaths: BOOL_PATHS,
      eqPaths: EQ_PATHS,
      askBank: await publicAskBank(),
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.get('/api/admin/whoami/questions', authAdminRequired, async (_req, res) => {
  try {
    const data = await listAdminQuestions()
    res.json({
      ...data,
      ruleTypes: RULE_TYPES,
      boolFields: BOOL_FIELDS,
      boolPaths: BOOL_PATHS,
      eqPaths: EQ_PATHS,
      studios: STUDIO_OPTIONS,
      tags: TAG_OPTIONS,
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.post('/api/admin/whoami/categories', authAdminRequired, async (req, res) => {
  try {
    const cat = await upsertAdminCategory({
      id: req.body?.id,
      label: req.body?.label,
      sortOrder: req.body?.sortOrder,
    })
    res.json({ category: cat })
  } catch (err) {
    res.status(400).json({ error: String(err.message) })
  }
})

app.post('/api/admin/whoami/questions', authAdminRequired, async (req, res) => {
  try {
    const question = await upsertAdminQuestion(req.body)
    res.json({ question })
  } catch (err) {
    res.status(400).json({ error: String(err.message) })
  }
})

app.patch(
  '/api/admin/whoami/questions/:id',
  authAdminRequired,
  async (req, res) => {
    try {
      const question = await upsertAdminQuestion({
        ...req.body,
        id: req.params.id,
      })
      res.json({ question })
    } catch (err) {
      res.status(400).json({ error: String(err.message) })
    }
  },
)

app.delete(
  '/api/admin/whoami/questions/:id',
  authAdminRequired,
  async (req, res) => {
    try {
      await deleteAdminQuestion(req.params.id)
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: String(err.message) })
    }
  },
)

app.get('/api/admin/whoami/movies', authAdminRequired, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    const params = []
    let where = `year IS NOT NULL`
    if (q) {
      params.push(`%${q}%`)
      where += ` AND (title ILIKE $1 OR title_pt ILIKE $1)`
    }
    const { rows } = await query(
      `SELECT id::text AS id, title, title_pt, year, poster_path, cast_json
       FROM movies
       WHERE ${where}
       ORDER BY lower(COALESCE(title_pt, title)) ASC
       LIMIT 120`,
      params,
    )
    res.json({
      movies: rows.map((r) => {
        const completeness = traitsCompleteness(r)
        return {
          id: r.id,
          title: r.title,
          titlePt: r.title_pt || r.title,
          year: r.year,
          posterUrl: r.poster_path || null,
          completeness,
        }
      }),
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.get('/api/admin/whoami/movies/:id', authAdminRequired, async (req, res) => {
  try {
    const id = String(req.params.id || '')
    const { rows } = await query(
      `SELECT id::text AS id, title, title_pt, year, poster_path, director,
              cast_json, source_url
       FROM movies WHERE id::text = $1 LIMIT 1`,
      [id],
    )
    if (!rows[0]) {
      res.status(404).json({ error: 'Filme não encontrado' })
      return
    }
    let movie = rows[0]
    movie = await ensureWhoamiTraits(movie)
    const completeness = traitsCompleteness(movie)
    res.json({
      movie: {
        id: movie.id,
        title: movie.title,
        titlePt: movie.title_pt || movie.title,
        year: movie.year,
        director: movie.director || null,
        posterUrl: movie.poster_path || null,
        traits: publicTraitsForAdmin(movie),
        completeness,
        preview: await previewAllAnswers(movie),
      },
      meta: {
        categories: WHOAMI_CATEGORIES,
        studios: STUDIO_OPTIONS,
        tags: TAG_OPTIONS,
      },
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.patch(
  '/api/admin/whoami/movies/:id/traits',
  authAdminRequired,
  async (req, res) => {
    try {
      const id = String(req.params.id || '')
      const patch = req.body?.traits
      if (!id || !patch || typeof patch !== 'object') {
        res.status(400).json({ error: 'traits obrigatório' })
        return
      }
      const { rows } = await query(
        `SELECT id::text AS id, title, title_pt, year, poster_path, director, cast_json
         FROM movies WHERE id::text = $1 LIMIT 1`,
        [id],
      )
      if (!rows[0]) {
        res.status(404).json({ error: 'Filme não encontrado' })
        return
      }
      const merged = mergeTraitsPatch(rows[0].cast_json, patch)
      await query(`UPDATE movies SET cast_json = $2::jsonb WHERE id::text = $1`, [
        id,
        JSON.stringify(merged),
      ])
      const movie = { ...rows[0], cast_json: merged }
      res.json({
        movie: {
          id: movie.id,
          title: movie.title,
          titlePt: movie.title_pt || movie.title,
          year: movie.year,
          director: movie.director || null,
          posterUrl: movie.poster_path || null,
          traits: publicTraitsForAdmin(movie),
          completeness: traitsCompleteness(movie),
          preview: await previewAllAnswers(movie),
        },
      })
    } catch (err) {
      res.status(500).json({ error: String(err.message) })
    }
  },
)

app.get('/api/admin/movies/:id', authAdminRequired, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id::text AS id, title, title_pt, year, poster_path, clip_path,
              director, cast_json
       FROM movies WHERE id = $1::uuid`,
      [String(req.params.id)],
    )
    if (!rows[0]) {
      res.status(404).json({ error: 'Filme não encontrado' })
      return
    }
    const r = rows[0]
    res.json({
      movie: {
        id: r.id,
        title: r.title,
        titlePt: r.title_pt || r.title,
        year: r.year,
        posterUrl: r.poster_path || null,
        clipUrl: r.clip_path || null,
        director: r.director || null,
        hasClip: Boolean(r.clip_path),
      },
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.post(
  '/api/admin/movies/:id/clip',
  authAdminRequired,
  adminClipRaw,
  async (req, res) => {
    try {
      const id = String(req.params.id || '')
      const overwrite =
        String(req.query.overwrite || req.headers['x-overwrite'] || '') ===
          '1' ||
        String(req.query.overwrite || '').toLowerCase() === 'true'

      const { rows: existing } = await query(
        `SELECT id::text AS id, title, title_pt, year, poster_path, clip_path
         FROM movies WHERE id = $1::uuid`,
        [id],
      )
      if (!existing[0]) {
        res.status(404).json({ error: 'Filme não encontrado' })
        return
      }
      if (existing[0].clip_path && !overwrite) {
        res.status(409).json({
          error: 'Filme já tem clipe — confirme sobrescrita',
          clipUrl: existing[0].clip_path,
        })
        return
      }

      const buf = Buffer.isBuffer(req.body) ? req.body : null
      if (!buf || buf.length < 1000) {
        res.status(400).json({
          error: 'Envie o MP4 no body (video/mp4, até ~40MB)',
        })
        return
      }
      if (buf.length > 40 * 1024 * 1024) {
        res.status(413).json({ error: 'Clipe muito grande (máx 40MB)' })
        return
      }
      // ftyp box roughly marks MP4/QuickTime
      const head = buf.subarray(0, 12).toString('latin1')
      if (!head.includes('ftyp') && !head.includes('moov')) {
        res.status(400).json({ error: 'Arquivo não parece MP4 válido' })
        return
      }

      fs.mkdirSync(CLIPS_DIR, { recursive: true })
      const baseName =
        slugCharacter(existing[0].title_pt || existing[0].title) ||
        `clip-${Date.now()}`
      let filename = `${baseName}.mp4`
      let full = path.join(CLIPS_DIR, filename)
      // Se já existe outro filme com o mesmo path, ou estamos sobrescrevendo o mesmo arquivo,
      // reutiliza o nome do slug; se o arquivo existe mas é de outro filme, sufixa.
      if (fs.existsSync(full) && existing[0].clip_path !== `/clips/${filename}`) {
        filename = `${baseName}-${Date.now()}.mp4`
        full = path.join(CLIPS_DIR, filename)
      }
      fs.writeFileSync(full, buf)
      const clipPath = `/clips/${filename}`

      // Remove arquivo antigo se era outro path sob /clips/
      const old = existing[0].clip_path
      if (
        old &&
        old !== clipPath &&
        String(old).startsWith('/clips/') &&
        !String(old).includes('..')
      ) {
        const oldFull = path.join(CLIPS_DIR, path.basename(old))
        if (fs.existsSync(oldFull)) {
          try {
            fs.unlinkSync(oldFull)
          } catch {
            /* ignore */
          }
        }
      }

      const { rows } = await query(
        `UPDATE movies SET clip_path = $2
         WHERE id = $1::uuid
         RETURNING id::text AS id, title, title_pt, year, poster_path, clip_path`,
        [id, clipPath],
      )
      const r = rows[0]
      res.json({
        movie: {
          id: r.id,
          title: r.title,
          titlePt: r.title_pt || r.title,
          year: r.year,
          posterUrl: r.poster_path || null,
          clipUrl: r.clip_path,
          hasClip: true,
          overwritten: Boolean(old),
        },
      })
    } catch (err) {
      res.status(500).json({ error: String(err.message) })
    }
  },
)

app.post('/api/admin/movies/from-tmdb', authAdminRequired, async (req, res) => {
  try {
    if (!tmdbConfigured()) {
      res.status(503).json({ error: 'TMDB_API_KEY não configurada no server' })
      return
    }
    const tmdbId = Number(req.body?.tmdbId)
    if (!Number.isFinite(tmdbId)) {
      res.status(400).json({ error: 'tmdbId obrigatório' })
      return
    }

    const bundle = await fetchMovieBundle(tmdbId)
    if (!bundle) {
      res.status(404).json({ error: 'Filme não encontrado no TMDB' })
      return
    }
    const { details, credits } = bundle
    let castJson = buildCastJsonFromTmdb(details, credits, {
      id: details.id,
      popularity: details.popularity,
      vote_count: details.vote_count,
    })
    if (req.body?.castJson && typeof req.body.castJson === 'object') {
      castJson = {
        ...castJson,
        ...req.body.castJson,
        _tmdb: castJson._tmdb,
      }
    }

    const director =
      String(req.body?.director || '').trim() ||
      directorNameFromCredits(credits) ||
      null
    const year = details.release_date
      ? Number(String(details.release_date).slice(0, 4)) || null
      : null
    const title =
      String(req.body?.title || '').trim() ||
      details.original_title ||
      details.title ||
      ''
    const titlePt =
      String(req.body?.titlePt || '').trim() ||
      details.title ||
      details.original_title ||
      title
    if (!title) {
      res.status(400).json({ error: 'Título obrigatório' })
      return
    }
    const posterUrl = posterUrlFromPath(details.poster_path)
    if (!posterUrl) {
      res.status(400).json({ error: 'Filme sem pôster no TMDB' })
      return
    }
    const aliases = Array.from(
      new Set([title, titlePt].filter(Boolean).map((s) => String(s).trim())),
    )
    const attribution = 'TMDB'
    const sourceUrl = `https://www.themoviedb.org/movie/${details.id}`

    const { rows: byTmdb } = await query(
      `SELECT id::text AS id FROM movies
       WHERE cast_json -> '_tmdb' ->> 'id' = $1
       LIMIT 1`,
      [String(details.id)],
    )
    let existingId = byTmdb[0]?.id || null
    if (!existingId) {
      const { rows: byTitle } = await query(
        `SELECT id::text AS id FROM movies
         WHERE (lower(title) = lower($1) OR lower(coalesce(title_pt,'')) = lower($2))
           AND ($3::int IS NULL OR year = $3::int)
         LIMIT 1`,
        [title, titlePt, year],
      )
      existingId = byTitle[0]?.id || null
    }

    let row
    if (existingId) {
      const { rows } = await query(
        `UPDATE movies SET
           title = $2,
           title_pt = $3,
           year = $4,
           aliases = $5,
           poster_path = $6,
           director = COALESCE($7, director),
           cast_json = $8::jsonb,
           attribution = COALESCE(NULLIF(attribution, ''), $9),
           source_url = COALESCE(NULLIF(source_url, ''), $10)
         WHERE id = $1::uuid
         RETURNING id::text AS id, title, title_pt, year, poster_path, director, cast_json`,
        [
          existingId,
          title,
          titlePt,
          year,
          aliases,
          posterUrl,
          director,
          JSON.stringify(castJson),
          attribution,
          sourceUrl,
        ],
      )
      row = rows[0]
    } else {
      const { rows } = await query(
        `INSERT INTO movies
           (title, title_pt, year, aliases, license, source_url, attribution,
            poster_path, clip_path, director, cast_json)
         VALUES
           ($1,$2,$3,$4,'review',$5,$6,$7,NULL,$8,$9::jsonb)
         RETURNING id::text AS id, title, title_pt, year, poster_path, director, cast_json`,
        [
          title,
          titlePt,
          year,
          aliases,
          sourceUrl,
          attribution,
          posterUrl,
          director,
          JSON.stringify(castJson),
        ],
      )
      row = rows[0]
    }

    res.status(existingId ? 200 : 201).json({
      movie: {
        id: row.id,
        title: row.title,
        titlePt: row.title_pt,
        year: row.year,
        director: row.director,
        posterUrl: row.poster_path,
        castJson: row.cast_json,
        hints: previewCastHints({
          director: row.director,
          year: row.year,
          cast_json: row.cast_json,
        }),
        updated: Boolean(existingId),
      },
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

app.patch('/api/me/profile', authRequired, async (req, res) => {
  try {
    const username = String(req.body?.username || '')
      .trim()
      .toLowerCase()
    const displayName = String(
      req.body?.displayName || req.body?.username || '',
    ).trim()
    const bio =
      req.body?.bio !== undefined
        ? String(req.body.bio || '').slice(0, 500)
        : undefined
    let avatarUrl = req.body?.avatarUrl
    if (avatarUrl !== undefined && avatarUrl != null) {
      avatarUrl = String(avatarUrl).trim()
      if (avatarUrl.length > 900_000) {
        res.status(400).json({ error: 'Avatar muito grande — use outra foto' })
        return
      }
      if (avatarUrl === '') avatarUrl = null
    }
    if (username) {
      if (!/^[a-z0-9_]{3,32}$/.test(username)) {
        res.status(400).json({
          error: 'Username: 3–32 chars, a-z, 0-9 e _',
        })
        return
      }
      const taken = await findUserByUsername(username)
      if (taken && taken.id !== req.user.id) {
        res.status(409).json({ error: 'Username já em uso' })
        return
      }
    }

    const sets = []
    const params = []
    if (username) {
      params.push(username)
      sets.push(`username = $${params.length}`)
      params.push(displayName || username)
      sets.push(`display_name = $${params.length}`)
    } else if (displayName) {
      params.push(displayName)
      sets.push(`display_name = $${params.length}`)
    }
    if (bio !== undefined) {
      params.push(bio)
      sets.push(`bio = $${params.length}`)
    }
    if (avatarUrl !== undefined) {
      params.push(avatarUrl)
      sets.push(`avatar_url = $${params.length}`)
    }
    if (sets.length === 0) {
      res.status(400).json({ error: 'Nada pra atualizar' })
      return
    }
    params.push(req.user.id)
    await query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}`,
      params,
    )
    const user = await findUserById(req.user.id)
    res.json({ user: publicUser(user) })
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
        userId: r.user_id,
        name: r.name,
        username: r.username,
        avatarUrl: r.avatar_url || null,
        score: r.score,
        streak: r.streak,
      })),
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

/** Lista / busca perfis públicos */
app.get('/api/users', async (req, res) => {
  try {
    const q = String(req.query.q || '')
    const rows = await searchUsers(q, 24)
    res.json({
      users: rows.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.display_name || u.username,
        avatarUrl: u.avatar_url || null,
        bio: u.bio || '',
      })),
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

/** Perfil público (foto, bio, conquistas) */
app.get('/api/users/:username', async (req, res) => {
  try {
    const username = String(req.params.username || '').trim()
    const user = await findUserByUsername(username)
    if (!user) {
      res.status(404).json({ error: 'Perfil não encontrado' })
      return
    }
    const progress = await getProgress(user.id)
    res.json({ profile: await publicProfileCard(user, progress) })
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
    /** Casting infinito / Maratona: sem trava de “já jogou hoje” */
    const endlessRound =
      Boolean(req.body?.endless) || mode === 'classic'

    if (!puzzleId || !Number.isInteger(take) || take < 1 || take > maxTake) {
      res.status(400).json({ error: 'Dados inválidos' })
      return
    }

    const puzzle = await resolvePuzzle(
      puzzleId,
      mode === 'cast' ? 'cast' : 'daily',
    )
    if (!puzzle) {
      res.status(404).json({ error: 'Puzzle não encontrado' })
      return
    }

    const today = todayBRT()
    // Só diário (data) entra em playDate. Casting endless NUNCA.
    let playDate = null
    if (!endlessRound) {
      if (mode === 'daily') {
        playDate = isDateId(puzzleId) ? puzzleId : today
      } else if (mode === 'cast' && isDateId(puzzleId)) {
        playDate = puzzleId
      }
    }
    /** Arquivo (calendário): jogável à vontade, 0 pts */
    const isArchive = Boolean(playDate && playDate < today)

    // Só bloqueia o diário DE HOJE (arquivo pode repetir; endless nunca)
    if (!endlessRound && mode === 'daily' && playDate && !isArchive) {
      if (await hasPlayedDaily(req.user.id, playDate)) {
        res.status(409).json({ error: 'Você já jogou o daily de hoje' })
        return
      }
    }
    if (!endlessRound && mode === 'cast' && playDate && !isArchive) {
      if (await hasPlayedCastDaily(req.user.id, playDate)) {
        res.status(409).json({ error: 'Você já jogou o poster de hoje' })
        return
      }
    }

    let scored = { points: 0, multiplier: 1, nextStreak: 0 }

    const beforeSnap = await achievementsSnapshot(req.user.id)
    const endlessBefore = beforeSnap.endless
    const achievementsBefore = beforeSnap.achievements

    if (!isArchive) {
      const firstTryStreak = beforeSnap.progress?.[mode]?.firstTryStreak ?? 0
      scored = scoreRound({
        won: outcome === 'win',
        take,
        firstTryStreak,
        pointsTable: mode === 'cast' ? CAST_POINTS : undefined,
      })
    }

    // Grava daily play antes do snapshot de conquistas (contagem de wins)
    if (mode === 'daily' && playDate && !isArchive) {
      await query(
        `INSERT INTO user_daily_plays (user_id, puzzle_date, won, take, points)
         VALUES ($1, $2::date, $3, $4, $5)
         ON CONFLICT (user_id, puzzle_date) DO NOTHING`,
        [req.user.id, playDate, outcome === 'win', take, scored.points],
      )
    }
    if (mode === 'cast' && playDate && !isArchive) {
      await query(
        `INSERT INTO user_cast_daily_plays (user_id, puzzle_date, won, take, points)
         VALUES ($1, $2::date, $3, $4, $5)
         ON CONFLICT (user_id, puzzle_date) DO NOTHING`,
        [req.user.id, playDate, outcome === 'win', take, scored.points],
      )
    }

    if (!isArchive) {
      await recordModeOutcome({
        userId: req.user.id,
        mode,
        won: outcome === 'win',
        points: scored.points,
        firstTryStreakNext: scored.nextStreak,
        endless: endlessRound,
        playDate: endlessRound ? null : playDate,
      })
    }
    // Arquivo: grava tentativa com 0 pts (permite jogar de novo; não trava)
    if (isArchive && mode === 'daily' && playDate) {
      await query(
        `INSERT INTO user_daily_plays (user_id, puzzle_date, won, take, points)
         VALUES ($1, $2::date, $3, $4, 0)
         ON CONFLICT (user_id, puzzle_date) DO UPDATE SET
           won = EXCLUDED.won, take = EXCLUDED.take, points = 0`,
        [req.user.id, playDate, outcome === 'win', take],
      )
    }
    if (isArchive && mode === 'cast' && playDate) {
      await query(
        `INSERT INTO user_cast_daily_plays (user_id, puzzle_date, won, take, points)
         VALUES ($1, $2::date, $3, $4, 0)
         ON CONFLICT (user_id, puzzle_date) DO UPDATE SET
           won = EXCLUDED.won, take = EXCLUDED.take, points = 0`,
        [req.user.id, playDate, outcome === 'win', take],
      )
    }

    let endlessProgress = endlessBefore
    if (
      mode === 'cast' &&
      endlessRound &&
      outcome === 'win' &&
      !isArchive
    ) {
      endlessProgress = await recordCastEndlessWin(req.user.id)
    }

    const afterSnap = await achievementsSnapshot(req.user.id)
    const unlockedAchievements = diffUnlockedAchievements(
      achievementsBefore,
      afterSnap.achievements,
    )

    res.json({
      points: scored.points,
      multiplier: scored.multiplier,
      archive: isArchive,
      progress: afterSnap.progress,
      endlessProgress:
        mode === 'cast' ? endlessProgress : afterSnap.endless,
      unlockedAchievements,
      title: puzzle.title,
      titlePt: primaryTitle(puzzle),
      year: puzzle.year,
      posterUrl: puzzle.poster_path,
    })
  } catch (err) {
    res.status(500).json({ error: String(err.message) })
  }
})

/** Maratona: um filme por clipe, sem repetir até acabar o pool. */
app.get('/api/classic/next', async (req, res) => {
  try {
    const exclude = new Set(
      String(req.query.exclude || '')
        .split(',')
        .map((s) => s.trim())
        .filter((id) => /^[0-9a-f-]{36}$/i.test(id)),
    )

    const { rows: pool } = await query(
      `SELECT id::text AS puzzle_key,
              id::text AS movie_id,
              title,
              title_pt,
              aliases,
              poster_path,
              clip_path,
              attribution,
              year
       FROM (
         SELECT DISTINCT ON (clip_path)
                id, title, title_pt, aliases, poster_path, clip_path,
                attribution, year
         FROM movies
         WHERE clip_path IS NOT NULL AND clip_path <> ''
         ORDER BY clip_path, year ASC NULLS LAST
       ) one_per_clip`,
    )

    if (!pool.length) {
      res.status(404).json({ error: 'Sem filmes com clipe no catálogo' })
      return
    }

    const excludedClips = new Set(
      pool.filter((m) => exclude.has(m.movie_id)).map((m) => m.clip_path),
    )
    let available = pool.filter(
      (m) => !exclude.has(m.movie_id) && !excludedClips.has(m.clip_path),
    )
    const cycleRestarted = available.length === 0 && exclude.size > 0
    if (available.length === 0) available = pool

    const puzzle = available[crypto.randomInt(available.length)]
    res.json(
      publicPuzzle(puzzle, {
        mode: 'classic',
        movieId: puzzle.movie_id,
        cycleRestarted,
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
      `SELECT id::text AS movie_id, title, title_pt, year, aliases, poster_path
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
          best = { norm: n, rank }
        }
      }
      if (best) {
        const titlePt = row.title_pt || row.title
        scored.push({
          movieId: row.movie_id,
          title: row.title,
          titlePt,
          year: row.year,
          posterUrl: row.poster_path,
          label: formatMovieLabel(row),
          rank: best.rank,
          sortKey: normalizeGuess(titlePt || row.title),
        })
      }
    }

    scored.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank
      const ya = a.year ?? 9999
      const yb = b.year ?? 9999
      if (a.rank === 0 && ya !== yb) return ya - yb
      return a.sortKey.localeCompare(b.sortKey)
    })

    // Prefixo ("halloween") lista a franquia inteira — 10 cortava Ressurreição.
    const cap = scored[0]?.rank === 0 ? 24 : 10
    res.json({
      suggestions: scored.slice(0, cap).map(
        ({ title, titlePt, year, label, movieId, posterUrl }) => ({
          title,
          titlePt,
          year,
          label,
          movieId,
          posterUrl,
        }),
      ),
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
    const franchise = !correct && sameFranchise(guess, puzzle)
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
      franchise,
      points: correct ? points : 0,
      ...(alsoGuessedCount != null ? { alsoGuessedCount } : {}),
      ...(reveal
        ? {
            title: puzzle.title,
            titlePt: primaryTitle(puzzle),
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
      titlePt: primaryTitle(puzzle),
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
