export function normalizeGuess(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Remove ano e artigos pra match mais tolerante (spiderman ≈ spider man). */
export function normalizeLoose(value) {
  return normalizeGuess(value)
    .replace(/\b(19|20)\d{2}\b/g, ' ')
    .replace(
      /\b(the|a|an|o|os|as|um|uma|de|do|da|dos|das|e|and|&)\b/g,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim()
}

function compact(value) {
  return normalizeLoose(value).replace(/\s+/g, '')
}

function candidateList(movieOrChar, kind) {
  if (kind === 'character') {
    return [
      movieOrChar.name,
      movieOrChar.name_pt,
      ...(movieOrChar.aliases || []),
    ].filter(Boolean)
  }
  return [
    movieOrChar.title,
    movieOrChar.title_pt,
    ...(movieOrChar.aliases || []),
  ].filter(Boolean)
}

function matchesAny(guess, candidates) {
  const g = normalizeGuess(guess)
  if (!g) return false
  const gLoose = normalizeLoose(guess)
  const gCompact = compact(guess)

  return candidates.some((c) => {
    const n = normalizeGuess(c)
    if (n === g) return true
    const loose = normalizeLoose(c)
    if (loose && gLoose && loose === gLoose) return true
    const comp = compact(c)
    if (comp && gCompact && comp.length >= 4 && comp === gCompact) return true
    return false
  })
}

export function matchesTitle(guess, movie) {
  return matchesAny(guess, candidateList(movie, 'movie'))
}

export function matchesCharacter(guess, character) {
  return matchesAny(guess, candidateList(character, 'character'))
}

/**
 * Rótulo PT-first: "Homem-Aranha (Spider-Man) (2017)"
 * Se PT === EN, só um título.
 */
export function formatMovieLabel(row) {
  const pt = (row.title_pt || '').trim()
  const en = (row.title || '').trim()
  const year = row.year

  let base
  if (pt && en && normalizeGuess(pt) !== normalizeGuess(en)) {
    base = `${pt} (${en})`
  } else {
    base = pt || en || '?'
  }

  if (year != null && year !== '') return `${base} (${year})`
  return base
}

/** Título principal pra reveal/UI: PT se existir. */
export function primaryTitle(row) {
  return (row.title_pt || row.title || '').trim() || '?'
}

export function formatCharacterLabel(row) {
  const pt = (row.name_pt || '').trim()
  const en = (row.name || '').trim()
  if (pt && en && normalizeGuess(pt) !== normalizeGuess(en)) {
    return `${pt} (${en})`
  }
  if (pt) {
    return row.film_title ? `${pt} · ${row.film_title}` : pt
  }
  if (en) {
    return row.film_title ? `${en} · ${row.film_title}` : en
  }
  return '?'
}
