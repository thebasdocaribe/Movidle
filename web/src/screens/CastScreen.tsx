import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  fetchAutocomplete,
  fetchCastDaily,
  fetchCastNext,
  finishRound,
  postCastGuess,
  type AutocompleteItem,
  type CastDailyPayload,
  type CastHint,
} from '../api'
import { PixelPoster } from '../components/PixelPoster'

/** Pixelização fixa (~nível da 4ª dica antiga). 10 = mosaico demais; 24 = legível/difícil */
const CAST_MOSAIC_COLUMNS = 24
import type { AuthUser, ProgressMap } from '../auth'
import { modeProgress } from '../auth'
import { multiplierForStreak } from '../scoring'

type CastScreenProps = {
  variant: 'daily' | 'endless'
  user: AuthUser | null
  progress: ProgressMap
  onProgress: (p: ProgressMap) => void
  castPlayedToday: boolean
  onCastPlayed: () => void
  /** YYYY-MM-DD do calendário; null = hoje */
  puzzleDate?: string | null
  onBack: () => void
  onNeedAuth: () => void
}

const MAX_TAKE = 7

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
  const [src, setSrc] = useState(
    imageUrl || (name && name !== '—' ? avatarUrl(name) : ''),
  )

  useEffect(() => {
    setSrc(imageUrl || (name && name !== '—' ? avatarUrl(name) : ''))
  }, [imageUrl, name])

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
  castPlayedToday,
  onCastPlayed,
  puzzleDate = null,
  onBack,
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
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [playedIds, setPlayedIds] = useState<string[]>([])
  const guessRef = useRef<HTMLInputElement>(null)
  const suggestTimer = useRef<number | null>(null)

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
  const sharp = Boolean(ended && won)
  const columns = sharp ? 1 : CAST_MOSAIC_COLUMNS

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
    setPlayedIds([])
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
    })
    onProgress(finished.progress)
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
    if (
      !endless &&
      user &&
      (daily.alreadyPlayed || (!isArchive && castPlayedToday))
    ) {
      setHint(
        isArchive
          ? 'Você já jogou o elenco deste dia'
          : 'Você já jogou o elenco de hoje',
      )
      return
    }
    if (attempt + 1 >= MAX_TAKE) {
      setBusy(true)
      try {
        const finished = user ? await persist('lose', MAX_TAKE) : null
        setWon(false)
        setEnded(true)
        setPoints(0)
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

    if (
      !endless &&
      user &&
      (daily.alreadyPlayed || (!isArchive && castPlayedToday))
    ) {
      setHint(
        isArchive
          ? 'Você já jogou o elenco deste dia'
          : 'Você já jogou o elenco de hoje',
      )
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
        setPoints(finished?.points ?? result.points)
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

      setWrongGuesses((prev) => [...prev, typed])
      setGuess('')

      if (attempt + 1 >= MAX_TAKE) {
        const finished = user ? await persist('lose', MAX_TAKE) : null
        setWon(false)
        setEnded(true)
        setPoints(0)
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
      setHint(`Errou: “${typed}” · próxima dica`)
    } catch (err) {
      setHint((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const blocked = Boolean(
    !endless &&
      user &&
      (daily?.alreadyPlayed || (!isArchive && castPlayedToday)),
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
            {endless ? 'CASTING' : 'ELENCO'}
          </h1>
          <p className="text-[10px] text-cinema-muted">
            +{prog.totalScore} · ×
            {multiplierForStreak(prog.firstTryStreak)
              .toFixed(2)
              .replace(/\.00$/, '')}
          </p>
        </div>

        <p className="text-center text-xs text-cinema-muted">
          {endless
            ? 'Ilimitado'
            : isArchive
              ? `Arquivo ${activeDate} · 0 pts`
              : 'Diário'}{' '}
          · dica {Math.min(attempt + 1, MAX_TAKE)}/{MAX_TAKE}
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
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 p-4 text-center">
                    <p className="font-display text-4xl text-cinema-gold">
                      {won ? 'ACERTOU!' : 'FIM'}
                    </p>
                    {won ? (
                      <p className="font-display text-2xl text-cinema-red">
                        +{points} PTS
                      </p>
                    ) : null}
                    <p className="mt-2 text-white">
                      {revealTitle}
                      {revealYear ? ` (${revealYear})` : ''}
                    </p>
                    {endless ? (
                      <button
                        type="button"
                        onClick={() => void goNextEndless()}
                        className="mode-btn mode-btn-primary mode-btn-inline mt-4 px-4 py-2"
                      >
                        PRÓXIMO FILME
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onBack}
                        className="mode-btn mode-btn-inline mt-4 border-cinema-gold px-4 py-2 text-cinema-gold"
                      >
                        LOBBY
                      </button>
                    )}
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
                {wrongGuesses.map((g) => (
                  <li
                    key={g}
                    className="border border-cinema-red/60 bg-cinema-red/20 px-2 py-0.5 text-[11px] text-white"
                  >
                    {g}
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
                  : 'VOCÊ JÁ JOGOU O ELENCO DE HOJE'}
              </p>
            ) : null}

            {hint ? (
              <p className="text-center text-xs text-cinema-muted">{hint}</p>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
