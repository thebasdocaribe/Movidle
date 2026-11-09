import { useEffect, useMemo, useState } from 'react'
import {
  fetchOscars,
  type Achievement,
  type AchievementCategory,
} from '../api'
import {
  CinemaIcon,
  cinemaIconForAchievement,
  difficultyForAchievement,
} from '../components/CinemaIcon'
import {
  DIFFICULTY_LABEL,
  formatProgressValue,
  formatRarity,
} from '../data/oscars'

type OscarsScreenProps = {
  onBack: () => void
}

type FilterKey = 'all' | AchievementCategory

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'geral', label: 'Geral' },
  { key: 'daily', label: 'Diários' },
  { key: 'endless', label: 'Infinito' },
  { key: 'hall', label: 'Hall' },
]

const SECTION_ORDER: AchievementCategory[] = [
  'geral',
  'daily',
  'endless',
  'hall',
]

export function OscarsScreen({ onBack }: OscarsScreenProps) {
  const [list, setList] = useState<Achievement[]>([])
  const [categories, setCategories] = useState<Record<string, string>>({})
  const [unlocked, setUnlocked] = useState(0)
  const [total, setTotal] = useState(0)
  const [remaining, setRemaining] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>('all')

  useEffect(() => {
    setLoading(true)
    setError(null)
    void fetchOscars()
      .then((res) => {
        setList(res.achievements)
        setCategories(res.categories || {})
        setUnlocked(res.unlocked)
        setTotal(res.total)
        setRemaining(res.remaining)
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [])

  const overallPct = total > 0 ? Math.round((unlocked / total) * 100) : 0

  const filtered = useMemo(() => {
    if (filter === 'all') return list
    return list.filter((a) => a.category === filter)
  }, [list, filter])

  const sections = useMemo(() => {
    const map = new Map<AchievementCategory, Achievement[]>()
    for (const cat of SECTION_ORDER) map.set(cat, [])
    for (const a of filtered) {
      const cat = (a.category || 'geral') as AchievementCategory
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(a)
    }
    return SECTION_ORDER.map((cat) => ({
      cat,
      label: categories[cat] || cat,
      items: map.get(cat) || [],
    })).filter((s) => s.items.length > 0)
  }, [filtered, categories])

  return (
    <div className="min-h-0 flex-1">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="border border-cinema-line px-2 py-1 text-xs text-cinema-gold"
          >
            ← Voltar
          </button>
          <h1 className="font-display text-3xl tracking-wide text-cinema-gold sm:text-4xl">
            ÓSCARES
          </h1>
          <span className="w-14" />
        </div>

        <section className="panel-frame px-4 py-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.22em] text-cinema-muted uppercase">
                Sua estante
              </p>
              <p className="font-display text-2xl text-white sm:text-3xl">
                {unlocked}
                <span className="text-cinema-muted"> / {total}</span>
              </p>
              <p className="mt-0.5 text-[11px] text-cinema-muted">
                {remaining > 0
                  ? `Faltam ${remaining} pra platinar`
                  : total > 0
                    ? 'Platina completa'
                    : 'Carregando…'}
              </p>
            </div>
            <p className="text-xs text-cinema-muted">
              <span className="font-bold text-cinema-gold">{overallPct}%</span>{' '}
              desbloqueado
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden border border-cinema-line/80 bg-black/50">
            <div
              className="h-full bg-gradient-to-r from-cinema-red to-cinema-gold transition-[width]"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </section>

        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`border px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] uppercase transition ${
                filter === f.key
                  ? 'border-cinema-gold bg-cinema-gold/15 text-cinema-gold'
                  : 'border-cinema-line/70 text-cinema-muted hover:border-cinema-gold/50 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-cinema-muted">Carregando óscares…</p>
        ) : error ? (
          <p className="text-center text-cinema-red">{error}</p>
        ) : (
          sections.map((section) => (
            <section key={section.cat} className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-display text-2xl text-cinema-gold">
                  {section.label}
                </h2>
                <p className="text-[10px] font-bold tracking-[0.16em] text-cinema-muted uppercase">
                  {section.items.filter((a) => !a.locked).length}/
                  {section.items.length}
                </p>
              </div>
              <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {section.items.map((oscar) => (
                  <li key={oscar.id}>
                    <OscarCard oscar={oscar} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  )
}

function OscarCard({ oscar }: { oscar: Achievement }) {
  const locked = oscar.locked
  const difficulty = difficultyForAchievement(oscar)
  const iconKey = cinemaIconForAchievement(oscar)
  const progress = oscar.progress
  const progressPct =
    progress && progress.max > 0
      ? Math.min(100, (progress.current / progress.max) * 100)
      : 0
  const remainingToGoal =
    progress && progress.max > progress.current
      ? progress.max - progress.current
      : 0
  const community = oscar.communityPct ?? 0
  const cardTone =
    difficulty === 'legendary'
      ? 'super'
      : difficulty === 'hard'
        ? 'special'
        : difficulty === 'medium'
          ? 'medium'
          : 'normal'

  return (
    <article
      className={`oscar-card oscar-card-${cardTone} ${locked ? 'oscar-card-locked' : 'oscar-card-won'}`}
    >
      <div className="flex gap-3">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <div
            className={`oscar-icon oscar-icon-${cardTone} ${
              iconKey.startsWith('oscar') || iconKey === 'fries'
                ? 'oscar-icon-art'
                : ''
            }`}
            aria-hidden
          >
            <CinemaIcon
              name={iconKey}
              className={
                iconKey.startsWith('oscar') || iconKey === 'fries'
                  ? 'h-9 w-9'
                  : 'h-7 w-7'
              }
            />
          </div>
          {difficulty !== 'easy' ? (
            <span className={`oscar-tier-badge oscar-tier-${cardTone}`}>
              {DIFFICULTY_LABEL[difficulty]}
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-xl leading-none tracking-wide text-white">
              {oscar.title}
            </h3>
            {locked ? (
              <span className="shrink-0 border border-cinema-line/80 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-cinema-muted uppercase">
                Locked
              </span>
            ) : (
              <span className="shrink-0 border border-cinema-gold/60 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-cinema-gold uppercase">
                Won
              </span>
            )}
          </div>

          <p className="mt-1 text-[12px] leading-snug text-cinema-muted">
            {oscar.desc}
          </p>

          {progress ? (
            <div className="mt-2.5">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-[9px] font-bold tracking-[0.18em] text-cinema-cyan uppercase">
                  Seu progresso
                </p>
                <p className="text-[10px] font-semibold text-cinema-muted">
                  {formatProgressValue(progress.current)}/
                  {formatProgressValue(progress.max)}
                </p>
              </div>
              <div className="h-1.5 overflow-hidden bg-black/55">
                <div
                  className={`h-full transition-[width] ${
                    difficulty === 'legendary'
                      ? 'bg-gradient-to-r from-amber-200 to-cinema-gold'
                      : difficulty === 'hard'
                        ? 'bg-cinema-gold'
                        : difficulty === 'medium'
                          ? 'bg-violet-300'
                          : 'bg-cinema-cyan'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {locked && remainingToGoal > 0 ? (
                <p className="mt-1 text-[10px] text-cinema-muted/90">
                  Falta {formatProgressValue(remainingToGoal)} (
                  {Math.max(0, 100 - Math.round(progressPct))}%)
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-auto flex justify-end pt-2.5">
            <p
              className="inline-flex items-center gap-1.5 border border-cinema-line/90 bg-black/40 px-2 py-1 text-[10px] text-cinema-muted"
              title="Porcentagem de jogadores que já desbloquearam"
            >
              <span
                className="font-bold tracking-[0.14em] text-cinema-gold/90 uppercase"
                aria-hidden
              >
                Comunidade
              </span>
              <span className="text-cinema-line">·</span>
              <span className="font-semibold text-white">
                {formatRarity(community)}
              </span>
              <span className="text-cinema-muted">já têm</span>
            </p>
          </div>
        </div>
      </div>
    </article>
  )
}
