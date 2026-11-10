import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react'
import {
  fetchAutocomplete,
  fetchKeywordsDaily,
  finishKeywords,
  postKeywordsGuess,
  type Achievement,
  type AutocompleteItem,
  type KeywordsPayload,
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
import { PixelatedPoster } from '../components/PixelatedPoster'

type KeywordsScreenProps = {
  user: AuthUser | null
  progress: ProgressMap
  onProgress: (p: ProgressMap) => void
  onAchievements?: (list: Achievement[]) => void
  puzzleDate?: string | null
  onBack: () => void
  onPickArchiveDate?: (date: string) => void
  modeNav?: {
    active: DailyNavMode
    played: DailyPlayedMap
    onSelect: (mode: DailyNavMode) => void
  } | null
  onDailyModePlayed?: () => void
}

export function KeywordsScreen({
  user,
  progress,
  onProgress,
  onAchievements,
  puzzleDate = null,
  onBack,
  onPickArchiveDate,
  modeNav = null,
  onDailyModePlayed,
}: KeywordsScreenProps) {
  const todayKey = todayBRT()
  const activeDate = puzzleDate || todayKey
  const isArchive = activeDate < todayKey
  const [puzzle, setPuzzle] = useState<KeywordsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [words, setWords] = useState<string[]>([])
  const [wrong, setWrong] = useState(0)
  const [guess, setGuess] = useState('')
  const [busy, setBusy] = useState(false)
  const [ended, setEnded] = useState(false)
  const [won, setWon] = useState(false)
  const [points, setPoints] = useState(0)
  const [revealTitle, setRevealTitle] = useState<string | null>(null)
  const [revealYear, setRevealYear] = useState<number | undefined>()
  const [revealPoster, setRevealPoster] = useState<string | null>(null)
  const [pixelPoster, setPixelPoster] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestTimer = useRef<number | null>(null)
  const finishedRef = useRef(false)

  const prog = modeProgress(progress, 'keywords')
  const maxWrong = puzzle?.maxWrong ?? 6

  async function load() {
    setLoading(true)
    setLoadError(null)
    finishedRef.current = false
    try {
      const data = await fetchKeywordsDaily(puzzleDate || undefined)
      setPuzzle(data)
      setWords(data.words || [])
      setWrong(0)
      setGuess('')
      setEnded(false)
      setWon(false)
      setPoints(0)
      setRevealTitle(null)
      setRevealYear(undefined)
      setRevealPoster(null)
      setPixelPoster(data.pixelPosterUrl || null)
      setHint(null)
      setSuggestions([])
      setShowSuggestions(false)
      if (data.priorResult) {
        setEnded(true)
        onDailyModePlayed?.()
        setWon(Boolean(data.priorResult.won))
        setPoints(data.priorResult.points ?? 0)
        setRevealTitle(data.priorResult.titlePt || data.priorResult.title || '?')
        setRevealYear(data.priorResult.year)
        setRevealPoster(data.priorResult.posterUrl || null)
        setWrong(data.priorResult.guesses ?? 0)
      }
    } catch (err) {
      setLoadError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzleDate])

  function queueAutocomplete(value: string) {
    if (suggestTimer.current) window.clearTimeout(suggestTimer.current)
    const q = value.trim()
    if (!q) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    suggestTimer.current = window.setTimeout(() => {
      void fetchAutocomplete(q)
        .then((res) => {
          setSuggestions(res.suggestions)
          setShowSuggestions(res.suggestions.length > 0)
        })
        .catch(() => {
          setSuggestions([])
          setShowSuggestions(false)
        })
    }, 150)
  }

  async function persistFinish(
    outcome: 'win' | 'lose',
    wrongs: number,
    guesses: number,
  ) {
    if (!puzzle || !user || finishedRef.current) return
    finishedRef.current = true
    try {
      const res = await finishKeywords({
        puzzleId: puzzle.puzzleId,
        outcome,
        wrongGuesses: wrongs,
        guesses,
      })
      onProgress(res.progress)
      if (res.unlockedAchievements?.length) {
        onAchievements?.(res.unlockedAchievements)
      }
      setPoints(res.points)
      setRevealTitle(res.titlePt || res.title)
      setRevealYear(res.year)
      setRevealPoster(res.posterUrl || null)
    } catch {
      /* guest / archive */
    }
  }

  async function submitGuess(raw: string, opts?: { skip?: boolean }) {
    if (!puzzle || busy || ended) return
    const value = raw.trim()
    const skip = Boolean(opts?.skip) || !value
    if (!skip && !value) return
    setBusy(true)
    setHint(null)
    setShowSuggestions(false)
    try {
      const res = await postKeywordsGuess({
        puzzleId: puzzle.puzzleId,
        guess: skip ? '' : value,
        skip,
        wrongGuesses: wrong,
      })
      setWords(res.words || [])
      setWrong(res.wrongGuesses)
      if (res.pixelPosterUrl) setPixelPoster(res.pixelPosterUrl)
      setGuess('')
      if (res.correct) {
        setEnded(true)
        onDailyModePlayed?.()
        setWon(true)
        setPoints(res.points)
        setRevealTitle(res.titlePt || res.title || '?')
        setRevealYear(res.year)
        setRevealPoster(res.posterUrl || null)
        await persistFinish('win', res.wrongGuesses, res.wrongGuesses + 1)
      } else if (res.ended) {
        setEnded(true)
        onDailyModePlayed?.()
        setWon(false)
        setRevealTitle(res.titlePt || res.title || '?')
        setRevealYear(res.year)
        setRevealPoster(res.posterUrl || null)
        await persistFinish('lose', res.wrongGuesses, res.wrongGuesses)
      } else {
        const added = res.addedWords ?? 0
        const prefix = res.skipped ? 'Pulou' : 'Errou'
        const extra = res.showPixelPoster ? ' · pôster pixelizado' : ''
        setHint(
          added > 0
            ? `${prefix} · +${added} palavra${added === 1 ? '' : 's'}${extra}`
            : res.showPixelPoster
              ? `${prefix} · pôster pixelizado`
              : prefix,
        )
      }
    } catch (err) {
      setHint((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    // vazio = pular (igual Poster / Clássico)
    void submitGuess(guess, { skip: !guess.trim() })
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
            PALAVRA-CHAVE
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

        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-cinema-muted">
          <span>
            {isArchive ? `Arquivo ${activeDate}` : 'Diário'} ·{' '}
            <span className="text-cinema-gold">médio</span>
          </span>
          {onPickArchiveDate ? (
            <DailyCalendarButton
              title="Palavra-chave"
              activeDate={activeDate}
              onPickDate={onPickArchiveDate}
            />
          ) : null}
        </div>
        <div className="panel-frame px-3 py-2 text-center">
          <p className="font-mono text-sm text-cinema-gold tabular-nums">
            Tentativas: {wrong}/{maxWrong}
          </p>
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
                  {won ? 'ACERTOU!' : 'FIM'}
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
                <button
                  type="button"
                  className="mode-btn mode-btn-inline border-cinema-gold px-4 py-2 font-display text-lg text-cinema-gold"
                  onClick={onBack}
                >
                  LOBBY
                </button>
              </div>
            ) : (
              <>
                <p className="text-center text-sm text-white/80">
                  As palavras na lousa têm a ver com o filme. Sem ideia? Pule
                  pra revelar mais.
                </p>

                <div className="keyword-board">
                  <p className="keyword-board-title">
                    Hoje na lousa
                    <span className="keyword-board-count">
                      {' '}
                      · {words.length} palavra{words.length === 1 ? '' : 's'}
                    </span>
                  </p>
                  <ul className="keyword-board-words">
                    {words.map((w, i) => (
                      <li
                        key={`kw-${wrong}-${i}-${w}`}
                        className="keyword-chalk"
                        style={
                          {
                            '--chalk-tilt': `${((i % 5) - 2) * 1.2}deg`,
                          } as CSSProperties
                        }
                      >
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>

                {pixelPoster ? (
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-[11px] text-cinema-muted uppercase tracking-wide">
                      Pôster pixelizado
                    </p>
                    <div className="keyword-pixel-wrap">
                      <PixelatedPoster
                        src={pixelPoster}
                        sampleW={12}
                        sampleH={18}
                        displayW={140}
                        displayH={210}
                        className="keyword-pixel-canvas"
                        alt="Pôster pixelizado"
                      />
                    </div>
                  </div>
                ) : null}

                {hint ? (
                  <p className="text-center text-xs text-cinema-gold">{hint}</p>
                ) : null}

                <form
                  onSubmit={onSubmit}
                  className="relative flex flex-col gap-2 sm:flex-row"
                >
                  <div className="relative min-w-0 flex-1">
                    <input
                      type="text"
                      value={guess}
                      disabled={busy}
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
                      placeholder="Digite o filme…"
                      className="guess-input w-full"
                      autoComplete="off"
                    />
                    {showSuggestions && suggestions.length > 0 ? (
                      <ul className="absolute right-0 bottom-full left-0 z-30 mb-1 max-h-48 overflow-auto border-2 border-cinema-gold bg-[#0a060c]">
                        {suggestions.map((item) => (
                          <li key={`${item.title}-${item.year}-${item.label}`}>
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
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      className="mode-btn mode-btn-inline border-cinema-line px-4 py-3 font-display text-lg text-cinema-muted disabled:opacity-40"
                      onClick={() => void submitGuess('', { skip: true })}
                    >
                      PULAR
                    </button>
                    <button
                      type="submit"
                      disabled={busy || !guess.trim()}
                      className="mode-btn mode-btn-primary mode-btn-inline flex-1 px-5 py-3 font-display text-xl disabled:opacity-40"
                    >
                      CHUTAR
                    </button>
                  </div>
                </form>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
