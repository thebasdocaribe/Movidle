import { query } from './db.js'
import { BASE_POINTS } from './scoring.js'
import { matchesTitle } from './normalize.js'

const FILMS_PER_MATCH = 10
const MAX_TAKE = 6

function makeCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

export async function pickDuelMovies(limit = FILMS_PER_MATCH) {
  const { rows } = await query(
    `SELECT id::text AS id
     FROM movies
     ORDER BY (clip_path IS NOT NULL) DESC, random()
     LIMIT $1`,
    [limit],
  )
  return rows.map((r) => r.id)
}

export async function loadMovie(movieId) {
  const { rows } = await query(
    `SELECT id::text AS id,
            title,
            title_pt,
            year,
            aliases,
            poster_path,
            clip_path,
            attribution
     FROM movies WHERE id = $1::uuid`,
    [movieId],
  )
  return rows[0] || null
}

export function publicMedia(movie) {
  if (movie.clip_path) {
    return {
      type: 'video',
      url: movie.clip_path,
      posterUrl: movie.poster_path,
    }
  }
  return {
    type: 'image',
    url: movie.poster_path,
    posterUrl: movie.poster_path,
  }
}

export async function createDuel({ hostId, hostUsername }) {
  const movieIds = await pickDuelMovies()
  if (movieIds.length === 0) {
    throw new Error('Sem filmes no catálogo')
  }

  let code = makeCode()
  for (let i = 0; i < 5; i++) {
    const exists = await query(`SELECT 1 FROM duels WHERE code = $1`, [code])
    if (exists.rows.length === 0) break
    code = makeCode()
  }

  const state = {
    movieIds,
    filmIndex: 0,
    take: 1,
    hostUsername,
    guestUsername: null,
    hostScore: 0,
    guestScore: 0,
    turnUserId: hostId,
    starterUserId: hostId,
    phase: 'waiting',
    filmsDone: 0,
    lastEvent: null,
    winnerUserId: null,
  }

  const { rows } = await query(
    `INSERT INTO duels (code, status, host_id, state)
     VALUES ($1, 'waiting', $2, $3::jsonb)
     RETURNING id, code, status, host_id, guest_id, state`,
    [code, hostId, JSON.stringify(state)],
  )
  return rows[0]
}

export async function getDuelByCode(code) {
  const { rows } = await query(
    `SELECT id, code, status, host_id, guest_id, state, updated_at
     FROM duels WHERE upper(code) = upper($1)`,
    [code],
  )
  return rows[0] || null
}

export async function joinDuel(duel, { guestId, guestUsername }) {
  if (duel.host_id === guestId) {
    return duel
  }
  if (duel.guest_id === guestId) {
    return duel
  }
  if (duel.status !== 'waiting') {
    throw Object.assign(new Error('Sala já começou ou encerrou'), { status: 409 })
  }
  if (duel.guest_id && duel.guest_id !== guestId) {
    throw Object.assign(new Error('Sala cheia'), { status: 409 })
  }

  const state = { ...duel.state }
  state.guestUsername = guestUsername
  state.phase = 'playing'
  state.lastEvent = `${guestUsername} entrou. ${state.hostUsername} começa.`

  const { rows } = await query(
    `UPDATE duels
     SET guest_id = $2,
         status = 'playing',
         state = $3::jsonb,
         updated_at = now()
     WHERE id = $1
     RETURNING id, code, status, host_id, guest_id, state`,
    [duel.id, guestId, JSON.stringify(state)],
  )
  return rows[0]
}

function otherUser(duel, userId) {
  return userId === duel.host_id ? duel.guest_id : duel.host_id
}

function isHost(duel, userId) {
  return userId === duel.host_id
}

function addScore(state, duel, userId, points) {
  if (isHost(duel, userId)) state.hostScore += points
  else state.guestScore += points
}

function advanceFilm(state, duel) {
  state.filmsDone += 1
  if (state.filmsDone >= state.movieIds.length) {
    state.phase = 'finished'
    if (state.hostScore > state.guestScore) state.winnerUserId = duel.host_id
    else if (state.guestScore > state.hostScore) state.winnerUserId = duel.guest_id
    else state.winnerUserId = null
    return
  }
  state.filmIndex += 1
  state.take = 1
  // quem começa o próximo filme é o outro
  const nextStarter = otherUser(duel, state.starterUserId)
  state.starterUserId = nextStarter
  state.turnUserId = nextStarter
  state.phase = 'playing'
}

