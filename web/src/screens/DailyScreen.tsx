import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  fetchAutocomplete,
  fetchClassicNext,
  fetchDaily,
  finishRound,
  postGuess,
  type AutocompleteItem,
  type DailyPayload,
  type GameMode,
} from '../api'
import type { AuthUser, ProgressMap } from '../auth'
import { modeProgress } from '../auth'
import { multiplierForStreak } from '../scoring'

type Phase = 'idle' | 'ready' | 'countdown' | 'playing' | 'guess' | 'ended'

type EndState = {
  kind: 'win' | 'lose'
  points: number
  take: number
  filmTitle: string
  year?: number
  multiplier?: number
  posterUrl?: string | null
}

type DailyScreenProps = {
  mode: GameMode
  user: AuthUser | null
  progress: ProgressMap
  onProgress: (p: ProgressMap) => void
  dailyPlayedToday: boolean
  onDailyPlayed: () => void
  /** YYYY-MM-DD do calendário; null = hoje */
  puzzleDate?: string | null
  onBack: () => void
  onNeedAuth: () => void
}

const COUNTDOWN_FROM = 3
const COUNTDOWN_TICK_MS = 350
const CURTAIN_MS = 220
const LAST_TAKE = 5
/** Tentativa N = N takes de 1s (cenas diferentes concatenadas no MP4). */
const FALLBACK_DURATIONS = [1, 2, 3, 4, 5, 6] as const

const TAKE_LABEL: Record<number, string> = {
  1: 'DE PRIMEIRA',
  2: 'NA 2ª TENTATIVA',
  3: 'NA 3ª TENTATIVA',
  4: 'NA 4ª TENTATIVA',
  5: 'NA 5ª TENTATIVA',
  6: 'NO ÚLTIMO TAKE',
}

