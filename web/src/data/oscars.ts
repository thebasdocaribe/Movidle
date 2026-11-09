/** Helpers de UI dos Óscares. */

import type { AchievementDifficulty } from '../components/CinemaIcon'

export function formatRarity(pct: number): string {
  if (pct <= 0) return '0%'
  if (pct < 0.1) return '< 0.1%'
  if (pct < 1) return `${pct.toFixed(1)}%`
  if (Number.isInteger(pct)) return `${pct}%`
  return `${pct.toFixed(1)}%`
}

export function formatProgressValue(n: number): string {
  if (n >= 1000) {
    return n.toLocaleString('pt-BR')
  }
  return String(n)
}

export const DIFFICULTY_LABEL: Record<AchievementDifficulty, string> = {
  easy: 'Fácil',
  medium: 'Média',
  hard: 'Difícil',
  legendary: 'Lendária',
}

/** @deprecated use DIFFICULTY_LABEL */
export const TIER_LABEL = {
  normal: 'Fácil',
  special: 'Difícil',
  super: 'Lendária',
} as const
