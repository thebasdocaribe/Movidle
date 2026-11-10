import { useEffect, useState, type ReactNode } from 'react'
import { fetchRank, type RankEntry } from '../api'
import type { AuthUser, ProgressMap } from '../auth'
import {
  CalendarIcon,
  DayCalendarModal,
  todayBRT,
} from '../components/DayCalendarModal'

/** Countdown até meia-noite America/Sao_Paulo (reset dos diários). */
function useDailyResetCountdown() {
  const [label, setLabel] = useState('—:—:—')

  useEffect(() => {
    function tick() {
      const brtParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(new Date())

      const get = (type: string) =>
        Number(brtParts.find((p) => p.type === type)?.value || 0)
      const secToday = get('hour') * 3600 + get('minute') * 60 + get('second')
      let left = 24 * 3600 - secToday
      if (left <= 0) left = 24 * 3600

      const hh = String(Math.floor(left / 3600)).padStart(2, '0')
      const mm = String(Math.floor((left % 3600) / 60)).padStart(2, '0')
      const ss = String(left % 60).padStart(2, '0')
      setLabel(`${hh}:${mm}:${ss}`)
    }

    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  return label
}

type HubScreenProps = {
  user: AuthUser | null
  progress: ProgressMap
  onPlayDaily: (date?: string) => void
  onPlayCast: (date?: string) => void
  onPlayClassic: () => void
  onPlayCastEndless: () => void
  onPlayCharacter: (date?: string) => void
  onPlayWhoami: (date?: string) => void
  onPlayWhoamiEndless: () => void
  onPlayKeywords: (date?: string) => void
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
  onPlayWhoami,
  onPlayWhoamiEndless,
  onPlayKeywords,
  onPlayDuel,
  onOpenAuth,
  onOpenProfile,
}: HubScreenProps) {
  const [rankTab, setRankTab] = useState<RankTab>('daily')
  const [entries, setEntries] = useState<RankEntry[]>([])
  const [rankLoading, setRankLoading] = useState(false)
  const [calendarFor, setCalendarFor] = useState<
    'daily' | 'cast' | 'character' | 'whoami' | 'keywords' | null
  >(null)
  const today = todayBRT()
  const dailyResetIn = useDailyResetCountdown()
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
    <div className="hub-layout relative min-h-0 flex-1">
      <HubDecorations />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col px-3 pt-1 pb-6 sm:px-5 sm:pb-8">
        {!user ? (
          <p className="mb-3 w-full text-center text-xs text-cinema-muted">
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
        ) : null}

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start lg:gap-4">
          <section className="hub-panel">
            <div className="hub-daily-banner">
              <div className="hub-daily-banner-left">
                <span className="hub-daily-banner-ico" aria-hidden>
                  <IconClapper />
                </span>
                <div className="min-w-0">
                  <h2 className="hub-daily-banner-title">DIÁRIOS</h2>
                  <p className="hub-daily-banner-sub">
                    Desafios diários para testar seus conhecimentos
                  </p>
                </div>
              </div>
              <div className="hub-daily-banner-right">
                <div className="hub-daily-banner-reset">
                  <span className="hub-daily-banner-clock" aria-hidden>
                    <IconClock />
                  </span>
                  <div className="text-right">
                    <p className="hub-daily-banner-reset-label">
                      Próxima atualização:
                    </p>
                    <p className="hub-daily-banner-timer">{dailyResetIn}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <ModeRow
                title="CLÁSSICO"
                tag="Diário"
                subtitle="Adivinhe o filme pelo clipe."
                thumbKey="classic"
                icon={<IconCamera />}
                onClick={() => onPlayDaily()}
                onCalendar={() => setCalendarFor('daily')}
              />
              <ModeRow
                title="POSTER"
                tag="Diário"
                subtitle="Adivinhe o poster pelo elenco."
                thumbKey="poster"
                icon={<IconMask />}
                onClick={() => onPlayCast()}
                onCalendar={() => setCalendarFor('cast')}
              />
              <ModeRow
                title="PERSONAGEM"
                tag="Diário"
                subtitle="Adivinhe o personagem pelo recorte."
                thumbKey="character"
                icon={<IconHelmet />}
                onClick={() => onPlayCharacter()}
                onCalendar={() => setCalendarFor('character')}
              />
              <ModeRow
                title="PALAVRA-CHAVE"
                tag="Diário"
                subtitle="4 palavras → +3 por erro · pôster na 6ª."
                thumbKey="keywords"
                icon={<IconRing />}
                onClick={() => onPlayKeywords()}
                onCalendar={() => setCalendarFor('keywords')}
              />
              <ModeRow
                title="QUEM SOU EU"
                tag="Difícil"
                tagTone="hard"
                subtitle="Orçamento único de dicas: gênero, época, origem…"
                thumbKey="whoami"
                icon={<IconSilhouette />}
                onClick={() => onPlayWhoami()}
                onCalendar={() => setCalendarFor('whoami')}
              />
            </div>
          </section>

          <div className="flex flex-col gap-3">
            <section className="hub-panel">
              <div className="hub-section-banner">
                <span className="hub-section-banner-ico" aria-hidden>
                  <IconTrophy />
                </span>
                <div className="min-w-0">
                  <h2 className="hub-section-banner-title">MULTIJOGADOR</h2>
                  <p className="hub-section-banner-sub">
                    Jogue com amigos ou outros jogadores
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onPlayDuel}
                className="hub-multi-btn"
              >
                <span className="hub-multi-ico">
                  <IconUsers />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="font-display block text-xl leading-none text-white sm:text-2xl">
                    JOGAR COM AMIGOS
                  </span>
                  <span className="mt-1 block text-[11px] text-cinema-muted">
                    Sala privada por convite
                  </span>
                </span>
                <span className="hub-multi-chevron" aria-hidden>
                  ›
                </span>
              </button>
            </section>

            <section className="hub-panel">
              <div className="hub-section-banner">
                <span className="hub-section-banner-ico" aria-hidden>
                  <IconInfinity />
                </span>
                <div className="min-w-0">
                  <h2 className="hub-section-banner-title">ILIMITADOS</h2>
                  <p className="hub-section-banner-sub">
                    Modos sem limite de rodadas
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <EndlessRow
                  title="MARATONA"
                  subtitle="Clipes sem parar."
                  onClick={onPlayClassic}
                />
                <EndlessRow
                  title="POSTER"
                  subtitle="Posters sem parar."
                  onClick={onPlayCastEndless}
                />
                <EndlessRow
                  title="QUEM SOU EU"
                  subtitle="Descubra o filme sem limites."
                  onClick={onPlayWhoamiEndless}
                />
              </div>
            </section>
          </div>
        </div>

        <section
          id="hall-da-fama"
          className="hub-panel hub-hall mt-4 scroll-mt-24 overflow-hidden p-0 sm:mt-5"
        >
          <div className="hub-hall-head">
            <div className="hub-hall-title-wrap">
              <span className="hub-hall-star" aria-hidden>
                <IconStar />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <h2 className="hub-hall-title">HALL DA FAMA</h2>
                  <p className="hub-hall-sub">
                    Os melhores jogadores do CineBlitz
                  </p>
                </div>
              </div>
            </div>
            <div className="hub-hall-tabs">
              {(
                [
                  ['daily', 'Clássico'],
                  ['cast', 'Poster'],
                  ['classic', 'Maratona'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRankTab(key)}
                  className={`hub-hall-tab ${
                    rankTab === key ? 'hub-hall-tab-active' : ''
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-56 overflow-x-hidden overflow-y-auto px-2.5 py-2 sm:max-h-64">
            {rankLoading ? (
              <p className="py-4 text-center text-sm text-cinema-muted">
                Carregando rank…
              </p>
            ) : entries.length === 0 ? (
              <p className="py-6 text-center text-sm text-cinema-muted">
                Rank vazio. Jogue e some pontos.
              </p>
            ) : (
              <ol className="flex flex-col gap-1.5">
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
                        className={`rank-row-click hub-hall-row ${
                          isYou ? 'hub-hall-row-you' : ''
                        }`}
                      >
                        <span className="hub-hall-rank">#{row.rank}</span>
                        <img
                          src={avatar}
                          alt=""
                          className="rank-row-avatar hub-hall-avatar"
                        />
                        <span
                          className={`hub-hall-name ${
                            isYou ? 'hub-hall-name-you' : ''
                          }`}
                        >
                          {row.name}
                          {isYou ? ' (você)' : ''}
                        </span>
                        <span className="hub-hall-score">{row.score}</span>
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

        {user ? (
          <p className="mt-3 text-center text-[11px] text-cinema-muted sm:text-left">
            Clássico +{progress.daily.totalScore}
            <span className="mx-1.5 opacity-40">·</span>
            Poster +{progress.cast?.totalScore ?? 0}
            <span className="mx-1.5 opacity-40">·</span>
            Maratona +{progress.classic.totalScore}
          </p>
        ) : null}
      </div>

      {calendarFor ? (
        <DayCalendarModal
          title={
            calendarFor === 'daily'
              ? 'Clássico'
              : calendarFor === 'cast'
                ? 'Poster'
                : calendarFor === 'whoami'
                  ? 'Quem sou eu'
                  : calendarFor === 'keywords'
                    ? 'Palavra-chave'
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
            else if (calendarFor === 'whoami') onPlayWhoami(date)
            else if (calendarFor === 'keywords') onPlayKeywords(date)
            else onPlayCharacter(date)
          }}
        />
      ) : null}
    </div>
  )
}

const MODE_THUMB_EXT: Record<string, string> = {
  classic: 'jpg',
  poster: 'webp',
  character: 'jpg',
  keywords: 'jpg',
  whoami: 'webp',
}

function ModeRow({
  title,
  tag,
  tagTone = 'daily',
  subtitle,
  thumbKey,
  thumbFit = 'cover',
  icon,
  onClick,
  onCalendar,
}: {
  title: string
  tag: string
  tagTone?: 'daily' | 'hard'
  subtitle?: string
  thumbKey: string
  /** contain = zoom out, mostra a foto inteira no quadrado */
  thumbFit?: 'cover' | 'contain'
  icon: ReactNode
  onClick?: () => void
  onCalendar?: () => void
}) {
  const [imgOk, setImgOk] = useState(true)
  const ext = MODE_THUMB_EXT[thumbKey] || 'webp'
  const src = `/hub/modes/${thumbKey}.${ext}`

  return (
    <div className="hub-mode-row">
      <button type="button" onClick={onClick} className="hub-mode-main">
        <span
          className={`hub-mode-thumb ${
            thumbFit === 'contain' ? 'hub-mode-thumb-contain' : ''
          }`}
          aria-hidden
        >
          {imgOk ? (
            <img
              src={src}
              alt=""
              className={
                thumbFit === 'contain'
                  ? 'h-full w-full object-contain p-0.5'
                  : 'h-full w-full object-cover'
              }
              onError={() => setImgOk(false)}
            />
          ) : (
            <span className="hub-mode-thumb-fallback">{icon}</span>
          )}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span
            className={`hub-mode-tag ${
              tagTone === 'hard' ? 'hub-mode-tag-hard' : ''
            }`}
          >
            {tag}
          </span>
          <span className="font-display mt-0.5 block text-xl leading-none tracking-wide text-white sm:text-2xl">
            {title}
          </span>
          {subtitle ? (
            <span className="mt-1 block text-[11px] leading-snug text-white/55">
              {subtitle}
            </span>
          ) : null}
        </span>
      </button>
      {onCalendar ? (
        <button
          type="button"
          className="hub-dias-btn"
          onClick={onCalendar}
          aria-label="Calendário — jogos anteriores"
          title="Jogos anteriores"
        >
          <CalendarIcon />
          <span>DIAS</span>
        </button>
      ) : null}
    </div>
  )
}

function EndlessRow({
  title,
  subtitle,
  onClick,
}: {
  title: string
  subtitle: string
  onClick?: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="hub-endless-row">
      <span className="min-w-0 flex-1 text-left">
        <span className="hub-mode-tag hub-mode-tag-free">Livre</span>
        <span className="font-display mt-0.5 block text-xl leading-none text-white">
          {title}
        </span>
        <span className="mt-1 block text-[11px] text-white/55">{subtitle}</span>
      </span>
      <span className="text-xl text-cinema-gold" aria-hidden>
        ›
      </span>
    </button>
  )
}

/** Faixas CSS + slots PNG (pipoca/ingresso) quando as artes existirem. */
function HubDecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="hub-filmstrip hub-filmstrip-left" />
      <div className="hub-filmstrip hub-filmstrip-right" />
      <img
        className="hub-art hub-art-popcorn"
        src="/hub/decor/popcorn.webp"
        alt=""
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
      />
      <img
        className="hub-art hub-art-ticket"
        src="/hub/decor/ticket.webp"
        alt=""
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
      />
      <div className="hub-ticket-fallback" />
    </div>
  )
}

function IconClapper() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.5 9h17v11.5h-17V9z" opacity="0.95" />
      <path d="M3.8 8.6l3.4-5.4 2.9 1.85-3.4 5.4H3.8zm5.9-1.8 3.4-2.1 2.9 4.7-3.4 2.15-2.9-4.75z" />
      <path
        d="M4.2 12.2h15.6M4.2 15.2h15.6M4.2 18.2h15.6"
        stroke="#1a0a12"
        strokeWidth="1.2"
        fill="none"
        opacity="0.35"
      />
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7.75v4.6l3.1 1.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconTrophy() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.2 3.5h7.6v4.2a3.8 3.8 0 0 1-7.6 0V3.5z" />
      <path d="M8.2 5.2H5.6A2.4 2.4 0 0 0 8 9.2M15.8 5.2h2.6A2.4 2.4 0 0 1 16 9.2" />
      <path d="M11.1 11.8h1.8v2.4h-1.8z" />
      <path d="M9.4 18.8h5.2v1.5H9.4z" />
      <path d="M10.2 14.2h3.6v2.6a1.8 1.8 0 0 1-1.8 1.8h0a1.8 1.8 0 0 1-1.8-1.8v-2.6z" />
      <path d="M12 6.2l.7 1.4 1.5.2-1.1 1.1.3 1.5L12 9.6l-1.4.8.3-1.5-1.1-1.1 1.5-.2.7-1.4z" />
    </svg>
  )
}

function IconStar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.8l2.55 5.35 5.9.7-4.35 4.05 1.2 5.8L12 15.9l-5.3 2.8 1.2-5.8L3.55 8.85l5.9-.7L12 2.8z" />
    </svg>
  )
}

function IconInfinity() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 12c0-2.2 1.7-4 3.8-4 1.4 0 2.5.7 3.2 1.8L12 12l2 2.2c.7 1.1 1.8 1.8 3.2 1.8 2.1 0 3.8-1.8 3.8-4s-1.7-4-3.8-4c-1.4 0-2.5.7-3.2 1.8L12 12l-2-2.2C9.3 8.7 8.2 8 6.8 8 4.7 8 3 9.8 3 12s1.7 4 3.8 4c1.4 0 2.5-.7 3.2-1.8"
        stroke="currentColor"
        strokeWidth="2.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="7" r="2.4" />
      <circle cx="6.2" cy="8.3" r="2" />
      <circle cx="17.8" cy="8.3" r="2" />
      <path d="M7.6 18.6c.5-2.6 2.1-4.2 4.4-4.2s3.9 1.6 4.4 4.2H7.6z" />
      <path
        d="M4.2 18.6c.35-2.1 1.45-3.4 3.05-3.85-.35.7-.55 1.55-.6 2.55v1.3H4.2z"
        opacity="0.9"
      />
      <path
        d="M19.8 18.6h-2.45v-1.3c-.05-1-.25-1.85-.6-2.55 1.6.45 2.7 1.75 3.05 3.85z"
        opacity="0.9"
      />
    </svg>
  )
}

function IconCamera() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect
        x="3"
        y="8"
        width="12"
        height="9"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="9" cy="12.5" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M15 11l5-2.5v8L15 14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconMask() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 10c0-3.5 3-6 7-6s7 2.5 7 6v2c0 4-2.5 7-7 8.5C7.5 19 5 16 5 12v-2z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M9 12.5h.01M15 12.5h.01M9.5 16c1.2 1 3.8 1 5 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconHelmet() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 14c0-4 2.5-7.5 6-7.5s6 3.5 6 7.5v3H6v-3z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M5 17h14M12 6.5V4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconRing() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="13" r="6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="13" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 7V4.5M10 4.5h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconSilhouette() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M6.5 19c1-3.5 3-5 5.5-5s4.5 1.5 5.5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
