import { useMemo, useState } from 'react'

type DayCalendarModalProps = {
  title: string
  today: string
  playedDates?: Set<string>
  onPick: (date: string) => void
  onClose: () => void
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toKey(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

function parseKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return { y, m: m - 1, d }
}

const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export function todayBRT(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function DayCalendarModal({
  title,
  today,
  playedDates,
  onPick,
  onClose,
}: DayCalendarModalProps) {
  const initial = parseKey(today)
  const [year, setYear] = useState(initial.y)
  const [month, setMonth] = useState(initial.m)

  const label = useMemo(
    () =>
      new Intl.DateTimeFormat('pt-BR', {
        month: 'long',
        year: 'numeric',
      }).format(new Date(year, month, 1)),
    [year, month],
  )

  const cells = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const list: Array<{ key: string; day: number; disabled: boolean } | null> =
      []
    for (let i = 0; i < firstDow; i++) list.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const key = toKey(year, month, d)
      list.push({ key, day: d, disabled: key > today })
    }
    return list
  }, [year, month, today])

  function shift(delta: number) {
    const dt = new Date(year, month + delta, 1)
    setYear(dt.getFullYear())
    setMonth(dt.getMonth())
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="panel-frame w-full max-w-sm p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-display text-2xl text-cinema-gold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="border border-cinema-line px-2 py-1 text-xs text-cinema-muted"
          >
            Fechar
          </button>
        </div>
        <p className="mb-3 text-[11px] text-cinema-muted">
          Dias anteriores: pode jogar, sem pontos no rank.
        </p>
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            className="border border-cinema-line px-2 py-1 text-sm text-white"
            onClick={() => shift(-1)}
          >
            ‹
          </button>
          <span className="text-sm font-semibold capitalize text-white">
            {label}
          </span>
          <button
            type="button"
            className="border border-cinema-line px-2 py-1 text-sm text-white"
            onClick={() => shift(1)}
            disabled={toKey(year, month, 1).slice(0, 7) >= today.slice(0, 7)}
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-cinema-muted">
          {WEEK.map((w, i) => (
            <span key={`${w}-${i}`}>{w}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((cell, i) =>
            cell ? (
              <button
                key={cell.key}
                type="button"
                disabled={cell.disabled}
                onClick={() => {
                  onPick(cell.key)
                  onClose()
                }}
                className={`relative aspect-square text-sm font-semibold disabled:opacity-25 ${
                  cell.key === today
                    ? 'border-2 border-cinema-red bg-cinema-red/30 text-white'
                    : playedDates?.has(cell.key)
                      ? 'border border-cinema-gold/70 bg-cinema-gold/15 text-cinema-gold'
                      : 'border border-cinema-line/60 text-white hover:border-cinema-gold'
                }`}
              >
                {cell.day}
              </button>
            ) : (
              <span key={`e-${i}`} />
            ),
          )}
        </div>
      </div>
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M3 9h18"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 3v4M16 3v4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect x="7" y="12" width="3" height="3" fill="#ff2a3c" />
    </svg>
  )
}

export { CalendarIcon }
