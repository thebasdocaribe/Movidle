/**
 * TMDB person photo lookup (server-side).
 * Env: TMDB_API_KEY (v3) — never expose to the browser.
 * https://www.themoviedb.org/settings/api
 */

const TMDB_IMG = 'https://image.tmdb.org/t/p/w185'
const cache = new Map()

function apiKey() {
  return process.env.TMDB_API_KEY?.trim() || ''
}

export function tmdbConfigured() {
  return Boolean(apiKey())
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

    const res = await fetch(url)
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

/** Local /cast/*.jpg placeholders → try TMDB; keep absolute http(s) URLs. */
export function shouldLookupTmdb(imageUrl) {
  if (!imageUrl) return true
  if (imageUrl.startsWith('/cast/')) return true
  return false
}

export async function enrichHintsWithTmdb(hints) {
  if (!tmdbConfigured() || !Array.isArray(hints)) return hints

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
