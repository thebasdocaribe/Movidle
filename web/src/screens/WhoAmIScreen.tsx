import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  fetchAutocomplete,
  fetchWhoamiDaily,
  fetchWhoamiNext,
  finishWhoami,
  giveUpWhoami,
  postWhoamiAsk,
  postWhoamiGuess,
  type Achievement,
  type AutocompleteItem,
  type WhoamiAnswer,
  type WhoamiHistoryItem,
  type WhoamiPayload,
} from '../api'
import {
  DailyModeNav,
  type DailyNavMode,
  type DailyPlayedMap,
} from '../components/DailyModeNav'
import type { AuthUser, ProgressMap } from '../auth'
import { modeProgress } from '../auth'

type WhoAmIScreenProps = {
  variant: 'daily' | 'endless'
  user: AuthUser | null
  progress: ProgressMap
  onProgress: (p: ProgressMap) => void
  onAchievements?: (list: Achievement[]) => void
  puzzleDate?: string | null
  onBack: () => void
  onPlayEndless?: () => void
  modeNav?: {
    active: DailyNavMode
    played: DailyPlayedMap
    onSelect: (mode: DailyNavMode) => void
  } | null
  onDailyModePlayed?: () => void
}

const ANSWER_CLASS: Record<WhoamiAnswer, string> = {
  yes: 'whoami-chip whoami-chip-green',
  no: 'whoami-chip whoami-chip-red',
  partial: 'whoami-chip whoami-chip-yellow',
  unknown: 'whoami-chip whoami-chip-unknown',
}

