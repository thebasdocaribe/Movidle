export function normalizeGuess(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function matchesTitle(guess, movie) {
  const g = normalizeGuess(guess)
  if (!g) return false

  const candidates = [
    movie.title,
    movie.title_pt,
    ...(movie.aliases || []),
  ].filter(Boolean)

  return candidates.some((c) => normalizeGuess(c) === g)
}

export function matchesCharacter(guess, character) {
  const g = normalizeGuess(guess)
  if (!g) return false
  const candidates = [
    character.name,
    character.name_pt,
    ...(character.aliases || []),
  ].filter(Boolean)
  return candidates.some((c) => normalizeGuess(c) === g)
}
