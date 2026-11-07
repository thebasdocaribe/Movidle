import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  fetchAutocomplete,
  fetchCastDaily,
  fetchCastNext,
  finishRound,
  postCastGuess,
  type Achievement,
  type AutocompleteItem,
  type CastDailyPayload,
  type CastHint,
} from '../api'
import {
  DailyModeNav,
  type DailyNavMode,
  type DailyPlayedMap,
} from '../components/DailyModeNav'
import { PixelPoster, castMosaicColumns } from '../components/PixelPoster'
import type { AuthUser, ProgressMap } from '../auth'
import { modeProgress } from '../auth'
import { multiplierForStreak } from '../scoring'

type CastScreenProps = {
  variant: 'daily' | 'endless'
  user: AuthUser | null
  progress: ProgressMap
  onProgress: (p: ProgressMap) => void
  onAchievements?: (list: Achievement[]) => void
  castPlayedToday: boolean
  onCastPlayed: () => void
  /** YYYY-MM-DD do calendário; null = hoje */
  puzzleDate?: string | null
  onBack: () => void
  /** Atalhos na tela de fim (diário) */
  onPlayYesterday?: () => void
  onPlayEndless?: () => void
  modeNav?: {
    active: DailyNavMode
    played: DailyPlayedMap
    onSelect: (mode: DailyNavMode) => void
  } | null
}

const MAX_TAKE = 7
const ENDLESS_STREAK_GOAL = 50
const ENDLESS_RUN_KEY = 'cineblitz.castEndless.run'

type EndlessRun = { streak: number; ng: number }

function loadEndlessRun(): EndlessRun {
  try {
    const raw = sessionStorage.getItem(ENDLESS_RUN_KEY)
    if (!raw) return { streak: 0, ng: 0 }
    const parsed = JSON.parse(raw) as EndlessRun
    return {
      streak: Math.max(0, Number(parsed.streak) || 0),
      ng: Math.max(0, Number(parsed.ng) || 0),
    }
  } catch {
    return { streak: 0, ng: 0 }
  }
}

function saveEndlessRun(run: EndlessRun) {
  sessionStorage.setItem(ENDLESS_RUN_KEY, JSON.stringify(run))
}

function avatarUrl(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=128&background=1a0a12&color=ffc44d&bold=true`
}

/** ISO 3166-1 alpha-2 → flagcdn (mesmo “quadrado” das fotos) */
const REGION_FLAG: Record<string, string> = {
  eua: 'us',
  usa: 'us',
  us: 'us',
  'estados unidos': 'us',
  'reino unido': 'gb',
  uk: 'gb',
  gb: 'gb',
  england: 'gb',
  inglaterra: 'gb',
  italia: 'it',
  itália: 'it',
  it: 'it',
  franca: 'fr',
  frança: 'fr',
  fr: 'fr',
  alemanha: 'de',
  de: 'de',
  japao: 'jp',
  japão: 'jp',
  jp: 'jp',
  brasil: 'br',
  br: 'br',
  mexico: 'mx',
  méxico: 'mx',
  espanha: 'es',
  es: 'es',
  canada: 'ca',
  canadá: 'ca',
  australia: 'au',
  austrália: 'au',
  russia: 'ru',
  rússia: 'ru',
  china: 'cn',
  coreia: 'kr',
  'coreia do sul': 'kr',
  suecia: 'se',
  suécia: 'se',
  dinamarca: 'dk',
  noruega: 'no',
  holanda: 'nl',
  'paises baixos': 'nl',
  'países baixos': 'nl',
  belgica: 'be',
  bélgica: 'be',
  austria: 'at',
  áustria: 'at',
  polonia: 'pl',
  polônia: 'pl',
  india: 'in',
  índia: 'in',
  argentina: 'ar',
  chile: 'cl',
  portugal: 'pt',
  irlanda: 'ie',
  suica: 'ch',
  suíça: 'ch',
  'nova zelandia': 'nz',
  'nova zelândia': 'nz',
}

function regionFlagUrl(region: string): string | null {
  const first = String(region || '')
    .split(/[/,&+]/)[0]
    ?.trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
  if (!first || first === '—') return null
  const iso = REGION_FLAG[first]
  if (!iso) return null
  return `https://flagcdn.com/w160/${iso}.png`
}

