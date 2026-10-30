import { useEffect, useState } from 'react'
import { fetchRank, type RankEntry } from '../api'
import type { AuthUser, ProgressMap } from '../auth'
import {
  CalendarIcon,
  DayCalendarModal,
  todayBRT,
} from '../components/DayCalendarModal'

type HubScreenProps = {
  user: AuthUser | null
  progress: ProgressMap
  onPlayDaily: (date?: string) => void
  onPlayCast: (date?: string) => void
  onPlayClassic: () => void
  onPlayCastEndless: () => void
  onPlayCharacter: (date?: string) => void
  onPlayDuel: () => void
  onOpenAuth: () => void
  onOpenProfile: (username: string) => void
}

type RankTab = 'daily' | 'classic' | 'cast'

export function HubScreen({
  user,
  progress,
  onPlayDaily,
  onPlayCast,
  onPlayClassic,
  onPlayCastEndless,
  onPlayCharacter,
  onPlayDuel,
  onOpenAuth,
  onOpenProfile,
}: HubScreenProps) {
  const [rankTab, setRankTab] = useState<RankTab>('daily')
  const [entries, setEntries] = useState<RankEntry[]>([])
  const [rankLoading, setRankLoading] = useState(false)
  const [calendarFor, setCalendarFor] = useState<
    'daily' | 'cast' | 'character' | null
  >(null)
  const today = todayBRT()
  /** Personagem: contagem começa em 30/10/2026 (dia 1 = Odeo). */
  const characterEpoch = '2026-10-30'

  useEffect(() => {
    setRankLoading(true)
    fetchRank(rankTab)
      .then((res) => setEntries(res.entries))
      .catch(() => setEntries([]))
      .finally(() => setRankLoading(false))
  }, [rankTab, progress])

  return (
    <div className="min-h-0 flex-1">
      <div className="mx-auto flex w-full max-w-5xl flex-col px-3 pt-1 pb-4 sm:px-5 sm:pb-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 px-1 text-xs text-cinema-muted sm:justify-between">
          {user ? (
            <>
              <span className="text-cinema-gold">@{user.username}</span>
              <span className="text-center sm:text-right">
                Clássico +{progress.daily.totalScore}
                <span className="mx-1.5 opacity-40">·</span>
                Elenco +{progress.cast?.totalScore ?? 0}
                <span className="mx-1.5 opacity-40">·</span>
                Maratona +{progress.classic.totalScore}
              </span>
            </>
          ) : (
            <p className="w-full text-center text-xs text-cinema-muted">
              Guest ·{' '}
              <button
                type="button"
                onClick={onOpenAuth}
                className="text-cinema-gold underline"
              >
                entrar
              </button>{' '}
              pra salvar no rank
            </p>
          )}
        </div>

        {/* Gamedle-like: Diários | Ilimitados+Multi */}
        <div className="grid gap-3 md:grid-cols-2 md:items-start md:gap-4">
          <section className="panel-frame p-2.5 sm:p-3">
            <h2 className="font-display mb-2 border-b border-cinema-line pb-1.5 text-2xl text-cinema-gold">
              Diários
            </h2>
            <div className="flex flex-col gap-2">
              <ModeButton
                title="CLÁSSICO"
                tag="Diário"
                subtitle="Adivinhe pelo clipe"
                accent="green"
                onClick={() => onPlayDaily()}
                onCalendar={() => setCalendarFor('daily')}
              />
              <ModeButton
                title="ELENCO"
                tag="Diário"
                subtitle="Adivinhe pela capa + créditos"
                accent="yellow"
                onClick={() => onPlayCast()}
                onCalendar={() => setCalendarFor('cast')}
              />
              <ModeButton
                title="PERSONAGEM"
                tag="Diário"
                subtitle="Adivinhe pelo recorte"
                accent="purple"
                onClick={() => onPlayCharacter()}
                onCalendar={() => setCalendarFor('character')}
              />
            </div>
          </section>

          <div className="flex flex-col gap-3">
            <section className="panel-frame p-2.5 sm:p-3">
              <h2 className="font-display mb-2 border-b border-cinema-line pb-1.5 text-2xl text-cinema-gold">
                Ilimitados
              </h2>
              <div className="flex flex-col gap-2">
                <ModeButton
                  title="MARATONA"
                  tag="Livre"
                  subtitle="Clipe sem parar"
                  accent="blue"
                  onClick={onPlayClassic}
                />
                <ModeButton
                  title="CASTING"
                  tag="Livre"
                  subtitle="Elenco sem parar"
                  accent="yellow"
                  onClick={onPlayCastEndless}
                />
              </div>
            </section>

            <section className="panel-frame p-2.5 sm:p-3">
              <h2 className="font-display mb-2 border-b border-cinema-line pb-1.5 text-2xl text-cinema-gold">
                Multijogador
              </h2>
              <ModeButton
                title="JOGAR COM AMIGOS"
                tag="1v1"
                subtitle="Sala privada por convite"
                accent="purple"
                onClick={onPlayDuel}
              />
            </section>
          </div>
        </div>

        <section className="rank-poster panel-frame mt-5 overflow-hidden p-0">
          <div className="border-b border-cinema-gold/50 bg-gradient-to-r from-[#3a1018] via-[#1a0a12] to-[#3a1018] px-3 py-2.5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="font-display text-2xl text-white sm:text-3xl">
                HALL DA FAMA
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['daily', 'Clássico'],
                    ['cast', 'Elenco'],
                    ['classic', 'Maratona'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRankTab(key)}
                    className={`border px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase ${
                      rankTab === key
                        ? 'border-cinema-red bg-cinema-red text-white'
                        : 'border-cinema-line text-cinema-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="max-h-52 overflow-x-hidden overflow-y-auto px-2.5 py-2">
            {rankLoading ? (
              <p className="py-4 text-center text-sm text-cinema-muted">
                Carregando rank…
              </p>
            ) : entries.length === 0 ? (
              <p className="py-6 text-center text-sm text-cinema-muted">
                Rank vazio. Jogue e some pontos.
              </p>
            ) : (
              <ol className="flex flex-col gap-1">
                {entries.map((row) => {
                  const isYou = user?.username === row.username
                  const avatar =
                    row.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name || row.username)}&background=1a0a12&color=ffc44d&size=48&bold=true`
                  return (
                    <li key={row.username}>
                      <button
                        type="button"
                        onClick={() => onOpenProfile(row.username)}
                        className={`rank-row-click flex w-full items-center gap-2 border px-2.5 py-1.5 text-left ${
                          isYou
                            ? 'border-cinema-gold bg-cinema-gold/10'
                            : 'border-cinema-line/70 bg-black/30'
                        }`}
                      >
                        <span className="font-display w-7 shrink-0 text-lg text-cinema-red">
                          #{row.rank}
                        </span>
                        <img
                          src={avatar}
                          alt=""
                          className="rank-row-avatar h-7 w-7 shrink-0 rounded-full object-cover"
                        />
                        <span
                          className={`min-w-0 flex-1 truncate text-sm font-semibold ${
                            isYou ? 'text-cinema-gold' : 'text-white'
                          }`}
                        >
                          {row.name}
                          {isYou ? ' (você)' : ''}
                        </span>
                        <span className="font-display shrink-0 text-lg text-cinema-cyan">
                          {row.score}
                        </span>
                        <span className="rank-row-hint" aria-hidden>
                          ver perfil
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </section>
      </div>

      {calendarFor ? (
        <DayCalendarModal
          title={
            calendarFor === 'daily'
              ? 'Clássico'
              : calendarFor === 'cast'
                ? 'Elenco'
                : 'Personagem'
          }
          today={today}
          minDate={
            calendarFor === 'character' ? characterEpoch : undefined
          }
          hint={
            calendarFor === 'character'
              ? 'Começa em 30/10/2026 · dias anteriores bloqueados · arquivo: 0 pts'
              : undefined
          }
          onClose={() => setCalendarFor(null)}
          onPick={(date) => {
            if (calendarFor === 'daily') onPlayDaily(date)
            else if (calendarFor === 'cast') onPlayCast(date)
            else onPlayCharacter(date)
          }}
        />
      ) : null}
    </div>
  )
}

function ModeButton({
  title,
  tag,
  subtitle,
  accent = 'green',
  onClick,
  onCalendar,
}: {
  title: string
  tag: string
  subtitle?: string
  accent?: 'green' | 'yellow' | 'blue' | 'purple'
  onClick?: () => void
  onCalendar?: () => void
}) {
  const accentBar =
    accent === 'yellow'
      ? 'border-l-cinema-gold'
      : accent === 'blue'
        ? 'border-l-cinema-cyan'
        : accent === 'purple'
          ? 'border-l-[#a855f7]'
          : 'border-l-emerald-500'

  return (
    <div className="flex items-stretch gap-1.5">
      <button
        type="button"
        onClick={onClick}
        className={`mode-btn relative min-w-0 flex-1 border-l-4 ${accentBar} px-3 pt-5 pb-2.5 text-left`}
      >
        <span className="ribbon">{tag}</span>
        <span className="font-display block text-xl leading-none tracking-wide sm:text-2xl">
          {title}
        </span>
        {subtitle ? (
          <span className="mt-1 block text-[11px] font-normal text-white/55">
            {subtitle}
          </span>
        ) : null}
      </button>
      {onCalendar ? (
        <button
          type="button"
          className="calendar-tab"
          onClick={onCalendar}
          aria-label="Calendário — jogos anteriores"
          title="Jogos anteriores"
        >
          <CalendarIcon />
          <span className="text-[8px] font-bold tracking-wide text-white/70 uppercase">
            Dias
          </span>
        </button>
      ) : null}
    </div>
  )
}
