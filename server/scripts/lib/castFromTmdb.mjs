/** Heurísticas compartilhadas pra montar cast_json a partir do TMDB. */

export const PERSON_IMG = 'https://image.tmdb.org/t/p/w185'

/** Personagem/crédito que cheira a vilão (não cair no 3º do cartaz). */
export const VILLAIN_CHARACTER_RE =
  /voldemort|tom\s*riddle|antagon|villain|killer|murderer|monster|dark\s*lord|sauron|thanos|joker|darth|vader|kylo|sidious|palpatine|lex\s*luthor|magneto|goblin|venom|carnage|hannibal|freddy|krueger|voorhees|myers|chucky|pennywise|\bit\b|ghostface|jigsaw|keyser|davy\s*jones|cruella|maleficent|ursula|jafar|hades|gaston|syndrome|lotso|bellatrix|umbridge|lucius\s*malfoy|death\s*eater|basilisk|pettigrew|wormtail|agent\s*smith|norman\s*osborn|green\s*goblin|zod\b|doomsday|bane\b|scarecrow|ras\s*al|two-face|penguin|riddler|harley\s*quinn|mysterio|vulture|electro|sandman|lizard|hobgoblin|red\s*skull|ultron|loki\b|hela\b|dormammu|ego\b|ronan|killmonger|klaue|dracula|nosferatu|mephisto|pinhead|leatherface|candyman|scream|ghost\s*face|omen|damien|samara|kayako|sadako|john\s*kramer/i

export function personSlot(p) {
  if (!p?.name) return null
  return {
    name: p.name,
    image_url: p.profile_path ? `${PERSON_IMG}${p.profile_path}` : null,
  }
}

/**
 * Antagonista: só por papel/nome de vilão.
 * Nunca usa cast[2] (era isso que botava Emma Watson / Rupert Grint).
 */
export function pickAntagonist(cast) {
  const list = Array.isArray(cast) ? cast : []
  const scored = []
  for (const c of list) {
    const character = c.character || ''
    const name = c.name || ''
    if (!name) continue
    let score = 0
    if (VILLAIN_CHARACTER_RE.test(character)) score += 10
    if (/lord\s*voldemort|\bvoldemort\b/i.test(character)) score += 25
    if (/tom\s*riddle/i.test(character)) score += 12
    // Voldemort adulto > versão jovem
    if (/ralph\s*fiennes/i.test(name) && /voldemort|riddle/i.test(character)) {
      score += 40
    }
    if (/hero\s*fiennes/i.test(name)) score -= 15
    if (score > 0) scored.push({ c, score, order: c.order ?? 999 })
  }
  if (!scored.length) return null
  scored.sort((a, b) => b.score - a.score || a.order - b.order)
  return scored[0].c
}

export function buildCastJsonFromTmdb(details, credits, meta = {}) {
  const crew = credits.crew || []
  const cast = credits.cast || []
  const writers = crew.filter(
    (c) =>
      c.job === 'Screenplay' ||
      c.job === 'Writer' ||
      c.job === 'Story' ||
      c.department === 'Writing',
  )
  const director = crew.find((c) => c.job === 'Director') || null
  const lead = cast[0] || null
  const secondary = cast[1] || null
  const antHit = pickAntagonist(cast)

  const regionFrom = (d) => {
    const c = d.production_countries?.[0]?.iso_3166_1
    const map = {
      US: 'EUA',
      BR: 'Brasil',
      GB: 'Reino Unido',
      UK: 'Reino Unido',
      FR: 'França',
      DE: 'Alemanha',
      IT: 'Itália',
      ES: 'Espanha',
      JP: 'Japão',
      KR: 'Coreia do Sul',
      CN: 'China',
      MX: 'México',
      CA: 'Canadá',
      AU: 'Austrália',
      NZ: 'Nova Zelândia',
      SE: 'Suécia',
      NO: 'Noruega',
      DK: 'Dinamarca',
      FI: 'Finlândia',
      IE: 'Irlanda',
      NL: 'Holanda',
      BE: 'Bélgica',
      PT: 'Portugal',
      AR: 'Argentina',
      CL: 'Chile',
      IN: 'Índia',
    }
    return map[c] || c || '—'
  }

  return {
    region: regionFrom(details),
    director_image_url: director?.profile_path
      ? `${PERSON_IMG}${director.profile_path}`
      : null,
    screenwriter: personSlot(writers[0]),
    protagonist: personSlot(lead),
    antagonist: antHit ? personSlot(antHit) : { none: true },
    secondary: personSlot(secondary),
    _tmdb: {
      id: meta.id ?? details.id,
      popularity: meta.popularity ?? details.popularity ?? 0,
      vote_count: meta.vote_count ?? details.vote_count ?? 0,
    },
  }
}
