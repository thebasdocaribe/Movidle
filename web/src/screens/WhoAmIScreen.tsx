import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
} from 'react'
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
import { DailyCalendarButton } from '../components/DailyCalendarButton'
import { todayBRT } from '../components/DayCalendarModal'
import {
  WhoamiStudioBoard,
  applyStudioBoardAnswer,
  initialStudioBoard,
  type StudioBoardState,
} from '../components/WhoamiStudioBoard'

type WhoAmIScreenProps = {
  variant: 'daily' | 'endless'
  user: AuthUser | null
  progress: ProgressMap
  onProgress: (p: ProgressMap) => void
  onAchievements?: (list: Achievement[]) => void
  puzzleDate?: string | null
  onBack: () => void
  onPlayEndless?: () => void
  onPickArchiveDate?: (date: string) => void
  modeNav?: {
    active: DailyNavMode
    played: DailyPlayedMap
    onSelect: (mode: DailyNavMode) => void
  } | null
  onDailyModePlayed?: () => void
}

const ANSWER_CLASS: Record<WhoamiAnswer, string> = {
  yes: 'whoami-pill whoami-pill-yes',
  no: 'whoami-pill whoami-pill-no',
  partial: 'whoami-pill whoami-pill-partial',
  unknown: 'whoami-pill whoami-pill-unknown',
}

const CATEGORY_META: Record<
  string,
  { title: string; blurb: string; Icon: () => ReactElement }
> = {
  identity: {
    title: 'Identidade',
    blurb: 'Animação, estúdio, adaptação…',
    Icon: IconReel,
  },
  era: {
    title: 'Época',
    blurb: 'Década, origem, contexto…',
    Icon: IconCalendar,
  },
  genre: {
    title: 'Gênero',
    blurb: 'Comédia, terror, aventura…',
    Icon: IconStar,
  },
  characters: {
    title: 'Personagens',
    blurb: 'Protagonista, vilão…',
    Icon: IconPeople,
  },
  story: {
    title: 'História',
    blurb: 'Enredo, cenário…',
    Icon: IconClapper,
  },
  production: {
    title: 'Curiosidades',
    blurb: 'Oscar, trilha…',
    Icon: IconBulb,
  },
}