export async function applyDuelGuess(duel, { userId, guess }) {
  if (duel.status !== 'playing') {
    throw Object.assign(new Error('Partida não está em andamento'), { status: 409 })
  }
  const state = { ...duel.state }
  if (state.turnUserId !== userId) {
    throw Object.assign(new Error('Não é sua vez'), { status: 403 })
  }

  const movieId = state.movieIds[state.filmIndex]
  const movie = await loadMovie(movieId)
  if (!movie) throw new Error('Filme não encontrado')

  const typed = String(guess || '').trim()
  const correct = typed ? matchesTitle(typed, movie) : false

  if (correct) {
    const points = BASE_POINTS[state.take - 1] ?? 5
    addScore(state, duel, userId, points)
    state.lastEvent = `${isHost(duel, userId) ? state.hostUsername : state.guestUsername} acertou no take ${state.take} (+${points})`
    state.lastReveal = {
      title: movie.title,
      titlePt: movie.title_pt,
      year: movie.year,
      posterUrl: movie.poster_path,
      points,
      take: state.take,
    }
    advanceFilm(state, duel)
  } else if (!typed) {
    // confirmar vazio = passa a vez / próximo take
    if (state.take >= MAX_TAKE) {
      state.lastEvent = `Ninguém acertou. Era ${movie.title_pt || movie.title}.`
      state.lastReveal = {
        title: movie.title,
        titlePt: movie.title_pt,
        year: movie.year,
        posterUrl: movie.poster_path,
        points: 0,
        take: state.take,
      }
      advanceFilm(state, duel)
    } else {
      state.take += 1
      state.turnUserId = otherUser(duel, userId)
      state.lastEvent = `Take ${state.take - 1} sem chute. Vez do outro no take ${state.take}.`
      state.lastReveal = null
    }
  } else {
    // chute errado
    if (state.take >= MAX_TAKE) {
      state.lastEvent = `Errou o último take. Era ${movie.title_pt || movie.title}.`
      state.lastReveal = {
        title: movie.title,
        titlePt: movie.title_pt,
        year: movie.year,
        posterUrl: movie.poster_path,
        points: 0,
        take: state.take,
      }
      advanceFilm(state, duel)
    } else {
      state.take += 1
      state.turnUserId = otherUser(duel, userId)
      state.lastEvent = `Errou. Outro jogador no take ${state.take}.`
      state.lastReveal = null
    }
  }

  const status = state.phase === 'finished' ? 'finished' : 'playing'
  const { rows } = await query(
    `UPDATE duels
     SET state = $2::jsonb, status = $3, updated_at = now()
     WHERE id = $1
     RETURNING id, code, status, host_id, guest_id, state`,
    [duel.id, JSON.stringify(state), status],
  )
  return rows[0]
}

export async function serializeDuel(duel, viewerId) {
  const state = duel.state
  const movieId = state.movieIds[state.filmIndex]
  const movie =
    duel.status === 'finished' ? null : await loadMovie(movieId)
  const viewer = String(viewerId)
  const turn = String(state.turnUserId)

  return {
    code: duel.code,
    status: duel.status,
    youAreHost: String(duel.host_id) === viewer,
    yourTurn: turn === viewer,
    host: {
      id: duel.host_id,
      username: state.hostUsername,
      score: state.hostScore,
    },
    guest: duel.guest_id
      ? {
          id: duel.guest_id,
          username: state.guestUsername,
          score: state.guestScore,
        }
      : null,
    filmIndex: state.filmIndex,
    filmsTotal: state.movieIds.length,
    take: state.take,
    takeDurations: [1, 2, 3, 4, 5, 6],
    phase: state.phase,
    lastEvent: state.lastEvent,
    lastReveal: state.lastReveal || null,
    winnerUserId: state.winnerUserId,
    media: movie ? publicMedia(movie) : null,
    attribution: movie?.attribution || null,
  }
}
