import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  fetchAutocomplete,
  fetchWhoamiDaily,
  fetchWhoamiNext,
  finishWhoami,
  postWhoamiAsk,
  postWhoamiGuess,
  type AutocompleteItem,
  type WhoamiAskChip,
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

type Chip = WhoamiAskChip & { key: string }

const VERDICT_CLASS: Record<string, string> = {
  green: 'whoami-chip whoami-chip-green',
  yellow: 'whoami-chip whoami-chip-yellow',
  red: 'whoami-chip whoami-chip-red',
}

export function WhoAmIScreen({
  variant,
  user,
  progress,
  onProgress,
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
  type AskTab = 'genre' | 'decade' | 'era' | 'region' | 'runtime' | 'flag'
  const [tab, setTab] = useState<AskTab>('genre')
  const [chips, setChips] = useState<Chip[]>([])
  const [asksUsed, setAsksUsed] = useState(0)
  const [askBonus, setAskBonus] = useState(0)
  const [adsUsed, setAdsUsed] = useState(0)
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
  const [playedIds, setPlayedIds] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestTimer = useRef<number | null>(null)

  const prog = modeProgress(progress, 'whoami')
  const baseAsks = puzzle?.askBank.maxAsks ?? 16
  const adBonusUnit = puzzle?.askBank.adBonusAsks ?? 5
  const maxAds = puzzle?.askBank.maxAds ?? 2
  const maxAsks = baseAsks + askBonus
  const asksLeft = Math.max(0, maxAsks - asksUsed)
  const maxWrong = puzzle?.askBank.maxWrong ?? 6
  const askedKeys = useMemo(
    () => new Set(chips.map((c) => `${c.kind}:${c.value}`)),
    [chips],
  )

  const options = useMemo(() => {
    if (!puzzle) return []
    if (tab === 'genre') return puzzle.askBank.genres ?? []
    if (tab === 'decade') return puzzle.askBank.decades ?? []
    if (tab === 'era') return puzzle.askBank.eras ?? []
    if (tab === 'runtime') return puzzle.askBank.runtimes ?? []
    if (tab === 'flag') return puzzle.askBank.flags ?? []
    return puzzle.askBank.regions ?? []
  }, [puzzle, tab])

  async function load(exclude: string[] = []) {
    setLoading(true)
    setLoadError(null)
    try {
      const data = endless
        ? await fetchWhoamiNext(exclude)
        : await fetchWhoamiDaily(puzzleDate || undefined)
      setPuzzle(data)
      setChips([])
      setAsksUsed(0)
      setAskBonus(0)
      setAdsUsed(0)
      setWrong(0)
      setGuess('')
      setEnded(false)
      setWon(false)
      setPoints(0)
      setRevealTitle(null)
      setRevealYear(undefined)
      setRevealPoster(null)
      setHint(null)
      setTab('genre')
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

  async function askOption(opt: { kind: string; value: string; label: string }) {
    if (!puzzle || busy || ended) return
    const key = `${opt.kind}:${opt.value}`
    if (askedKeys.has(key)) {
      setHint('Você já perguntou isso')
      return
    }
    if (asksUsed >= maxAsks) {
      setHint('Acabaram as dicas do orçamento — chute ou assista um anúncio')
      return
    }
    setBusy(true)
    setHint(null)
    try {
      const res = await postWhoamiAsk({
        puzzleId: puzzle.puzzleId,
        kind: opt.kind as WhoamiAskChip['kind'],
        value: opt.value,
      })
      setChips((prev) => [
        ...prev,
        {
          kind: opt.kind as Chip['kind'],
          value: opt.value,
          label: res.label || opt.label,
          verdict: res.verdict,
          key: `${key}-${Date.now()}`,
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
            endless,
          })
          onProgress(finished.progress)
          setPoints(finished.points)
        }
        return
      }

      const nextWrong = wrong + 1
      setWrong(nextWrong)
      setGuess('')
      if (nextWrong >= maxWrong || res.title || res.titlePt) {
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
            endless,
          })
          onProgress(finished.progress)
        }
        return
      }
      setHint(`Errou: “${typed}” · ${maxWrong - nextWrong} chute(s)`)
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
          <p className="text-[10px] text-cinema-muted">
            +{prog.totalScore}
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
          {endless ? 'Ilimitado' : 'Diário'} ·{' '}
          <span className="text-cinema-gold">difícil</span>
        </p>
        <div className="panel-frame px-3 py-2 text-center">
          <p className="font-mono text-sm text-cinema-gold tabular-nums">
            Dicas restantes: {asksLeft}/{maxAsks}
          </p>
          <p className="mt-0.5 text-[11px] text-cinema-muted">
            Orçamento único pra todos os tópicos (gênero, década, origem…)
          </p>
          <p className="mt-0.5 text-[11px] text-cinema-muted">
            Chutes errados: {wrong}/{maxWrong}
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
                  Sou um filme. Cada pergunta gasta 1 dica do total —{' '}
                  <span className="text-emerald-400">verde</span> sim,{' '}
                  <span className="text-amber-300">amarelo</span> em parte,{' '}
                  <span className="text-cinema-red">vermelho</span> não.
                </p>

                {chips.length > 0 ? (
                  <ul className="flex flex-wrap justify-center gap-1.5">
                    {chips.map((c) => (
                      <li key={c.key} className={VERDICT_CLASS[c.verdict]}>
                        {c.label}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-xs text-cinema-muted">
                    Nenhuma pista ainda — escolha abaixo
                  </p>
                )}

                <div className="flex flex-wrap justify-center gap-1">
                  {(
                    [
                      ['genre', 'Gênero'],
                      ['decade', 'Década'],
                      ['era', 'Época'],
                      ['region', 'Origem'],
                      ['runtime', 'Duração'],
                      ['flag', 'Extras'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTab(id)}
                      className={`border px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase ${
                        tab === id
                          ? 'border-cinema-gold bg-cinema-gold/15 text-cinema-gold'
                          : 'border-cinema-line text-cinema-muted'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="max-h-48 overflow-y-auto border border-cinema-line/60 bg-black/30 p-2">
                  <ul className="flex flex-wrap gap-1.5">
                    {options.map((opt) => {
                      const used = askedKeys.has(`${opt.kind}:${opt.value}`)
                      return (
                        <li key={`${opt.kind}:${opt.value}`}>
                          <button
                            type="button"
                            disabled={busy || used || asksLeft <= 0}
                            onClick={() => void askOption(opt)}
                            className={`border px-2 py-1 text-[11px] ${
                              used
                                ? 'border-cinema-line/40 text-cinema-muted/50'
                                : 'border-cinema-line text-white hover:border-cinema-gold hover:text-cinema-gold'
                            } disabled:opacity-40`}
                          >
                            {opt.label}?
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                {asksLeft <= 0 && adsUsed < maxAds && !ended ? (
                  <button
                    type="button"
                    disabled={busy}
                    className="mode-btn mode-btn-inline w-full border-cinema-cyan px-4 py-2.5 font-display text-lg text-cinema-cyan"
                    onClick={() => {
                      // Stub de anúncio — plugar AdMob/rewarded depois
                      setAskBonus((b) => b + adBonusUnit)
                      setAdsUsed((n) => n + 1)
                      setHint(`+${adBonusUnit} dicas (anúncio)`)
                    }}
                  >
                    ASSISTIR ANÚNCIO · +{adBonusUnit} DICAS ({adsUsed}/{maxAds})
                  </button>
                ) : null}

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
