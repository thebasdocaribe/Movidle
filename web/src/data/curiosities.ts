/**
 * Curiosidade da semana — edite/adicione entradas com `from` (segunda BRT, YYYY-MM-DD).
 * Vale a curiosidade mais recente com from <= hoje.
 */
export type Curiosity = {
  /** Início da semana (recomendado: segunda) */
  from: string
  text: string
}

export const CURIOSITIES: Curiosity[] = [
  {
    from: '2026-11-03',
    text: 'O chapéu do Indiana Jones foi feito em Campinas.',
  },
  {
    from: '2026-10-27',
    text: 'O grito de Wilhelm aparece em centenas de filmes desde os anos 1950.',
  },
  {
    from: '2026-10-20',
    text: 'Em Blade Runner, a chuva constante escondia as falhas dos sets ao ar livre.',
  },
]

/** Hoje em America/Sao_Paulo como YYYY-MM-DD */
export function todayBRT(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function curiosityOfWeek(dateStr?: string): string {
  const today = dateStr || todayBRT()
  const dated = CURIOSITIES.filter((c) => c.from <= today).sort((a, b) =>
    b.from.localeCompare(a.from),
  )
  if (dated[0]) return dated[0].text
  if (CURIOSITIES.length === 0) return ''
  // fallback: rotaciona pela semana ISO
  const d = new Date(`${today}T12:00:00Z`)
  const oneJan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.floor((d.getTime() - oneJan.getTime()) / 604800000)
  return CURIOSITIES[Math.abs(week) % CURIOSITIES.length].text
}