function RegionFlagThumb({ region, show }: { region: string; show: boolean }) {
  const flag = regionFlagUrl(region)
  // Mesma altura das fotos; um pouco mais largo (bandeira ~3:2)
  const box =
    'flex h-10 w-[3.4rem] items-center justify-center overflow-hidden border border-white/20 bg-black/50 sm:h-12 sm:w-[4rem]'
  if (!show) {
    return <div className={`${box} text-xs text-cinema-muted`}>?</div>
  }
  if (flag) {
    return (
      <div className={box}>
        <img src={flag} alt="" className="h-full w-full object-cover" />
      </div>
    )
  }
  return (
    <div className={`${box} text-[10px] font-bold text-cinema-gold`}>
      {region.slice(0, 3).toUpperCase()}
    </div>
  )
}

function PersonThumb({
  name,
  imageUrl,
  show,
}: {
  name: string
  imageUrl?: string | null
  show: boolean
}) {
  // /cast/*.jpg local quase nunca existe — não usar como src (cai em iniciais)
  const resolvedUrl =
    imageUrl && !imageUrl.startsWith('/cast/')
      ? imageUrl
      : name && name !== '—'
        ? avatarUrl(name)
        : ''

  const [src, setSrc] = useState(resolvedUrl)

  useEffect(() => {
    setSrc(resolvedUrl)
  }, [resolvedUrl])

  if (!show) {
    return (
      <div className="flex h-10 w-10 items-center justify-center border border-white/20 bg-black/50 text-xs text-cinema-muted sm:h-12 sm:w-12">
        ?
      </div>
    )
  }

  if (!name || name === '—' || name === 'Sem antagonista') {
    return (
      <div className="flex h-10 w-10 items-center justify-center border border-cinema-cyan/40 bg-[#0a2030] text-[10px] text-cinema-cyan sm:h-12 sm:w-12">
        —
      </div>
    )
  }

  return (
    <div className="h-10 w-10 overflow-hidden border border-white/20 bg-black/50 sm:h-12 sm:w-12">
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        onError={() => setSrc(avatarUrl(name))}
      />
    </div>
  )
}

