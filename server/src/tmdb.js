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
const keywordsCache = new Map()

export async function fetchMovieDetails(tmdbId) {
  const key = apiKey()
  const id = Number(tmdbId)
  if (!key || !Number.isFinite(id)) return null
  if (movieCache.has(id)) return movieCache.get(id)
  try {
    const url = new URL(`https://api.themoviedb.org/3/movie/${id}`)
    url.searchParams.set('api_key', key)
    url.searchParams.set('language', 'pt-BR')
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) })
    if (!res.ok) {
      movieCache.set(id, null)
      return null
    }
    const data = await res.json()
    movieCache.set(id, data)
    return data
  } catch {
    movieCache.set(id, null)
    return null
  }
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
