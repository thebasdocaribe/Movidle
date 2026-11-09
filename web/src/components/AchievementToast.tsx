import { useEffect, useState } from 'react'
import type { Achievement } from '../api'
import { CinemaIcon, cinemaIconForAchievement } from './CinemaIcon'

type ToastItem = Achievement & { key: string }

type AchievementToastHostProps = {
  queue: Achievement[]
  onConsumed: () => void
}

/** Popup canto inferior (estilo Steam) + SFX de unlock. */
export function AchievementToastHost({
  queue,
  onConsumed,
}: AchievementToastHostProps) {
  const [current, setCurrent] = useState<ToastItem | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (current || queue.length === 0) return
    const next = queue[0]
    setCurrent({ ...next, key: `${next.id}-${Date.now()}` })
    onConsumed()
  }, [queue, current, onConsumed])

  useEffect(() => {
    if (!current) return
    setVisible(false)
    try {
      const audio = new Audio('/sfx/achievement.mp3')
      audio.volume = 0.7
      void audio.play().catch(() => {
        /* autoplay bloqueado / sem interação — ignora */
      })
    } catch {
      /* ignore */
    }
    const enter = window.setTimeout(() => setVisible(true), 30)
    const hide = window.setTimeout(() => setVisible(false), 4200)
    const done = window.setTimeout(() => setCurrent(null), 4800)
    return () => {
      window.clearTimeout(enter)
      window.clearTimeout(hide)
      window.clearTimeout(done)
    }
  }, [current])

  if (!current) return null

  return (
    <div
      className={`ach-toast ${visible ? 'ach-toast-in' : 'ach-toast-out'}`}
      role="status"
      aria-live="polite"
    >
      <div className="ach-toast-icon" aria-hidden>
        <CinemaIcon
          name={cinemaIconForAchievement(current)}
          className="h-6 w-6"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold tracking-[0.14em] text-cinema-gold uppercase">
          {current.tier === 'super'
            ? 'Super conquista'
            : current.tier === 'special'
              ? 'Conquista especial'
              : 'Conquista desbloqueada'}
        </p>
        <p className="truncate font-display text-xl leading-none text-white">
          {current.title}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-cinema-muted">
          {current.desc}
        </p>
      </div>
    </div>
  )
}
