/**
 * TMDB person photo lookup (fallback).
 * Preferir image_url já gravada no cast_json (credits.profile_path).
 * Env: TMDB_API_KEY (v3)
 */

const TMDB_IMG = 'https://image.tmdb.org/t/p/w185'
const cache = new Map()
const LOOKUP_TIMEOUT_MS = 450

function apiKey() {
  return process.env.TMDB_API_KEY?.trim() || ''
}

export function tmdbConfigured() {
  return Boolean(apiKey())
}

/** Detalhes do filme (gêneros etc.) — cache simples em memória. */
const movieCache = new Map()
const creditsCache = new Map()
const keywordsCache = new Map()

async function tmdbGet(pathname, params = {}, timeoutMs = 4000) {
  const key = apiKey()
  if (!key) return null
  const url = new URL(`https://api.themoviedb.org/3${pathname}`)
  url.searchParams.set('api_key', key)
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') url.searchParams.set(k, String(v))
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) return null
  return res.json()
}

export async function searchTmdbMovies(query, { year = null, limit = 12 } = {}) {
  const q = String(query || '').trim()
  if (!q || !apiKey()) return []
  const data = await tmdbGet('/search/movie', {
    query: q,
    language: 'pt-BR',
    include_adult: 'false',
    ...(year ? { year: String(year) } : {}),
  })
  const results = Array.isArray(data?.results) ? data.results : []
  return results.slice(0, Math.max(1, Math.min(24, Number(limit) || 12))).map((m) => ({
    tmdbId: m.id,
    title: m.original_title || m.title || '',
    titlePt: m.title || m.original_title || '',
    year: m.release_date ? Number(String(m.release_date).slice(0, 4)) || null : null,
    overview: m.overview || '',
    posterPath: m.poster_path || null,
    posterUrl: m.poster_path
      ? `https://image.tmdb.org/t/p/w185${m.poster_path}`
      : null,
    popularity: m.popularity ?? 0,
    voteCount: m.vote_count ?? 0,
  }))
}

export async function fetchMovieDetails(tmdbId) {
  const key = apiKey()
  const id = Number(tmdbId)
  if (!key || !Number.isFinite(id)) return null
  if (movieCache.has(id)) return movieCache.get(id)
  try {
    const data = await tmdbGet(`/movie/${id}`, { language: 'pt-BR' })
    movieCache.set(id, data)
    return data
  } catch {
    movieCache.set(id, null)
    return null
  }
}

export async function fetchMovieCredits(tmdbId) {
  const key = apiKey()
  const id = Number(tmdbId)
  if (!key || !Number.isFinite(id)) return null
  if (creditsCache.has(id)) return creditsCache.get(id)
  try {
    const data = await tmdbGet(`/movie/${id}/credits`, { language: 'pt-BR' })
    creditsCache.set(id, data)
    return data
  } catch {
    creditsCache.set(id, null)
    return null
  }
}

/** Details + credits em paralelo pro dashboard admin. */
export async function fetchMovieBundle(tmdbId) {
  const id = Number(tmdbId)
  if (!Number.isFinite(id)) return null
  const [details, credits] = await Promise.all([
    fetchMovieDetails(id),
    fetchMovieCredits(id),
  ])
  if (!details) return null
  return { details, credits: credits || { cast: [], crew: [] } }
}

/**
 * Keywords TMDB (EN + tentativa PT).
 * @returns {Promise<{ id: number, name: string, namePt?: string }[] | null>}
 */
export async function fetchMovieKeywords(tmdbId) {
  const key = apiKey()
  const id = Number(tmdbId)
  if (!key || !Number.isFinite(id)) return null
  if (keywordsCache.has(id)) return keywordsCache.get(id)
  try {
    const urlEn = new URL(`https://api.themoviedb.org/3/movie/${id}/keywords`)
    urlEn.searchParams.set('api_key', key)
    const resEn = await fetch(urlEn, { signal: AbortSignal.timeout(2500) })
    if (!resEn.ok) {
      keywordsCache.set(id, null)
      return null
    }
    const dataEn = await resEn.json()
    const listEn = Array.isArray(dataEn.keywords) ? dataEn.keywords : []

    let listPt = []
    try {
      const urlPt = new URL(`https://api.themoviedb.org/3/movie/${id}/keywords`)
      urlPt.searchParams.set('api_key', key)
      urlPt.searchParams.set('language', 'pt-BR')
      const resPt = await fetch(urlPt, { signal: AbortSignal.timeout(2500) })
      if (resPt.ok) {
        const dataPt = await resPt.json()
        listPt = Array.isArray(dataPt.keywords) ? dataPt.keywords : []
      }
    } catch {
      /* ignore */
    }

    const ptById = new Map(
      listPt.filter((k) => k?.id).map((k) => [k.id, String(k.name || '')]),
    )
    const merged = listEn
      .filter((k) => k?.id && k?.name)
      .map((k) => ({
        id: k.id,
        name: String(k.name),
        ...(ptById.get(k.id) ? { namePt: ptById.get(k.id) } : {}),
      }))
    keywordsCache.set(id, merged)
    return merged
  } catch {
    keywordsCache.set(id, null)
    return null
  }
}

/** @returns {Promise<string|null>} absolute profile image URL */
export async function fetchPersonPhotoUrl(name) {
  const key = apiKey()
  const q = String(name || '').trim()
  if (!key || !q || q === '—' || q === 'Sem antagonista') return null

  const cacheKey = q.toLowerCase()
  if (cache.has(cacheKey)) return cache.get(cacheKey)

  try {
    const url = new URL('https://api.themoviedb.org/3/search/person')
    url.searchParams.set('api_key', key)
    url.searchParams.set('query', q)
    url.searchParams.set('include_adult', 'false')

    const res = await fetch(url, {
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    })
    if (!res.ok) {
      cache.set(cacheKey, null)
      return null
    }
    const data = await res.json()
    const hit = (data.results || []).find((p) => p.profile_path)
    const photo = hit?.profile_path ? `${TMDB_IMG}${hit.profile_path}` : null
    cache.set(cacheKey, photo)
    return photo
  } catch {
    cache.set(cacheKey, null)
    return null
  }
}

export function shouldLookupTmdb(imageUrl) {
  if (!imageUrl) return true
  if (String(imageUrl).startsWith('http')) return false
  if (String(imageUrl).startsWith('/cast/')) return true
  return false
}

/**
 * Só busca TMDB para slots sem URL https.
 * Se todos já têm foto baked, retorna na hora (sem latência de rede).
 */
export async function enrichHintsWithTmdb(hints) {
  if (!Array.isArray(hints)) return hints
  if (!tmdbConfigured()) return hints

  const needs = hints.filter(
    (h) =>
      h &&
      !h.empty &&
      h.kind !== 'region' &&
      h.kind !== 'year' &&
      shouldLookupTmdb(h.imageUrl),
  )
  if (needs.length === 0) return hints

  return Promise.all(
    hints.map(async (h) => {
      if (!h || h.empty || h.kind === 'region' || h.kind === 'year') return h
      if (!shouldLookupTmdb(h.imageUrl)) return h
      const photo = await fetchPersonPhotoUrl(h.name)
      if (!photo) return h
      return { ...h, imageUrl: photo }
    }),
  )
}