export function CastScreen({
  variant,
  user,
  progress,
  onProgress,
  onAchievements,
  castPlayedToday,
  onCastPlayed,
  puzzleDate = null,
  onBack,
  modeNav = null,
  onPlayYesterday,
  onPlayEndless,
}: CastScreenProps) {
  const endless = variant === 'endless'
  const [daily, setDaily] = useState<CastDailyPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [guess, setGuess] = useState('')
  const [busy, setBusy] = useState(false)
  const [ended, setEnded] = useState(false)
  const [won, setWon] = useState(false)
  const [revealTitle, setRevealTitle] = useState<string | null>(null)
  const [revealYear, setRevealYear] = useState<number | undefined>()
  const [points, setPoints] = useState(0)
  const [wrongGuesses, setWrongGuesses] = useState<
    { text: string; franchise: boolean }[]
  >([])
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [playedIds, setPlayedIds] = useState<string[]>([])
  const [endlessStreak, setEndlessStreak] = useState(0)
  const [endlessNg, setEndlessNg] = useState(0)
  const [specialistOpen, setSpecialistOpen] = useState(false)
  const guessRef = useRef<HTMLInputElement>(null)
  const suggestTimer = useRef<number | null>(null)

  function applyEndlessWin() {
    if (!endless) return
    const next = endlessStreak + 1
    if (next >= ENDLESS_STREAK_GOAL) {
      const ngNext = endlessNg + 1
      setEndlessStreak(0)
      setEndlessNg(ngNext)
      saveEndlessRun({ streak: 0, ng: ngNext })
      setSpecialistOpen(true)
      // som do especialista: plugar depois
      return
    }
    setEndlessStreak(next)
    saveEndlessRun({ streak: next, ng: endlessNg })
  }

  function applyEndlessLose() {
    if (!endless) return
    setEndlessStreak(0)
    saveEndlessRun({ streak: 0, ng: endlessNg })
  }

  const todayKey = useMemo(
    () =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date()),
    [],
  )
  const activeDate = endless ? null : puzzleDate || todayKey
  const isArchive = Boolean(activeDate && activeDate < todayKey)

  const prog = modeProgress(progress, 'cast')
  const unlocked = ended ? MAX_TAKE : Math.min(attempt + 1, MAX_TAKE)
  /** Despixeliza a cada dica; 100% nítido só quando a partida acaba */
  const sharp = ended
  const columns = sharp ? 1 : castMosaicColumns(attempt)

  const hints: CastHint[] = useMemo(() => daily?.hints ?? [], [daily])

  async function loadPuzzle(exclude: string[] = playedIds) {
    setLoading(true)
    setLoadError(null)
    try {
      const data = endless
        ? await fetchCastNext(exclude)
        : await fetchCastDaily(activeDate || undefined)
      setDaily(data)
      if (endless && data.puzzleId) {
        setPlayedIds((prev) =>
          prev.includes(data.puzzleId) ? prev : [...prev, data.puzzleId],
        )
      }
      const pr = data.priorResult
      if (!endless && pr && !isArchive) {
        onCastPlayed()
        setWon(Boolean(pr.won))
        setEnded(true)
        setPoints(pr.points ?? 0)
        setRevealTitle(pr.titlePt || pr.title || '?')
        setRevealYear(pr.year)
        setAttempt(MAX_TAKE - 1)
        setHint('Você já jogou · resultado do dia')
      } else if (
        !endless &&
        !isArchive &&
        (data.alreadyPlayed || castPlayedToday)
      ) {
        onCastPlayed()
      }
      return data
    } catch (err) {
      setLoadError((err as Error).message)
      return null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setAttempt(0)
    setEnded(false)
    setWon(false)
    setWrongGuesses([])
    setGuess('')
    setRevealTitle(null)
    setRevealYear(undefined)
    setPoints(0)
    setHint(null)
    setPlayedIds([])
    setSpecialistOpen(false)
    if (endless) {
      const run = loadEndlessRun()
      setEndlessStreak(run.streak)
      setEndlessNg(run.ng)
    } else {
      setEndlessStreak(0)
      setEndlessNg(0)
    }
    void loadPuzzle([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, activeDate])

  function queueAutocomplete(value: string) {
    if (suggestTimer.current) window.clearTimeout(suggestTimer.current)
    suggestTimer.current = window.setTimeout(() => {
      void fetchAutocomplete(value)
        .then((res) => {
          setSuggestions(res.suggestions)
          setShowSuggestions(res.suggestions.length > 0)
        })
        .catch(() => {
          setSuggestions([])
          setShowSuggestions(false)
        })
    }, 200)
  }

  async function persist(outcome: 'win' | 'lose', take: number) {
    if (!daily || !user) return null
    const finished = await finishRound({
      mode: 'cast',
      puzzleId: daily.puzzleId,
      outcome,
      take,
      endless,
    })
    onProgress(finished.progress)
    if (finished.unlockedAchievements?.length) {
      onAchievements?.(finished.unlockedAchievements)
    }
    if (!endless && !isArchive) onCastPlayed()
    return finished
  }

  function jumpForward(index: number) {
    if (ended || busy) return
    if (index <= attempt || index >= MAX_TAKE) return
    setAttempt(index)
    setHint(`Pulou pra dica ${index + 1} · sem voltar`)
  }

  async function goNextEndless() {
    setAttempt(0)
    setEnded(false)
    setWon(false)
    setWrongGuesses([])
    setGuess('')
    setHint(null)
    setRevealTitle(null)
    await loadPuzzle([...playedIds])
  }

  async function skipEmptyConfirm() {
    if (!daily || busy || ended) return
    if (!endless && !isArchive && user && (daily.alreadyPlayed || castPlayedToday)) {
      setHint('Você já jogou o poster de hoje')
      return
    }
    if (attempt + 1 >= MAX_TAKE) {
      setBusy(true)
      try {
        const finished = user ? await persist('lose', MAX_TAKE) : null
        setWon(false)
        setEnded(true)
        if (!endless && !isArchive && !user) onCastPlayed()
        setPoints(0)
        applyEndlessLose()
        setRevealTitle(finished?.titlePt || finished?.title || '?')
        setRevealYear(finished?.year)
        setHint(null)
      } catch (err) {
        setHint((err as Error).message)
      } finally {
        setBusy(false)
      }
      return
    }
    setAttempt((a) => a + 1)
    setHint(`Pulou dica ${attempt + 1} · próxima`)
  }

  async function submitGuess(e: FormEvent) {
    e.preventDefault()
    if (!daily || busy || ended) return
    const typed = guess.trim()

    // Confirmar vazio: pula dica (igual ao modo clipe)
    if (!typed) {
      await skipEmptyConfirm()
      return
    }

    if (!endless && !isArchive && user && (daily.alreadyPlayed || castPlayedToday)) {
      setHint('Você já jogou o poster de hoje')
      return
    }

    setBusy(true)
    setShowSuggestions(false)
    try {
      const result = await postCastGuess({
        puzzleId: daily.puzzleId,
        attempt: attempt + 1,
        guess: typed,
      })

      if (result.correct) {
        const finished = user ? await persist('win', attempt + 1) : null
        setWon(true)
        setEnded(true)
        if (!endless && !isArchive && !user) onCastPlayed()
        setPoints(finished?.points ?? result.points)
        applyEndlessWin()
        setRevealTitle(
          finished?.titlePt ||
            finished?.title ||
            result.titlePt ||
            result.title ||
            typed,
        )
        setRevealYear(finished?.year ?? result.year)
        setHint(user ? null : 'Guest · entre pra salvar no rank')
        return
      }

      setWrongGuesses((prev) => [
        ...prev,
        { text: typed, franchise: Boolean(result.franchise) },
      ])
      setGuess('')

      if (attempt + 1 >= MAX_TAKE) {
        const finished = user ? await persist('lose', MAX_TAKE) : null
        setWon(false)
        setEnded(true)
        if (!endless && !isArchive && !user) onCastPlayed()
        setPoints(0)
        applyEndlessLose()
        setRevealTitle(
          finished?.titlePt ||
            finished?.title ||
            result.titlePt ||
            result.title ||
            '?',
        )
        setRevealYear(finished?.year ?? result.year)
        return
      }

      setAttempt((a) => a + 1)
      setHint(
        result.franchise
          ? `Mesma franquia · “${typed}” · próxima dica`
          : `Errou: “${typed}” · próxima dica`,
      )
    } catch (err) {
      setHint((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const blocked = Boolean(
    !endless &&
      !isArchive &&
      !ended &&
      user &&
      (daily?.alreadyPlayed || castPlayedToday),
  )

  return (
    <div className="min-h-0 flex-1">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-3 py-4 sm:px-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="border border-cinema-line px-2 py-1 text-xs text-cinema-gold"
          >
            ← Lobby
          </button>
          <h1 className="font-display text-2xl text-white sm:text-3xl">
            POSTER
          </h1>
          <p className="text-[10px] text-cinema-muted">
            +{prog.totalScore} · ×
            {multiplierForStreak(prog.firstTryStreak)
              .toFixed(2)
              .replace(/\.00$/, '')}
          </p>
        </div>

        {modeNav ? (
          <DailyModeNav
            active={modeNav.active}
            played={modeNav.played}
            onSelect={modeNav.onSelect}
          />
        ) : null}

        <p className="text-center text-xs text-cinema-muted">
          {endless
            ? 'Ilimitado'
            : isArchive
              ? `Arquivo ${activeDate} · 0 pts`
              : 'Diário'}{' '}
          · dica {Math.min(attempt + 1, MAX_TAKE)}/{MAX_TAKE}
          {endless ? (
            <>
              {' '}
              ·{' '}
              <span className="font-mono text-cinema-gold tabular-nums">
                {endlessNg > 0 ? `NG+${endlessNg} · ` : ''}
                {endlessStreak}/{ENDLESS_STREAK_GOAL}
              </span>
            </>
          ) : null}
        </p>

        {loading ? (
          <p className="text-center text-cinema-muted">Carregando…</p>
        ) : loadError ? (
          <p className="text-center text-cinema-red">{loadError}</p>
        ) : daily ? (
          <>
            <div className="panel-frame overflow-hidden p-0">
              <div className="relative aspect-[16/9] w-full bg-[#050308]">
                {daily.posterUrl ? (
                  <PixelPoster
                    src={daily.posterUrl}
                    columns={columns}
                    sharp={sharp}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-cinema-muted">
                    Sem pôster
                  </div>
                )}
                {ended ? (
                  <div className="absolute inset-0 z-10 flex items-stretch bg-black/90 px-3 py-3 sm:px-6 sm:py-4">
                    {daily.posterUrl ? (
                      <img
                        src={daily.posterUrl}
                        alt=""
                        className="win-soft my-auto h-[70%] max-h-64 w-auto shrink-0 border-2 border-cinema-gold/70 object-cover sm:max-h-72 sm:w-40"
                      />
                    ) : null}
                    <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-3 text-center sm:px-6">
                      {won ? (
                        <>
                          <p className="win-soft font-display text-4xl leading-none text-cinema-gold sm:text-6xl">
                            ACERTOU!
                          </p>
                          <p className="win-soft mt-1 font-display text-3xl text-cinema-red sm:text-4xl">
                            +{points} PTS
                          </p>
                          <p className="win-soft mt-2 text-lg font-semibold text-white sm:text-xl">
                            {revealTitle}
                            {revealYear ? ` (${revealYear})` : ''}
                          </p>
                          {endless ? (
                            <p className="mt-2 font-mono text-sm text-cinema-gold tabular-nums">
                              {endlessNg > 0 ? `NG+${endlessNg} · ` : ''}
                              sequência {endlessStreak}/{ENDLESS_STREAK_GOAL}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <p className="win-soft font-display text-5xl text-cinema-muted sm:text-6xl">
                            FIM
                          </p>
                          <p className="mt-2 text-base text-white sm:text-lg">
                            0 pts · era {revealTitle}
                            {revealYear ? ` (${revealYear})` : ''}
                          </p>
                          {endless ? (
                            <p className="mt-2 font-mono text-sm text-cinema-muted tabular-nums">
                              sequência zerada · {endlessNg > 0 ? `NG+${endlessNg} · ` : ''}
                              0/{ENDLESS_STREAK_GOAL}
                            </p>
                          ) : null}
                        </>
                      )}
                      {endless ? (
                        <button
                          type="button"
                          onClick={() => void goNextEndless()}
                          className="mode-btn mode-btn-primary mode-btn-inline mt-4 px-6 py-2.5 font-display text-xl"
                        >
                          PRÓXIMO FILME
                        </button>
                      ) : (
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                          {!isArchive && onPlayYesterday ? (
                            <button
                              type="button"
                              onClick={onPlayYesterday}
                              className="mode-btn mode-btn-inline border-cinema-line px-4 py-2 font-display text-lg text-white"
                            >
                              ONTEM
                            </button>
                          ) : null}
                          {onPlayEndless ? (
                            <button
                              type="button"
                              onClick={onPlayEndless}
                              className="mode-btn mode-btn-primary mode-btn-inline px-4 py-2 font-display text-lg"
                            >
                              ILIMITADO
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={onBack}
                            className="mode-btn mode-btn-inline border-cinema-gold px-4 py-2 font-display text-lg text-cinema-gold"
                          >
                            LOBBY
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="overflow-x-auto pb-1">
              <ul className="mx-auto flex w-max min-w-full justify-center gap-1.5 sm:gap-2">
                {hints.map((h, i) => {
                  const open = i < unlocked
                  const current = i === attempt && !ended
                  const canJump = !ended && !busy && i > attempt
                  return (
                    <li
                      key={h.kind}
                      className={
                        h.kind === 'region'
                          ? 'w-[5.2rem] shrink-0 sm:w-[6rem]'
                          : 'w-[4.6rem] shrink-0 sm:w-[5.4rem]'
                      }
                    >
                      <p className="mb-1 truncate text-center text-[9px] font-bold tracking-wide text-white uppercase sm:text-[10px]">
                        {h.label}
                      </p>
                      <button
                        type="button"
                        disabled={!canJump}
                        onClick={() => jumpForward(i)}
                        className={`flex w-full flex-col items-center border-2 px-1 py-1.5 ${
                          current
                            ? 'border-cinema-red bg-cinema-red/25'
                            : open
                              ? h.empty
                                ? 'border-cinema-cyan/70 bg-[#0a2030]'
                                : 'border-white/70 bg-[#1a1020]'
                              : canJump
                                ? 'border-cinema-line/60 bg-black/40 hover:border-cinema-gold'
                                : 'border-cinema-line/40 bg-black/30 opacity-50'
                        }`}
                      >
                        {h.kind === 'year' ? (
                          <div className="flex h-10 w-10 items-center justify-center border border-white/20 bg-black/50 text-[10px] font-bold text-cinema-gold sm:h-12 sm:w-12">
                            {open ? h.name : '?'}
                          </div>
                        ) : h.kind === 'region' ? (
                          <RegionFlagThumb region={h.name} show={open} />
                        ) : (
                          <PersonThumb
                            name={h.name}
                            imageUrl={h.imageUrl}
                            show={open}
                          />
                        )}
                        <p
                          className={`mt-1 line-clamp-2 min-h-[2rem] text-center text-[10px] font-semibold leading-tight sm:text-[11px] ${
                            open ? 'text-white' : 'text-cinema-muted'
                          }`}
                        >
                          {open ? h.name : '???'}
                        </p>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>

            {wrongGuesses.length > 0 ? (
              <ul className="flex flex-wrap justify-center gap-1">
                {wrongGuesses.map((g, i) => (
                  <li
                    key={`${g.text}-${i}`}
                    className={
                      g.franchise
                        ? 'border border-cinema-gold bg-cinema-gold/25 px-2 py-0.5 text-[11px] text-cinema-gold'
                        : 'border border-cinema-red/60 bg-cinema-red/20 px-2 py-0.5 text-[11px] text-white'
                    }
                    title={g.franchise ? 'Mesma franquia' : 'Errou'}
                  >
                    {g.franchise ? '◆ ' : ''}
                    {g.text}
                    {g.franchise ? ' · franquia' : ''}
                  </li>
                ))}
              </ul>
            ) : null}

            {!ended && !blocked ? (
              <form
                onSubmit={submitGuess}
                className="relative flex flex-col gap-2 sm:flex-row"
              >
                <div className="relative min-w-0 flex-1">
                  <input
                    ref={guessRef}
                    value={guess}
                    onChange={(e) => {
                      setGuess(e.target.value)
                      queueAutocomplete(e.target.value)
                    }}
                    onFocus={() => {
                      if (suggestions.length) setShowSuggestions(true)
                    }}
                    onBlur={() => {
                      window.setTimeout(() => setShowSuggestions(false), 150)
                    }}
                    disabled={busy}
                    placeholder="Digite o filme…"
                    className="guess-input w-full"
                    autoComplete="off"
                  />
                  {showSuggestions ? (
                    <ul className="absolute right-0 bottom-full left-0 z-30 mb-1 max-h-48 overflow-auto border-2 border-cinema-gold bg-[#0a060c]">
                      {suggestions.map((item) => (
                        <li key={`${item.title}-${item.year}`}>
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-cinema-red/80"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setGuess(item.titlePt || item.title)
                              setShowSuggestions(false)
                            }}
                          >
                            {item.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="mode-btn mode-btn-primary mode-btn-inline px-5 py-3 font-display text-xl disabled:opacity-40"
                >
                  CONFIRMAR
                </button>
              </form>
            ) : null}

            {blocked && !ended ? (
              <p className="text-center font-display text-xl text-cinema-gold">
                {isArchive
                  ? 'VOCÊ JÁ JOGOU ESTE DIA'
                  : 'VOCÊ JÁ JOGOU O POSTER DE HOJE'}
              </p>
            ) : null}

            {hint ? (
              <p className="text-center text-xs text-cinema-muted">{hint}</p>
            ) : null}
          </>
        ) : null}
      </div>

      {specialistOpen ? (
        <div
          className="specialist-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="specialist-title"
        >
          <div className="specialist-card">
            <p className="text-[10px] font-bold tracking-[0.2em] text-cinema-gold uppercase">
              Novo ciclo
            </p>
            <h2
              id="specialist-title"
              className="font-display text-4xl leading-none text-white sm:text-5xl"
            >
              MODO ESPECIALISTA
            </h2>
            <p className="mt-2 text-sm text-cinema-muted">
              Você atingiu {ENDLESS_STREAK_GOAL} acertos seguidos.
            </p>
            <p className="mt-1 font-mono text-lg text-cinema-gold tabular-nums">
              NG+{endlessNg} · 0/{ENDLESS_STREAK_GOAL}
            </p>
            <button
              type="button"
              className="mode-btn mode-btn-primary mode-btn-inline mt-5 px-6 py-2.5 font-display text-xl"
              onClick={() => setSpecialistOpen(false)}
            >
              CONTINUAR
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
