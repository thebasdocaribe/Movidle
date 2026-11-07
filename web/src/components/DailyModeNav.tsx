import type { ReactNode } from 'react'

export type DailyNavMode =
  | 'daily'
  | 'cast'
  | 'character'
  | 'keywords'
  | 'whoami'

export type DailyPlayedMap = Record<DailyNavMode, boolean>

type DailyModeNavProps = {
  active: DailyNavMode
  played: DailyPlayedMap
  onSelect: (mode: DailyNavMode) => void
}

const MODES: {
  id: DailyNavMode
  label: string
  Icon: () => ReactNode
}[] = [
  {
    id: 'daily',
    label: 'Clássico',
    Icon: () => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 5V19M16 5V19M3 10h18M3 14h18" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    id: 'cast',
    label: 'Poster',
    Icon: () => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
        <circle cx="9" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="16" cy="9" r="2" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M4.5 18.5c.8-3 2.8-4.5 4.5-4.5s3.7 1.5 4.5 4.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M13.2 17.8c.6-2 1.9-3 3-3 1.4 0 2.6 1.2 3.3 3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'character',
    label: 'Personagem',
    Icon: () => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
        <rect x="5" y="3.5" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M8.2 16.5c1-2 2.4-3 3.8-3s2.8 1 3.8 3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'keywords',
    label: 'Palavra',
    Icon: () => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
        <circle cx="8.5" cy="11" r="3.2" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M11.5 11H20M17 11v3.2M20 11v2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'whoami',
    label: 'Quem sou',
    Icon: () => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
        <circle cx="11" cy="11" r="5.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M15.5 15.5 20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path
          d="M11 8.4c1.1 0 2 .7 2 1.8 0 1.2-1 1.5-1.5 1.9-.4.3-.5.6-.5 1.1"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="11" cy="15.2" r="0.9" fill="currentColor" />
      </svg>
    ),
  },
]

export function DailyModeNav({ active, played, onSelect }: DailyModeNavProps) {
  return (
    <nav
      className="daily-mode-nav relative mx-auto mt-1 mb-3 w-full max-w-md px-1"
      aria-label="Modos diários"
    >
      <div
        className="pointer-events-none absolute top-[22px] right-8 left-8 h-px bg-cinema-line/80 sm:top-[24px]"
        aria-hidden
      />
      <ul className="relative z-[1] flex items-start justify-between gap-1">
        {MODES.map(({ id, label, Icon }) => {
          const isActive = id === active
          const isDone = Boolean(played[id])
          const lit = isActive || isDone
          return (
            <li key={id} className="flex min-w-0 flex-1 flex-col items-center">
              <button
                type="button"
                onClick={() => {
                  if (!isActive) onSelect(id)
                }}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`${label}${isDone ? ' · já jogado' : ''}`}
                className={`relative flex items-center justify-center border-2 transition ${
                  isActive
                    ? 'h-12 w-12 border-cinema-gold bg-[#1a1018] text-cinema-gold shadow-[0_0_0_1px_rgba(255,196,77,0.25)] sm:h-[3.25rem] sm:w-[3.25rem]'
                    : lit
                      ? 'h-11 w-11 border-cinema-gold/70 bg-black/50 text-cinema-gold/90 hover:border-cinema-gold sm:h-12 sm:w-12'
                      : 'h-11 w-11 border-cinema-line bg-black/40 text-cinema-muted hover:border-cinema-muted hover:text-white sm:h-12 sm:w-12'
                }`}
              >
                <Icon />
                {isDone ? (
                  <span
                    className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-white ring-2 ring-[#0a0610]"
                    aria-hidden
                  >
                    ✓
                  </span>
                ) : null}
              </button>
              <span
                className={`mt-1.5 max-w-full truncate text-center text-[9px] font-bold tracking-wide uppercase sm:text-[10px] ${
                  lit ? 'text-cinema-gold' : 'text-cinema-muted'
                }`}
              >
                {label}
              </span>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