function formatElapsed(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function WhoAmIScreen({
  variant,
  user,
  progress,
  onProgress,
  onAchievements,
  puzzleDate = null,
  onBack,
  onPlayEndless,
  modeNav = null,
  onDailyModePlayed,
}: WhoAmIScreenProps) {
  const endless = variant === 'endless'
  const [puzzle, setPuzzle] = useState<WhoamiPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<string>('identity')
  const [history, setHistory] = useState<WhoamiHistoryItem[]>([])
  const [asksUsed, setAsksUsed] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [guess, setGuess] = useState('')
  const [busy, setBusy] = useState(false)
  const [ended, setEnded] = useState(false)
  const [won, setWon] = useState(false)
  const [points, setPoints] = useState(0)
  const [revealTitle, setRevealTitle] = useState<string | null>(null)
  const [revealYear, setRevealYear] = useState<number | undefined>()
  const [revealPoster, setRevealPoster] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [confirmGiveUp, setConfirmGiveUp] = useState(false)
  const [playedIds, setPlayedIds] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const suggestTimer = useRef<number | null>(null)
  const startedAt = useRef<number>(Date.now())

  const prog = modeProgress(progress, 'whoami')
  const askedIds = useMemo(
    () => new Set(history.map((h) => h.questionId)),
    [history],
  )

  const categories = puzzle?.askBank.categories ?? []
  const questions = useMemo(() => {
    if (!puzzle) return []
    return puzzle.askBank.questions.filter((q) => q.category === categoryId)
  }, [puzzle, categoryId])

  function durationSec() {
    return Math.max(0, Math.floor((Date.now() - startedAt.current) / 1000))
  }

  async function load(exclude: string[] = []) {
    setLoading(true)
    setLoadError(null)
    try {
      const data = endless
        ? await fetchWhoamiNext(exclude)
        : await fetchWhoamiDaily(puzzleDate || undefined)
      setPuzzle(data)
      setHistory([])
      setAsksUsed(0)
      setWrong(0)
      setGuess('')
      setEnded(false)
      setWon(false)
      setPoints(0)
      setRevealTitle(null)
      setRevealYear(undefined)
      setRevealPoster(null)
      setHint(null)
      setConfirmGiveUp(false)
      setElapsed(0)
      startedAt.current = Date.now()
      const firstCat = data.askBank?.categories?.[0]?.id || 'identity'
      setCategoryId(firstCat)
      if (endless && data.puzzleId) {
        setPlayedIds((prev) =>
          prev.includes(data.puzzleId) ? prev : [...prev, data.puzzleId],
        )
      }
      if (!endless && data.priorResult) {
        setEnded(true)
        onDailyModePlayed?.()
        setWon(Boolean(data.priorResult.won))
        setPoints(data.priorResult.points ?? 0)
        setRevealTitle(data.priorResult.titlePt || data.priorResult.title || '?')
        setRevealYear(data.priorResult.year)
        setRevealPoster(data.priorResult.posterUrl || null)
        setAsksUsed(data.priorResult.asks ?? 0)
      }
    } catch (err) {
      setLoadError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPlayedIds([])
    void load([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, puzzleDate])

  useEffect(() => {
    if (ended || loading) return
    const id = window.setInterval(() => {
      setElapsed(durationSec())
    }, 1000)
    return () => window.clearInterval(id)
  }, [ended, loading, puzzle?.puzzleId])

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

  async function askQuestion(questionId: string) {
    if (!puzzle || busy || ended) return
    if (askedIds.has(questionId)) {
      setHint('Você já perguntou isso')
      return
    }
    setBusy(true)
    setHint(null)
    try {
      const res = await postWhoamiAsk({
        puzzleId: puzzle.puzzleId,
        questionId,
      })
      setHistory((prev) => [
        ...prev,
        {
          questionId: res.questionId,
          text: res.text,
          answer: res.answer,
          answerLabel: res.answerLabel,
          key: `${res.questionId}-${Date.now()}`,
        },
      ])
      setAsksUsed((n) => n + 1)
    } catch (err) {
      setHint((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function submitGuess(e: FormEvent) {
    e.preventDefault()
    if (!puzzle || busy || ended) return
    const typed = guess.trim()
    if (!typed) return
    setBusy(true)
    setShowSuggestions(false)
    try {
      const res = await postWhoamiGuess({
        puzzleId: puzzle.puzzleId,
        guess: typed,
        asksUsed,
        wrongGuesses: wrong,
        durationSec: durationSec(),
      })
      if (res.correct) {
        setWon(true)
        setEnded(true)
        if (!endless) onDailyModePlayed?.()
        setPoints(res.points)
        setRevealTitle(res.titlePt || res.title || typed)
        setRevealYear(res.year)
        setRevealPoster(res.posterUrl || null)
        if (user) {
          const finished = await finishWhoami({
            puzzleId: puzzle.puzzleId,
            outcome: 'win',
            asksUsed,
            wrongGuesses: wrong,
            durationSec: durationSec(),
            endless,
          })
          onProgress(finished.progress)
          if (finished.unlockedAchievements?.length) {
            onAchievements?.(finished.unlockedAchievements)
          }
          setPoints(finished.points)
        }
        return
      }

      const nextWrong = wrong + 1
      setWrong(nextWrong)
      setGuess('')
      setHint(`Errou: “${typed}” · continue investigando`)
    } catch (err) {
      setHint((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmGiveUpAction() {
    if (!puzzle || busy || ended) return
    setBusy(true)
    setConfirmGiveUp(false)
    try {
      const res = await giveUpWhoami({
        puzzleId: puzzle.puzzleId,
        asksUsed,
        wrongGuesses: wrong,
        durationSec: durationSec(),
        endless,
      })
      setWon(false)
      setEnded(true)
      if (!endless) onDailyModePlayed?.()
      setPoints(0)
      setRevealTitle(res.titlePt || res.title || '?')
      setRevealYear(res.year)
      setRevealPoster(res.posterUrl || null)
      if (res.progress) onProgress(res.progress)
      if (res.unlockedAchievements?.length) {
        onAchievements?.(res.unlockedAchievements)
      }
    } catch (err) {
      setHint((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-0 flex-1">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-3 py-4 sm:px-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="border border-cinema-line px-2 py-1 text-xs text-cinema-gold"
          >
            ← Lobby
          </button>
          <h1 className="font-display text-2xl text-white sm:text-3xl">
            QUEM SOU EU
          </h1>
          <p className="text-[10px] text-cinema-muted">+{prog.totalScore}</p>
        </div>

        {modeNav ? (
          <DailyModeNav
            active={modeNav.active}
            played={modeNav.played}
            onSelect={modeNav.onSelect}
          />
        ) : null}

        <p className="text-center text-xs text-cinema-muted">
          {endless ? 'Ilimitado' : 'Diário'} ·{' '}
          <span className="text-cinema-gold">investigação</span>
        </p>

        <div className="panel-frame grid grid-cols-3 gap-2 px-3 py-2 text-center">
          <div>
            <p className="text-[9px] font-bold tracking-wide text-cinema-muted uppercase">
              Perguntas
            </p>
            <p className="font-mono text-sm text-cinema-gold tabular-nums">
              {asksUsed}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold tracking-wide text-cinema-muted uppercase">
              Chutes
            </p>
            <p className="font-mono text-sm text-cinema-gold tabular-nums">
              {wrong}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold tracking-wide text-cinema-muted uppercase">
              Tempo
            </p>
            <p className="font-mono text-sm text-cinema-gold tabular-nums">
              {formatElapsed(elapsed)}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-cinema-muted">Carregando…</p>
        ) : loadError ? (
          <p className="text-center text-cinema-red">{loadError}</p>
        ) : puzzle ? (
          <>
            {ended ? (
              <div className="panel-frame flex flex-col items-center gap-3 p-4 text-center">
                {revealPoster ? (
                  <img
                    src={revealPoster}
                    alt=""
                    className="h-40 w-auto border-2 border-cinema-gold/70 object-cover"
                  />
                ) : null}
                <p className="font-display text-4xl text-cinema-gold">
                  {won ? 'ACERTOU!' : 'DESISTIU'}
                </p>
                {won ? (
                  <p className="font-display text-2xl text-cinema-red">
                    +{points} PTS
                  </p>
                ) : null}
                <p className="text-lg text-white">
                  {revealTitle}
                  {revealYear ? ` (${revealYear})` : ''}
                </p>
                <p className="text-[11px] text-cinema-muted">
                  {asksUsed} pergunta(s) · {wrong} chute(s) ·{' '}
                  {formatElapsed(elapsed)}
                </p>
                {endless ? (
                  <button
                    type="button"
                    className="mode-btn mode-btn-primary mode-btn-inline px-5 py-2 font-display text-xl"
                    onClick={() => void load([...playedIds])}
                  >
                    PRÓXIMO FILME
                  </button>
                ) : (
                  <div className="flex flex-wrap justify-center gap-2">
                    {onPlayEndless ? (
                      <button
                        type="button"
                        className="mode-btn mode-btn-primary mode-btn-inline px-4 py-2 font-display text-lg"
                        onClick={onPlayEndless}
                      >
                        ILIMITADO
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="mode-btn mode-btn-inline border-cinema-gold px-4 py-2 font-display text-lg text-cinema-gold"
                      onClick={onBack}
                    >
                      LOBBY
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <p className="text-center text-sm text-white">
                  Sou um filme misterioso. Faça perguntas, monte hipóteses e
                  chute quando quiser.{' '}
                  <span className="text-emerald-400">SIM</span> ·{' '}
                  <span className="text-cinema-red">NÃO</span> ·{' '}
                  <span className="text-amber-300">PARCIAL</span> ·{' '}
                  <span className="text-cinema-muted">NÃO SEI</span>
                </p>

                <section className="panel-frame px-3 py-2">
                  <p className="mb-1.5 text-[10px] font-bold tracking-[0.16em] text-cinema-muted uppercase">
                    Perguntas realizadas
                  </p>
                  {history.length === 0 ? (
                    <p className="text-[11px] text-cinema-muted italic">
                      Nenhuma ainda — escolha uma categoria abaixo
                    </p>
                  ) : (
                    <ul className="flex max-h-36 flex-col gap-1 overflow-y-auto">
                      {history.map((h) => (
                        <li
                          key={h.key}
                          className="flex items-start justify-between gap-2 text-[12px]"
                        >
                          <span className="text-white/90">{h.text}</span>
                          <span className={`${ANSWER_CLASS[h.answer]} shrink-0`}>
                            {h.answerLabel}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <div className="flex flex-wrap justify-center gap-1">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(c.id)}
                      className={`border px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase ${
                        categoryId === c.id
                          ? 'border-cinema-gold bg-cinema-gold/15 text-cinema-gold'
                          : 'border-cinema-line text-cinema-muted'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <div className="max-h-52 overflow-y-auto border border-cinema-line/60 bg-black/30 p-2">
                  <ul className="flex flex-col gap-1">
                    {questions.map((q) => {
                      const used = askedIds.has(q.id)
                      return (
                        <li key={q.id}>
                          <button
                            type="button"
                            disabled={busy || used}
                            onClick={() => void askQuestion(q.id)}
                            className={`w-full border px-2.5 py-2 text-left text-[12px] ${
                              used
                                ? 'border-cinema-line/40 text-cinema-muted/55'
                                : 'border-cinema-line text-white hover:border-cinema-gold hover:text-cinema-gold'
                            } disabled:opacity-40`}
                          >
                            {q.text}
                            {used ? ' · feita' : ''}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                <form
                  onSubmit={submitGuess}
                  className="relative flex flex-col gap-2 sm:flex-row"
                >
                  <div className="relative min-w-0 flex-1">
                    <input
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
                      placeholder="Chutar o filme…"
                      className="guess-input w-full"
                      autoComplete="off"
                    />
                    {showSuggestions && suggestions.length > 0 ? (
                      <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-40 overflow-auto border border-cinema-line bg-[#120a12]">
                        {suggestions.map((s) => (
                          <li key={`${s.title}-${s.year}`}>
                            <button
                              type="button"
                              className="block w-full px-3 py-1.5 text-left text-sm text-white hover:bg-cinema-gold/20"
                              onMouseDown={(ev) => {
                                ev.preventDefault()
                                setGuess(s.titlePt || s.title)
                                setShowSuggestions(false)
                              }}
                            >
                              {s.titlePt || s.title}
                              {s.year ? ` (${s.year})` : ''}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <button
                    type="submit"
                    disabled={busy || !guess.trim()}
                    className="mode-btn mode-btn-primary mode-btn-inline px-5 py-3 font-display text-xl disabled:opacity-40"
                  >
                    CHUTAR
                  </button>
                </form>

                {confirmGiveUp ? (
                  <div className="panel-frame flex flex-col gap-2 p-3 text-center">
                    <p className="text-sm text-white">
                      Desistir e revelar o filme?
                    </p>
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmGiveUp(false)}
                        className="border border-cinema-line px-3 py-1.5 text-xs text-cinema-muted"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void confirmGiveUpAction()}
                        className="border border-cinema-red px-3 py-1.5 text-xs font-bold text-cinema-red uppercase"
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmGiveUp(true)}
                    className="border border-cinema-line/80 px-3 py-2 text-[11px] font-bold tracking-wide text-cinema-muted uppercase hover:border-cinema-red hover:text-cinema-red"
                  >
                    Desistir
                  </button>
                )}
              </>
            )}

            {hint ? (
              <p className="text-center text-xs text-cinema-muted">{hint}</p>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