export function DailyScreen({
  mode,
  user,
  progress,
  onProgress,
  dailyPlayedToday,
  onDailyPlayed,
  puzzleDate = null,
  onBack,
  onNeedAuth,
}: DailyScreenProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [countdown, setCountdown] = useState(COUNTDOWN_FROM)
  const [attempt, setAttempt] = useState(0)
  const [guess, setGuess] = useState('')
  const [scoreHint, setScoreHint] = useState<string | null>(null)
  const [endState, setEndState] = useState<EndState | null>(null)
  const [confirmQuit, setConfirmQuit] = useState(false)
  const [daily, setDaily] = useState<DailyPayload | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [playedIds, setPlayedIds] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [sessionScore, setSessionScore] = useState(0)
  const [sessionHits, setSessionHits] = useState(0)
  const [firstTryStreak, setFirstTryStreak] = useState(0)
  const [floatPoints, setFloatPoints] = useState<number | null>(null)
  const [guessHistory, setGuessHistory] = useState<
    { label: string; count: number }[]
  >([])
  const guessRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const suggestTimer = useRef<number | null>(null)
  const floatTimer = useRef<number | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const currentMult = multiplierForStreak(firstTryStreak)

  const durations = daily?.takeDurations ?? [...FALLBACK_DURATIONS]
  const clipSeconds = durations[attempt] ?? 1
  const showFocusHint = attempt >= 4
  const mediaUrl = daily?.media.url
  const mediaType = daily?.media.type ?? 'image'
  const inRound =
    phase === 'ready' ||
    phase === 'countdown' ||
    phase === 'playing' ||
    phase === 'guess'
  /** Chute liberado o tempo todo no round (ready/countdown/playing/guess). */
  const canTypeGuess = inRound && !busy
  const title =
    mode === 'classic' ? 'MARATONA' : 'CLÁSSICO'

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
  const activeDate = mode === 'daily' ? puzzleDate || todayKey : null
  const isArchive = Boolean(activeDate && activeDate < todayKey)

  const dateLabel = useMemo(() => {
    const base = activeDate
      ? new Date(`${activeDate}T12:00:00`)
      : new Date()
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      timeZone: 'America/Sao_Paulo',
    }).format(base)
  }, [activeDate])

  function popPoints(points: number) {
    if (floatTimer.current) window.clearTimeout(floatTimer.current)
    setFloatPoints(points)
    floatTimer.current = window.setTimeout(() => setFloatPoints(null), 1100)
  }

  async function loadPuzzle(exclude: string[] = playedIds) {
    setLoading(true)
    setLoadError(null)
    try {
      const data =
        mode === 'classic'
          ? await fetchClassicNext(exclude)
          : await fetchDaily(activeDate || undefined)
      setDaily(data)
      if (mode === 'classic' && data.movieId) {
        setPlayedIds((prev) =>
          prev.includes(data.movieId!) ? prev : [...prev, data.movieId!],
        )
      }
      return data
    } catch (err) {
      setLoadError((err as Error).message || 'Falha ao carregar')
      return null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPhase('idle')
    setAttempt(0)
    setGuess('')
    setSuggestions([])
    setPlayedIds([])
    setDaily(null)
    setEndState(null)
    setFloatPoints(null)
    setGuessHistory([])
    const prog = modeProgress(progress, mode)
    setSessionScore(prog.totalScore)
    setSessionHits(prog.wins)
    setFirstTryStreak(prog.firstTryStreak)
    void loadPuzzle([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, user?.id, activeDate])

  const dailyLocked = Boolean(
    user &&
      mode === 'daily' &&
      (daily?.alreadyPlayed || (!isArchive && dailyPlayedToday)),
  )

  // Pré-carrega o MP4 assim que o puzzle chega (evita tela preta no 1º take)
  useEffect(() => {
    setVideoReady(mediaType !== 'video')
    const video = videoRef.current
    if (!video || mediaType !== 'video' || !mediaUrl) return

    const markReady = () => setVideoReady(true)
    if (video.readyState >= 2) markReady()
    video.addEventListener('loadeddata', markReady)
    video.addEventListener('canplay', markReady)
    video.load()
    return () => {
      video.removeEventListener('loadeddata', markReady)
      video.removeEventListener('canplay', markReady)
    }
  }, [mediaUrl, mediaType])

  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown <= 0) {
      // Espera o buffer mínimo pra não abrir em preto
      if (mediaType === 'video' && !videoReady) return
      setPhase('playing')
      return
    }
    const id = window.setTimeout(
      () => setCountdown((n) => n - 1),
      COUNTDOWN_TICK_MS,
    )
    return () => window.clearTimeout(id)
  }, [phase, countdown, mediaType, videoReady])

  useEffect(() => {
    if (phase !== 'playing') return
    // corta um frame antes do próximo take (evita “vazar” a cena N+1)
    const ms = Math.max(200, clipSeconds * 1000 - 80)
    const id = window.setTimeout(() => setPhase('guess'), ms)
    return () => window.clearTimeout(id)
  }, [phase, clipSeconds, attempt])

  useEffect(() => {
    const video = videoRef.current
    if (!video || mediaType !== 'video') return
    if (phase !== 'playing') {
      video.pause()
      return
    }

    const endAt = Math.max(0.05, clipSeconds - 0.08)
    const stopAtBoundary = () => {
      if (video.currentTime >= endAt) {
        video.pause()
        video.currentTime = endAt
      }
    }

    const start = () => {
      try {
        video.currentTime = 0
      } catch {
        /* ignore seek race */
      }
      void video.play().catch(() => {})
    }

    video.addEventListener('timeupdate', stopAtBoundary)
    if (video.readyState >= 2) {
      start()
    } else {
      const onReady = () => {
        video.removeEventListener('canplay', onReady)
        start()
      }
      video.addEventListener('canplay', onReady)
      return () => {
        video.removeEventListener('canplay', onReady)
        video.removeEventListener('timeupdate', stopAtBoundary)
        video.pause()
      }
    }
    return () => {
      video.removeEventListener('timeupdate', stopAtBoundary)
      video.pause()
    }
  }, [phase, attempt, mediaType, mediaUrl, clipSeconds])

  useEffect(() => {
    if (!inRound) return
    guessRef.current?.focus()
  }, [phase, attempt, inRound])

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
    }, 120)
  }

  function goReady(takeIndex: number) {
    setConfirmQuit(false)
    setGuess('')
    setSuggestions([])
    setShowSuggestions(false)
    setAttempt(takeIndex)
    setPhase('ready')
  }

  function startRound() {
    if (!daily) return
    // Guest joga livre; daily 1x/dia só trava conta logada
    if (dailyLocked) {
      setScoreHint(
        isArchive
          ? 'Você já jogou este dia do calendário'
          : 'Você já jogou o daily de hoje',
      )
      return
    }
    setScoreHint(null)
    setEndState(null)
    goReady(0)
  }

  function jumpToTake(takeIndex: number) {
    if (phase === 'idle' || phase === 'ended' || busy) return
    // Só pra frente — voltar seria exploit de pontuação
    if (takeIndex <= attempt || takeIndex > LAST_TAKE) return
    if (phase === 'countdown' || phase === 'playing') return
    videoRef.current?.pause()
    goReady(takeIndex)
  }

  async function persistRound(outcome: 'win' | 'lose', take: number) {
    if (!daily || !user) throw new Error('Faça login')
    const finished = await finishRound({
      mode,
      puzzleId: daily.puzzleId,
      outcome,
      take,
    })
    onProgress(finished.progress)
    const prog = modeProgress(finished.progress, mode)
    setSessionScore(prog.totalScore)
    setSessionHits(prog.wins)
    setFirstTryStreak(prog.firstTryStreak)
    if (mode === 'daily' && !isArchive) onDailyPlayed()
    return finished
  }

  function playCurrentTake() {
    if (phase !== 'ready') return
    setGuess('')
    setCountdown(COUNTDOWN_FROM)
    setPhase('countdown')
  }

  function skipWithoutWatching() {
    if (attempt >= LAST_TAKE) {
      void finishGiveUp()
      return
    }
    setScoreHint(`Pulou take ${attempt + 1} · próximo`)
    goReady(attempt + 1)
  }

  async function finishGiveUp() {
    if (!daily) return
    setBusy(true)
    try {
      if (user) {
        const result = await persistRound('lose', attempt + 1)
        setEndState({
          kind: 'lose',
          points: 0,
          take: attempt + 1,
          filmTitle: result.titlePt || result.title,
          year: result.year,
          posterUrl: result.posterUrl || daily.posterUrl || null,
          multiplier: 1,
        })
      } else {
        setEndState({
          kind: 'lose',
          points: 0,
          take: attempt + 1,
          filmTitle: '—',
          posterUrl: daily.posterUrl || null,
          multiplier: 1,
        })
      }
      setScoreHint(null)
      setPhase('ended')
    } catch (err) {
      setScoreHint(`Erro: ${(err as Error).message}`)
    } finally {
      setBusy(false)
      setConfirmQuit(false)
    }
  }

  async function goNextClassic() {
    setAttempt(0)
    setGuess('')
    setConfirmQuit(false)
    setEndState(null)
    setScoreHint(null)
    setSuggestions([])
    setGuessHistory([])
    setPhase('idle')
    const data = await loadPuzzle([...playedIds])
    if (data) goReady(0)
  }

  async function submitTypedGuess(typed: string) {
    if (!daily) return

    setBusy(true)
    setShowSuggestions(false)
    try {
      const result = await postGuess({
        puzzleId: daily.puzzleId,
        attempt: attempt + 1,
        guess: typed,
      })

      const filmTitle = result.titlePt || result.title || typed
      if (
        mode === 'daily' &&
        typeof result.alsoGuessedCount === 'number' &&
        result.alsoGuessedCount > 0
      ) {
        setGuessHistory((prev) => [
          { label: typed, count: result.alsoGuessedCount! },
          ...prev.filter((g) => g.label.toLowerCase() !== typed.toLowerCase()),
        ])
      }

      if (result.correct) {
        if (user) {
          const finished = await persistRound('win', attempt + 1)
          popPoints(finished.points)
          setEndState({
            kind: 'win',
            points: finished.points,
            take: attempt + 1,
            filmTitle: finished.titlePt || finished.title || filmTitle,
            year: finished.year ?? result.year,
            posterUrl:
              finished.posterUrl ||
              result.posterUrl ||
              daily.posterUrl ||
              null,
            multiplier: finished.multiplier,
          })
          setScoreHint(null)
        } else {
          popPoints(result.points)
          setSessionScore((s) => s + result.points)
          setEndState({
            kind: 'win',
            points: result.points,
            take: attempt + 1,
            filmTitle,
            year: result.year,
            posterUrl: result.posterUrl || daily.posterUrl || null,
            multiplier: 1,
          })
          setScoreHint('Guest · entre pra salvar pontos no rank')
        }
        setPhase('ended')
        return
      }

      setScoreHint(`Errou: “${typed}” · take ${attempt + 1}/6`)

      if (attempt >= LAST_TAKE) {
        if (user) {
          const finished = await persistRound('lose', 6)
          setEndState({
            kind: 'lose',
            points: 0,
            take: 6,
            filmTitle: finished.titlePt || finished.title || filmTitle,
            year: finished.year ?? result.year,
            posterUrl:
              finished.posterUrl ||
              result.posterUrl ||
              daily.posterUrl ||
              null,
            multiplier: 1,
          })
        } else {
          setEndState({
            kind: 'lose',
            points: 0,
            take: 6,
            filmTitle: result.titlePt || result.title || filmTitle,
            year: result.year,
            posterUrl: result.posterUrl || daily.posterUrl || null,
            multiplier: 1,
          })
        }
        setPhase('ended')
        return
      }

      goReady(attempt + 1)
    } catch (err) {
      setScoreHint(`Erro API: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function submitGuess(event: FormEvent) {
    event.preventDefault()
    if (!canTypeGuess || !daily) return

    const typed = guess.trim()

    // Confirmar vazio: só pula take em ready/guess (não no meio do clip)
    if (!typed) {
      if (phase === 'ready' || phase === 'guess') {
        skipWithoutWatching()
      }
      return
    }

    // Tem texto: valida agora, mesmo sem ter assistido / no meio do countdown
    await submitTypedGuess(typed)
  }

  function pickSuggestion(item: AutocompleteItem) {
    setGuess(item.title)
    setSuggestions([])
    setShowSuggestions(false)
    guessRef.current?.focus()
  }

  const curtainsOpen =
    phase === 'playing' ||
    phase === 'guess' ||
    phase === 'ended' ||
    (phase === 'countdown' && countdown <= 1)

  const firstTryWin = endState?.kind === 'win' && endState.take === 1

  return (
    <div className="min-h-0 flex-1">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 lg:flex-row lg:items-start sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-1 flex-col">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="border border-cinema-line bg-black/40 px-2.5 py-1 text-xs font-semibold tracking-wide text-cinema-gold uppercase transition hover:border-cinema-gold hover:text-white"
            >
              ← Lobby
            </button>
            <div className="text-center">
              <p className="font-display text-3xl leading-none text-white">
                {title}
              </p>
              <p className="text-[11px] font-bold tracking-widest text-cinema-cyan uppercase">
                {mode === 'daily'
                  ? `${dateLabel} · BRT${isArchive ? ' · 0 PTS' : ''}`
                  : 'SESSÃO CORRIDA'}
              </p>
            </div>
            <div className="w-[72px]" />
          </div>

          {mode === 'classic' ? (
            <div className="mb-3 flex items-center justify-between gap-3 border-2 border-cinema-gold/80 bg-black/50 px-3 py-2 lg:hidden">
              <div>
                <p className="text-[10px] font-bold tracking-widest text-cinema-muted uppercase">
                  Pontuação
                </p>
                <p className="score-rail-total text-3xl">+{sessionScore}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-xl text-white">
                  {sessionHits} acerto{sessionHits === 1 ? '' : 's'}
                </p>
                <p className="text-xs font-bold text-cinema-cyan">
                  MULT ×{currentMult.toFixed(2).replace(/\.00$/, '')}
                </p>
              </div>
            </div>
          ) : null}

          <div className="panel-frame relative overflow-hidden p-0">
            {floatPoints != null ? (
              <div key={floatPoints + sessionScore} className="score-float">
                +{floatPoints}
              </div>
            ) : null}

            <div className="flex items-center border-b-2 border-cinema-line bg-black/40 px-3 py-2 font-mono text-xs text-cinema-gold">
              TAKE {Math.min(attempt + 1, 6)}/6
            </div>

            <div className="film-grain relative aspect-video w-full bg-[#050308]">
              {/* Vídeo sempre montado pra pré-buffer; só aparece em playing/guess/ended */}
              {mediaUrl && mediaType === 'video' ? (
                <video
                  ref={videoRef}
                  src={mediaUrl}
                  muted
                  playsInline
                  preload="auto"
                  className={`absolute inset-0 h-full w-full object-contain bg-black transition-opacity ${
                    phase === 'playing' ||
                    phase === 'guess' ||
                    phase === 'ended'
                      ? 'opacity-100'
                      : 'pointer-events-none opacity-0'
                  }`}
                />
              ) : null}
              {mediaUrl &&
              mediaType === 'image' &&
              (phase === 'playing' ||
                phase === 'guess' ||
                phase === 'ended') ? (
                <img
                  src={mediaUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain bg-black"
                />
              ) : null}

              {(phase === 'idle' ||
                phase === 'ready' ||
                phase === 'countdown') && (
                <div className="absolute inset-0 z-[5] flex">
                  <div
                    className="curtain-stripe h-full w-1/2 transition-transform ease-in"
                    style={{
                      transitionDuration: `${CURTAIN_MS}ms`,
                      transform: curtainsOpen
                        ? 'translateX(-100%)'
                        : 'translateX(0)',
                    }}
                  />
                  <div
                    className="curtain-stripe h-full w-1/2 transition-transform ease-in"
                    style={{
                      transitionDuration: `${CURTAIN_MS}ms`,
                      transform: curtainsOpen
                        ? 'translateX(100%)'
                        : 'translateX(0)',
                    }}
                  />
                </div>
              )}

              {phase === 'idle' ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-5 text-center">
                  <p className="font-display text-4xl text-white sm:text-5xl">
                    CORTINAS FECHADAS
                  </p>
                  {loading ? (
                    <p className="text-sm text-cinema-muted">Carregando…</p>
                  ) : loadError ? (
                    <p className="max-w-md text-sm text-cinema-red">
                      {loadError}
                    </p>
                  ) : dailyLocked ? (
                    <p className="max-w-md font-display text-xl leading-tight text-cinema-gold sm:text-2xl">
                      {isArchive
                        ? 'VOCÊ JÁ JOGOU ESTE DIA'
                        : 'VOCÊ JÁ JOGOU O DAILY DE HOJE'}
                    </p>
                  ) : (
                    <p className="max-w-md font-display text-xl leading-tight text-cinema-gold sm:text-2xl">
                      {!user
                        ? 'GUEST · JOGUE SEM CONTA (SEM RANK)'
                        : mode === 'classic'
                          ? 'ACERTOU? SOMA PONTOS E SEGUE'
                          : isArchive
                            ? 'ARQUIVO · JOGA SEM PONTOS NO RANK'
                            : 'UM FILME POR DIA · SEM REPETIR'}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={startRound}
                    disabled={loading || !!loadError || !daily || dailyLocked}
                    className="mode-btn mode-btn-primary mode-btn-inline mt-2 px-10 py-3 font-display text-3xl tracking-widest disabled:opacity-40"
                  >
                    {dailyLocked
                      ? isArchive
                        ? 'JÁ JOGADO'
                        : 'VOLTA AMANHÃ'
                      : 'PLAY'}
                  </button>
                </div>
              ) : null}

              {phase === 'ready' ? (
                <button
                  type="button"
                  onClick={playCurrentTake}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/35 px-5 text-center transition hover:bg-black/20"
                >
                  <p className="font-display text-5xl text-cinema-red sm:text-6xl">
                    ▶
                  </p>
                  <p className="font-display text-2xl text-white sm:text-3xl">
                    CLIQUE PRA ASSISTIR · TAKE {attempt + 1}
                  </p>
                </button>
              ) : null}

              {phase === 'countdown' && countdown > 0 ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <p
                    key={`${attempt}-${countdown}`}
                    className="punch-in font-display text-8xl text-white drop-shadow-[0_0_24px_rgba(255,42,60,0.9)] sm:text-9xl"
                  >
                    {countdown}
                  </p>
                </div>
              ) : null}

              {phase === 'countdown' &&
              countdown <= 0 &&
              mediaType === 'video' &&
              !videoReady ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
                  <p className="font-display text-2xl text-cinema-gold sm:text-3xl">
                    CARREGANDO CLIPE…
                  </p>
                </div>
              ) : null}

              {phase === 'playing' ? (
                <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 bg-gradient-to-t from-black via-black/70 to-transparent px-4 pb-4 pt-10">
                  <div className="h-2 w-2/3 max-w-xs overflow-hidden border border-cinema-gold/40 bg-black/50">
                    <div
                      key={`bar-${attempt}`}
                      className="h-full bg-cinema-red"
                      style={{
                        width: '100%',
                        animation: `shrink-bar ${clipSeconds}s linear forwards`,
                      }}
                    />
                  </div>
                  <p className="font-display text-xl text-white/90 sm:text-2xl">
                    CLIP {clipSeconds}S
                    {showFocusHint ? (
                      <span className="text-cinema-gold"> · SE CONCENTRA</span>
                    ) : null}
                  </p>
                </div>
              ) : null}

              {phase === 'guess' ? (
                <div className="absolute inset-0 z-10 flex items-end bg-gradient-to-t from-black via-black/50 to-transparent p-4">
                  <p className="font-display text-xl text-cinema-gold sm:text-2xl">
                    CHUTE OU CONFIRMAR VAZIO → PRÓXIMO
                  </p>
                </div>
              ) : null}

              {phase === 'ended' && endState ? (
                <div className="absolute inset-0 z-10 flex items-stretch bg-black/90 px-4 py-4 sm:px-8 sm:py-5">
                  {endState.posterUrl ? (
                    <img
                      src={endState.posterUrl}
                      alt=""
                      className="win-soft my-auto h-[70%] max-h-64 w-auto shrink-0 border-2 border-cinema-gold/70 object-cover sm:max-h-72 sm:w-40"
                    />
                  ) : null}
                  <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-3 text-center sm:px-6">
                    {endState.kind === 'win' ? (
                      <>
                        <p
                          className={`font-display leading-none text-cinema-gold ${
                            firstTryWin
                              ? 'win-first text-5xl sm:text-7xl'
                              : 'win-soft text-4xl sm:text-6xl'
                          }`}
                        >
                          {firstTryWin ? 'PERFEITO!' : 'ACERTOU!'}
                        </p>
                        <p
                          className={`mt-1 font-display text-cinema-red ${
                            firstTryWin
                              ? 'win-first text-4xl sm:text-5xl'
                              : 'win-soft text-3xl sm:text-4xl'
                          }`}
                        >
                          +{endState.points} PTS
                          {endState.multiplier && endState.multiplier > 1
                            ? ` (×${endState.multiplier})`
                            : ''}
                        </p>
                        <p className="win-soft mt-2 text-sm font-bold tracking-wide text-cinema-cyan uppercase sm:text-base">
                          {TAKE_LABEL[endState.take] ||
                            `TAKE ${endState.take}`}
                          {endState.take === 1
                            ? ` · STREAK ${firstTryStreak}`
                            : ' · STREAK MANTIDO'}
                        </p>
                        <p className="win-soft mt-2 text-lg font-semibold text-white sm:text-xl">
                          {endState.filmTitle}
                          {endState.year ? ` (${endState.year})` : ''}
                        </p>
                        <p className="mt-1 text-xs text-cinema-muted sm:text-sm">
                          Total: +{sessionScore} · mult ×
                          {multiplierForStreak(firstTryStreak)
                            .toFixed(2)
                            .replace(/\.00$/, '')}
                          {mode === 'daily'
                            ? ' · daily encerrado'
                            : ' · próximo filme'}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="win-soft font-display text-5xl text-cinema-muted sm:text-6xl">
                          FIM
                        </p>
                        <p className="mt-2 text-base text-white sm:text-lg">
                          0 pts · era {endState.filmTitle}
                          {endState.year ? ` (${endState.year})` : ''}
                        </p>
                      </>
                    )}
                    {mode === 'classic' ? (
                      <button
                        type="button"
                        onClick={() => void goNextClassic()}
                        className="mode-btn mode-btn-primary mode-btn-inline mt-4 px-6 py-2.5 font-display text-xl"
                      >
                        PRÓXIMO FILME
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onBack}
                        className="mode-btn mode-btn-inline mt-4 border-cinema-gold px-6 py-2.5 font-display text-xl text-cinema-gold"
                      >
                        VOLTAR AO LOBBY
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex justify-center gap-2">
            {durations.map((sec, index) => {
              const active =
                index === attempt && phase !== 'idle' && phase !== 'ended'
              const canJump =
                inRound &&
                !busy &&
                phase !== 'countdown' &&
                phase !== 'playing' &&
                index > attempt
              return (
                <button
                  key={`${index}-${sec}`}
                  type="button"
                  disabled={!canJump}
                  title={
                    canJump
                      ? `Pular pro take ${index + 1}`
                      : index < attempt
                        ? 'Já passou — sem voltar'
                        : `Take ${index + 1}`
                  }
                  onClick={() => jumpToTake(index)}
                  className={`flex h-10 w-10 flex-col items-center justify-center border-2 text-xs font-bold transition disabled:cursor-default ${
                    active
                      ? 'border-cinema-red bg-cinema-red text-white shadow-[0_0_16px_rgba(255,42,60,0.55)]'
                      : index < attempt
                        ? 'border-cinema-line bg-black/40 text-cinema-muted'
                        : canJump
                          ? 'border-cinema-line/50 text-cinema-muted/40 hover:border-cinema-gold hover:text-cinema-gold'
                          : 'border-cinema-line/50 text-cinema-muted/40'
                  }`}
                >
                  <span>{index + 1}</span>
                  <span className="text-[9px] opacity-70">{sec}s</span>
                </button>
              )
            })}
          </div>

          {inRound ? (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => setConfirmQuit(true)}
                disabled={busy}
                className="border border-cinema-red/70 bg-black/50 px-3 py-1.5 text-xs font-bold tracking-wide text-cinema-red uppercase hover:bg-cinema-red hover:text-white disabled:opacity-40"
              >
                Desistir
              </button>
            </div>
          ) : null}

          {confirmQuit ? (
            <div className="mt-3 border-2 border-cinema-red bg-black/70 px-4 py-3 text-center">
              <p className="font-display text-xl text-white">
                Tem certeza que quer desistir?
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmQuit(false)}
                  className="border border-cinema-line px-3 py-1.5 text-xs font-bold uppercase text-cinema-muted hover:text-white"
                >
                  Continuar
                </button>
                <button
                  type="button"
                  onClick={() => void finishGiveUp()}
                  className="border border-cinema-red bg-cinema-red px-3 py-1.5 text-xs font-bold uppercase text-white"
                >
                  Sim, desistir
                </button>
              </div>
            </div>
          ) : null}

          {mode === 'daily' && guessHistory.length > 0 ? (
            <ul className="mt-3 flex flex-wrap justify-center gap-2">
              {guessHistory.map((g) => (
                <li
                  key={g.label}
                  className="relative flex min-w-[5.5rem] flex-col items-center border border-cinema-line bg-[#2a1520] px-3 py-2"
                >
                  <span
                    className="absolute top-1 right-1.5 text-right text-[10px] leading-tight text-white/90"
                    title="Pessoas que também chutaram isso hoje"
                  >
                    <span className="block text-[8px] tracking-wide text-cinema-muted uppercase">
                      tb
                    </span>
                    <span className="font-bold text-cinema-gold">{g.count}</span>
                  </span>
                  <span className="max-w-[8rem] truncate px-3 pt-4 text-center text-xs font-bold text-white">
                    {g.label}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <form
            onSubmit={submitGuess}
            className="relative mt-4 flex w-full flex-col gap-2 sm:flex-row sm:items-stretch"
          >
            <div className="relative min-w-0 flex-1">
              <input
                ref={guessRef}
                value={guess}
                onChange={(e) => {
                  const value = e.target.value
                  setGuess(value)
                  if (canTypeGuess) queueAutocomplete(value)
                  else {
                    setSuggestions([])
                    setShowSuggestions(false)
                  }
                }}
                onFocus={() => {
                  if (canTypeGuess && suggestions.length > 0) {
                    setShowSuggestions(true)
                  }
                }}
                onBlur={() => {
                  window.setTimeout(() => setShowSuggestions(false), 150)
                }}
                disabled={!canTypeGuess}
                autoComplete="off"
                placeholder="Digite o filme a qualquer momento…"
                className="guess-input w-full"
              />
              {showSuggestions && canTypeGuess ? (
                <ul className="absolute right-0 bottom-full left-0 z-30 mb-1 max-h-56 overflow-auto border-2 border-cinema-gold bg-[#0a060c] shadow-xl">
                  {suggestions.map((item) => (
                    <li key={`${item.title}-${item.year}`}>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-white hover:bg-cinema-red/80"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickSuggestion(item)}
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
              disabled={!canTypeGuess}
              className="mode-btn mode-btn-primary mode-btn-inline px-5 py-3 font-display text-xl tracking-wide disabled:opacity-40 sm:text-2xl"
            >
              CONFIRMAR
            </button>
          </form>

          {mode === 'daily' && daily ? (
            <p className="mt-2 text-center text-sm font-semibold text-white drop-shadow">
              <span className="text-cinema-gold">
                {daily.solvedCount ?? 0}
              </span>{' '}
              {(daily.solvedCount ?? 0) === 1
                ? 'pessoa já descobriu!'
                : 'pessoas já descobriram!'}
            </p>
          ) : null}

          {scoreHint ? (
            <p className="mt-3 border-2 border-cinema-line bg-black/40 px-3 py-2 font-mono text-xs text-cinema-muted">
              {scoreHint}
            </p>
          ) : null}
        </div>

        {mode === 'classic' ? (
          <aside className="score-rail sticky top-6 hidden w-44 shrink-0 lg:block">
            <p className="text-[10px] font-bold tracking-[0.2em] text-cinema-muted uppercase">
              Infinito
            </p>
            <p className="score-rail-total mt-1">+{sessionScore}</p>
            <p className="mt-2 font-display text-2xl text-white">
              {sessionHits} HIT{sessionHits === 1 ? '' : 'S'}
            </p>
            <p className="mt-2 font-display text-xl text-cinema-cyan">
              ×{currentMult.toFixed(2).replace(/\.00$/, '')}
            </p>
            <p className="mt-1 text-[10px] text-cinema-muted">
              streak 1ª: {firstTryStreak}
            </p>
            <p className="mt-3 text-[11px] leading-snug text-cinema-muted">
              1ª sobe o mult. 2ª–6ª mantém. Errou = zera.
            </p>
          </aside>
        ) : null}
      </div>

      <style>{`
        @keyframes shrink-bar {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}
