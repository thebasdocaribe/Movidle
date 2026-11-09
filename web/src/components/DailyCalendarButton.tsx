import { useState } from 'react'
import { DayCalendarModal, todayBRT } from './DayCalendarModal'

type DailyCalendarButtonProps = {
  title: string
  /** Dia em jogo (YYYY-MM-DD) */
  activeDate: string
  minDate?: string
  hint?: string
  onPickDate: (date: string) => void
}

function formatDayLabel(date: string, today: string) {
  if (date === today) return 'Hoje'
  const yest = (() => {
    const [y, m, d] = today.split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d))
    dt.setUTCDate(dt.getUTCDate() - 1)
    const yy = dt.getUTCFullYear()
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(dt.getUTCDate()).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
  })()
  if (date === yest) return 'Ontem'
  const [, m, d] = date.split('-')
  return `${d}/${m}`
}

/** Botão que abre o calendário de arquivo dentro do modo diário. */
export function DailyCalendarButton({
  title,
  activeDate,
  minDate,
  hint,
  onPickDate,
}: DailyCalendarButtonProps) {
  const [open, setOpen] = useState(false)
  const today = todayBRT()
  const isArchive = activeDate < today

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 border border-cinema-line/80 px-2 py-0.5 text-[10px] font-bold tracking-wide text-cinema-gold uppercase hover:border-cinema-gold"
        title="Abrir calendário de dias anteriores"
      >
        <CalendarGlyph />
        {isArchive ? formatDayLabel(activeDate, today) : 'Calendário'}
      </button>
      {open ? (
        <DayCalendarModal
          title={title}
          today={today}
          selectedDate={activeDate}
          minDate={minDate}
          hint={hint}
          onPick={(date) => {
            onPickDate(date)
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}

function CalendarGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8 3v4M16 3v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