function formatElapsed(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function categoryMeta(id: string, fallbackLabel: string) {
  return (
    CATEGORY_META[id] || {
      title: fallbackLabel,
      blurb: 'Perguntas desta categoria',
      Icon: IconSearch,
    }
  )
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
  onPickArchiveDate,
  modeNav = null,
  onDailyModePlayed,
}: WhoAmIScreenProps) {
  const endless = variant === 'endless'
  const todayKey = todayBRT()
  const activeDate = endless ? null : puzzleDate || todayKey
  const isArchive = Boolean(activeDate && activeDate < todayKey)
  const [puzzle, setPuzzle] = useState<WhoamiPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
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
  const [studioBoard, setStudioBoard] = useState<StudioBoardState>(() =>
    initialStudioBoard(),
  )
  const suggestTimer = useRef<number | null>(null)
  const startedAt = useRef<number>(Date.now())

  const prog = modeProgress(progress, 'whoami')
  const maxAsks = puzzle?.maxAsks ?? 20
  const maxWrong = puzzle?.maxWrong ?? 5
  const asksLeft = Math.max(0, maxAsks - asksUsed)
  const wrongLeft = Math.max(0, maxWrong - wrong)
  const asksExhausted = asksUsed >= maxAsks
  const askedIds = useMemo(
    () => new Set(history.map((h) => h.questionId)),
    [history],
  )

  const categories = puzzle?.askBank.categories ?? []
  const activeCategory = categories.find((c) => c.id === categoryId) || null
  const questions = useMemo(() => {
    if (!puzzle || !categoryId) return []
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
      setStudioBoard(initialStudioBoard())
      startedAt.current = Date.now()
      setCategoryId(null)
      if (endless && data.puzzleId) {
        setPlayedIds((prev) =>
          prev.includes(data.puzzleId) ? prev : [...prev, data.puzzleId],
        )
      }
      // Arquivo: pode rejogar mesmo com play antigo (só trava no dia corrente)
      if (!endless && data.priorResult && !isArchive) {
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
    if (asksExhausted) {
      setHint(`Orçamento esgotado · máx. ${maxAsks} perguntas · chute o filme`)
      return
    }
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
        asksUsed,
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
      setStudioBoard((prev) =>
        applyStudioBoardAnswer(prev, res.questionId, res.answer),
      )
      const nextAsks = res.asksUsed ?? asksUsed + 1
      setAsksUsed(nextAsks)
      if (nextAsks >= maxAsks) {
        setHint(`Última pergunta usada · agora é chutar (${maxWrong} tentativas)`)
        setCategoryId(null)
      }
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

      const nextWrong = res.wrongGuesses ?? wrong + 1
      setWrong(nextWrong)
      setGuess('')

      if (res.ended) {
        setWon(false)
        setEnded(true)
        if (!endless) onDailyModePlayed?.()
        setPoints(0)
        setRevealTitle(res.titlePt || res.title || '?')
        setRevealYear(res.year)
        setRevealPoster(res.posterUrl || null)
        if (user) {
          const finished = await finishWhoami({
            puzzleId: puzzle.puzzleId,
            outcome: 'lose',
            asksUsed,
            wrongGuesses: nextWrong,
            durationSec: durationSec(),
            endless,
          })
          onProgress(finished.progress)
          if (finished.unlockedAchievements?.length) {
            onAchievements?.(finished.unlockedAchievements)
          }
        }
        return
      }

      const left = Math.max(0, maxWrong - nextWrong)
      setHint(
        `Errou: “${typed}” · ${left} chute${left === 1 ? '' : 's'} restante${left === 1 ? '' : 's'}`,
      )
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

  const selectedMeta = activeCategory
    ? categoryMeta(activeCategory.id, activeCategory.label)
    : null

  return (
    <div className="min-h-0 flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-3 py-4 sm:px-4 lg:gap-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="border border-cinema-line px-2 py-1 text-xs text-cinema-gold"
          >
            ← Lobby
          </button>
          <p className="text-[10px] text-cinema-muted">+{prog.totalScore}</p>
        </div>

        {modeNav ? (
          <DailyModeNav
            active={modeNav.active}
            played={modeNav.played}
            onSelect={modeNav.onSelect}
          />
        ) : null}

        <header className="whoami-hero">
          <div className="whoami-parchment" aria-hidden>
            <span className="whoami-parchment-mark">?</span>
          </div>
          <h1 className="whoami-title">QUEM SOU EU?</h1>
          <p className="whoami-subtitle">
            Descubra o filme misterioso fazendo perguntas!
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-cinema-muted">
            <span>
              {endless
                ? 'Ilimitado'
                : isArchive
                  ? `Arquivo ${activeDate}`
                  : 'Diário'}{' '}
              · {formatElapsed(elapsed)} · perguntas {asksUsed}/{maxAsks} ·
              chutes {wrong}/{maxWrong}
            </span>
            {!endless && onPickArchiveDate && activeDate ? (
              <DailyCalendarButton
                title="Quem sou eu"
                activeDate={activeDate}
                onPickDate={onPickArchiveDate}
              />
            ) : null}
          </div>
        </header>

        {loading ? (
          <p className="text-center text-cinema-muted">Carregando…</p>
        ) : loadError ? (
          <p className="text-center text-cinema-red">{loadError}</p>
        ) : puzzle ? (
          <>
            {ended ? (
              <div className="panel-frame mx-auto flex w-full max-w-lg flex-col items-center gap-3 p-4 text-center">
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
                <WhoamiStudioBoard state={studioBoard} />

                <div className="grid gap-3 lg:grid-cols-2 lg:gap-4 lg:items-start">
                  <section className="whoami-panel">
                    <div className="mb-3 flex items-start gap-2">
                      <span className="mt-0.5 text-cinema-gold">
                        <IconSearch />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-display text-2xl leading-none text-cinema-gold tracking-wide">
                          FAÇA UMA PERGUNTA
                        </h2>
                        <p className="mt-1 text-[11px] text-cinema-muted">
                          {asksExhausted
                            ? 'Sem perguntas restantes — use os chutes.'
                            : categoryId
                              ? 'Escolha uma pergunta desta categoria.'
                              : `Escolha uma categoria · ${asksLeft} pergunta${asksLeft === 1 ? '' : 's'} restante${asksLeft === 1 ? '' : 's'}.`}
                        </p>
                      </div>
                    </div>

                    {asksExhausted ? (
                      <p className="rounded-md border border-dashed border-cinema-line/70 bg-black/20 px-3 py-6 text-center text-[12px] text-cinema-muted">
                        Investigação encerrada. Chute o filme à direita.
                      </p>
                    ) : categoryId && selectedMeta ? (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setCategoryId(null)}
                          className="self-start border border-cinema-line px-2 py-1 text-[10px] font-bold tracking-wide text-cinema-gold uppercase hover:border-cinema-gold"
                        >
                          ← Categorias
                        </button>
                        <div className="mb-1 flex items-center gap-2 border-b border-cinema-line/60 pb-2">
                          <span className="text-cinema-gold">
                            <selectedMeta.Icon />
                          </span>
                          <p className="font-display text-xl text-white">
                            {selectedMeta.title.toUpperCase()}
                          </p>
                        </div>
                        <ul className="flex max-h-[28rem] flex-col gap-1.5 overflow-y-auto pr-1">
                          {questions.map((q) => {
                            const used = askedIds.has(q.id)
                            return (
                              <li key={q.id}>
                                <button
                                  type="button"
                                  disabled={busy || used}
                                  onClick={() => void askQuestion(q.id)}
                                  className={`whoami-ask-btn ${
                                    used ? 'whoami-ask-btn-used' : ''
                                  }`}
                                >
                                  <span>{q.text}</span>
                                  {used ? (
                                    <span className="shrink-0 text-[9px] uppercase tracking-wide opacity-70">
                                      feita
                                    </span>
                                  ) : (
                                    <span className="whoami-chevron" aria-hidden>
                                      ›
                                    </span>
                                  )}
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {categories.map((c) => {
                          const meta = categoryMeta(c.id, c.label)
                          const remaining = puzzle.askBank.questions.filter(
                            (q) =>
                              q.category === c.id && !askedIds.has(q.id),
                          ).length
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setCategoryId(c.id)}
                              className="whoami-cat-card"
                            >
                              <span className="whoami-cat-icon">
                                <meta.Icon />
                              </span>
                              <span className="min-w-0 flex-1 text-left">
                                <span className="block font-display text-lg leading-none text-cinema-gold">
                                  {meta.title.toUpperCase()}
                                </span>
                                <span className="mt-0.5 block text-[10px] leading-snug text-cinema-muted">
                                  {meta.blurb}
                                </span>
                                <span className="mt-1 block text-[9px] font-bold tracking-wide text-white/50 uppercase">
                                  {remaining}{' '}
                                  {remaining === 1
                                    ? 'disponível'
                                    : 'disponíveis'}
                                </span>
                              </span>
                              <span className="whoami-chevron" aria-hidden>
                                ›
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </section>

                  <div className="flex flex-col gap-3">
                    <section className="whoami-panel">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <h2 className="font-display text-xl leading-none text-cinema-gold tracking-wide sm:text-2xl">
                          HISTÓRICO DA INVESTIGAÇÃO
                        </h2>
                        <span className="shrink-0 text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
                          {asksUsed}/{maxAsks} pergunta
                          {maxAsks === 1 ? '' : 's'}
                        </span>
                      </div>
                      {asksExhausted ? (
                        <p className="mb-2 rounded-md border border-cinema-gold/40 bg-cinema-gold/10 px-3 py-2 text-center text-[11px] text-cinema-gold">
                          Orçamento de perguntas esgotado — chute o filme (
                          {wrongLeft} restante
                          {wrongLeft === 1 ? '' : 's'}).
                        </p>
                      ) : null}
                      {history.length === 0 ? (
                        <p className="rounded-md border border-dashed border-cinema-line/70 bg-black/20 px-3 py-6 text-center text-[12px] text-cinema-muted italic">
                          Nenhuma pergunta ainda — comece por uma categoria.
                        </p>
                      ) : (
                        <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1 sm:max-h-80">
                          {history.map((h) => (
                            <li key={h.key} className="whoami-history-row">
                              <span className="min-w-0 flex-1 text-[13px] text-white/90">
                                {h.text}
                              </span>
                              <span
                                className={`${ANSWER_CLASS[h.answer]} shrink-0`}
                              >
                                {h.answerLabel}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    <section className="whoami-panel">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <h2 className="font-display text-xl leading-none text-cinema-gold tracking-wide sm:text-2xl">
                          SEU PALPITE
                        </h2>
                        <span className="shrink-0 text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
                          {wrong}/{maxWrong} erro{maxWrong === 1 ? '' : 's'}
                        </span>
                      </div>
                      <p className="mt-1 mb-3 text-[11px] text-cinema-muted">
                        Acha que já descobriu? Digite o nome do filme ·{' '}
                        {wrongLeft} chute{wrongLeft === 1 ? '' : 's'} restante
                        {wrongLeft === 1 ? '' : 's'}.
                      </p>
                      <form
                        onSubmit={submitGuess}
                        className="relative flex flex-col gap-2 sm:flex-row sm:items-stretch"
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
                              window.setTimeout(
                                () => setShowSuggestions(false),
                                150,
                              )
                            }}
                            disabled={busy}
                            placeholder="Ex: Shrek…"
                            className="guess-input whoami-guess-input w-full"
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
                          className="whoami-chute-btn disabled:opacity-40"
                        >
                          CHUTAR
                          <span aria-hidden>▸</span>
                        </button>
                      </form>
                    </section>
                  </div>
                </div>

                {hint ? (
                  <p className="text-center text-xs text-cinema-muted">{hint}</p>
                ) : null}

                {confirmGiveUp ? (
                  <div className="whoami-panel flex flex-col gap-2 p-3 text-center sm:flex-row sm:items-center sm:justify-between">
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
                  <div className="flex flex-wrap items-center gap-3 border-t border-cinema-line/50 pt-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmGiveUp(true)}
                      className="whoami-giveup-btn"
                    >
                      <IconExit />
                      DESISTIR
                    </button>
                    <p className="text-[11px] text-cinema-muted">
                      Revele o filme e encerre a partida.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M16 16l4.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconReel() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <circle cx="12" cy="6.5" r="1.3" fill="currentColor" />
      <circle cx="12" cy="17.5" r="1.3" fill="currentColor" />
      <circle cx="6.5" cy="12" r="1.3" fill="currentColor" />
      <circle cx="17.5" cy="12" r="1.3" fill="currentColor" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="5"
        width="17"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M3.5 9.5h17" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8 3.5v4M16 3.5v4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconStar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.8 7.2 18.4l.9-5.4L4.2 9.2l5.4-.8L12 3.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconPeople() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="16" cy="9" r="2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M4.5 18.5c.6-3 2.6-4.5 4.5-4.5s3.9 1.5 4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M13.2 14.2c1.1-.5 2.4-.5 3.6.2 1.5.9 2.4 2.5 2.7 4.1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconClapper() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 9.5h16v9.5H4V9.5z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M4.5 9.2l3.2-5.2 3.2 2-3.2 5.2M10.2 7.2l3.2-2 3.2 5.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconBulb() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 17.5h6M10 20h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M8.5 14.5c-1.6-1.2-2.5-3-2.5-4.8A6 6 0 0 1 12 3.8a6 6 0 0 1 6 5.9c0 1.8-.9 3.6-2.5 4.8L14.8 16h-5.6l-.7-1.5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconExit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M13 12h7M17 8.5L20.5 12 17 15.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
