/** Placeholders de Óscares — lógica real depois. */

export type OscarDef = {
  id: string
  title: string
  /** Sem descrição = conquista secreta */
  description?: string
  icon: string
  /** Raridade fake pra UI */
  rarityPct: number
  /** Progresso opcional (ex.: 0/7) */
  progress?: { current: number; max: number }
  unlocked?: boolean
}

export const OSCAR_PLACEHOLDERS: OscarDef[] = [
  {
    id: 'first_light',
    title: 'Primeira luz',
    description: 'Vença qualquer modo uma vez.',
    icon: '★',
    rarityPct: 42,
  },
  {
    id: 'take_one',
    title: 'Take 1',
    description: 'Acerte no primeiro take do Clássico.',
    icon: '1',
    rarityPct: 18,
  },
  {
    id: 'daily_ritual',
    title: 'Ritual diário',
    description: 'Jogue o Clássico diário 7 dias seguidos.',
    icon: '▣',
    rarityPct: 9.4,
    progress: { current: 0, max: 7 },
  },
  {
    id: 'cast_hunter',
    title: 'Caçador de elenco',
    description: 'Vença 10 partidas no Elenco.',
    icon: '◎',
    rarityPct: 12,
    progress: { current: 0, max: 10 },
  },
  {
    id: 'who_is_that',
    title: 'Quem é esse?',
    description: 'Acerte um personagem no diário.',
    icon: '?',
    rarityPct: 22,
  },
  {
    id: 'marathon',
    title: 'Maratonista',
    description: 'Some 50 pts na Maratona.',
    icon: '∞',
    rarityPct: 15,
    progress: { current: 0, max: 50 },
  },
  {
    id: 'perfect_day',
    title: 'Dia perfeito',
    description: 'Vença Clássico, Elenco e Personagem no mesmo dia.',
    icon: '◈',
    rarityPct: 3.1,
  },
  {
    id: 'night_owl',
    title: 'Você está bem?',
    description: 'Jogue entre 3h e 5h da manhã (BRT).',
    icon: '☾',
    rarityPct: 1.8,
  },
  {
    id: 'halloween',
    title: 'Doce vitória',
    description: 'Acerte um diário no Halloween.',
    icon: '◇',
    rarityPct: 0.4,
  },
  {
    id: 'cineblitzception',
    title: 'CineBlitzception',
    description: 'Encontre CineBlitz como resposta (quando existir).',
    icon: '◎',
    rarityPct: 0.2,
  },
  {
    id: 'secret_audacity',
    title: 'Que audácia',
    icon: '!',
    rarityPct: 0.1,
  },
  {
    id: 'secret_cheat',
    title: 'Pare de trapacear',
    icon: '✕',
    rarityPct: 0.1,
  },
  {
    id: 'secret_please',
    title: 'Chega, por favor',
    icon: '…',
    rarityPct: 0.05,
  },
  {
    id: 'streak_nice',
    title: 'Boa',
    description: 'Alcance uma sequência de 10 no Clássico.',
    icon: '▲',
    rarityPct: 6.2,
    progress: { current: 0, max: 10 },
  },
  {
    id: 'streak_fire',
    title: 'Tá pegando fogo',
    description: 'Alcance uma sequência de 30 no Clássico.',
    icon: '▲',
    rarityPct: 0.8,
    progress: { current: 0, max: 30 },
  },
  {
    id: 'share_soon',
    title: 'Marketing grátis',
    description: 'Compartilhe o resultado 5 vezes.',
    icon: '►',
    rarityPct: 11,
    progress: { current: 0, max: 5 },
  },
  {
    id: 'duel_win',
    title: 'Duelo justo',
    description: 'Vença um jogo com amigos.',
    icon: '≠',
    rarityPct: 8.5,
  },
  {
    id: 'archive_zero',
    title: 'Arquivista',
    description: 'Jogue um diário antigo pelo calendário.',
    icon: '▤',
    rarityPct: 14,
  },
]

export function formatRarity(pct: number): string {
  if (pct < 0.1) return '< 0.1%'
  if (pct < 1) return `${pct.toFixed(1)}%`
  if (Number.isInteger(pct)) return `${pct}%`
  return `${pct.toFixed(1)}%`
}
