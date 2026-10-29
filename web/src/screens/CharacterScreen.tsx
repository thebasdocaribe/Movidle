import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  fetchCharacterAutocomplete,
  fetchCharacterDaily,
  fetchCharacterNext,
  postCharacterGuess,
  type AutocompleteItem,
  type CharacterPayload,
} from '../api'
import type { AuthUser, ProgressMap } from '../auth'
import { modeProgress } from '../auth'
import {
  CHARACTER_MAX_TAKE,
  CHARACTER_STAGES,
  CharacterCrop,
} from '../components/CharacterCrop'

type CharacterScreenProps = {
  variant: 'daily' | 'endless'
  user: AuthUser | null
  progress: ProgressMap
  onProgress: (p: ProgressMap) => void
  puzzleDate?: string | null
  onBack: () => void
}

export function CharacterScreen({
  variant,
  user,
  progress,
  onProgress,
  puzzleDate = null,
  onBack,
}: CharacterScreenProps) {
  const endless = variant === 'endless'
  const [puzzle, setPuzzle] = useState<CharacterPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [guess, setGuess] = useState('')
  const [busy, setBusy] = useState(false)
  const [ended, setEnded] = useState(false)
  const [won, setWon] = useState(false)
  const [revealName, setRevealName] = useState<string | null>(null)
  const [revealFilm, setRevealFilm] = useState<string | null>(null)
  const [points, setPoints] = useState(0)
  const [wrong, setWrong] = useState<string[]>([])
  const [hint, setHint] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [playedIds, setPlayedIds] = useState<string[]>([])
  const suggestTimer = useRef<number | null>(null)
  const guessRef = useRef<HTMLInputElement>(null)

  const prog = modeProgress(progress, 'character')

  async function load(exclude: string[] = playedIds) {
    setLoading(true)
    setLoadError(null)
    try {
      const data = endless
        ? await fetchCharacterNext(exclude)
        : await fetchCharacterDaily(puzzleDate || undefined)
      setPuzzle(data)
      if (endless && data.puzzleId) {
        setPlayedIds((prev) =>
          prev.includes(data.puzzleId) ? prev : [...prev, data.puzzleId],
        )
      }
    } catch (err) {
      setLoadError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setAttempt(0)
    setEnded(false)
    setWon(false)
    setWrong([])
    setGuess('')
    setRevealName(null)
    setPlayedIds([])
    void load([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, puzzleDate])

  function queueAutocomplete(value: string) {
    if (suggestTimer.current) window.clearTimeout(suggestTimer.current)
    suggestTimer.current = window.setTimeout(() => {
      void fetchCharacterAutocomplete(value)
        .then((res) => {
          setSuggestions(res.suggestions)
          setShowSuggestions(res.suggestions.length > 0)
        })
        .catch(() => {
          setSuggestions([])
          setShowSuggestions(false)
        })
    }, 180)
  }

  async function goNext() {
    setAttempt(0)
    setEnded(false)
    setWon(false)
    setWrong([])
    setGuess('')
    setRevealName(null)
    setRevealFilm(null)
    setHint(null)
    setPoints(0)
    await load([...playedIds])
  }

  async function submitGuess(e: FormEvent) {
    e.preventDefault()
    if (!puzzle || busy || ended) return
    const typed = guess.trim()

    if (!typed) {
      if (attempt + 1 >= CHARACTER_MAX_TAKE) {
        await finishEmptyLose()
        return
      }
      setAttempt((a) => a + 1)
      setHint(`Pulou · ${CHARACTER_STAGES[Math.min(attempt + 1, CHARACTER_MAX_TAKE - 1)]?.label}`)
      return
    }

    if (!endless && user && puzzle.alreadyPlayed) {
      setHint('Você já jogou o personagem de hoje')
      return
    }

    setBusy(true)
    setShowSuggestions(false)
    try {
      const result = await postCharacterGuess({
        puzzleId: puzzle.puzzleId,
        attempt: attempt + 1,
        guess: typed,
        endless,
      })
      if (result.progress) onProgress(result.progress)

      if (result.correct) {
        setWon(true)
        setEnded(true)
        setPoints(result.points)
        setRevealName(result.namePt || result.name || typed)
        setRevealFilm(result.filmTitle || null)
        setHint(user ? null : 'Guest · entre pra salvar no rank')
        return
      }

      setWrong((w) => [...w, typed])
      setGuess('')

      if (attempt + 1 >= CHARACTER_MAX_TAKE) {
        setWon(false)
        setEnded(true)
        setPoints(0)
        setRevealName(result.namePt || result.name || '?')
        setRevealFilm(result.filmTitle || null)
        return
      }

      setAttempt((a) => a + 1)
      setHint(`Errou · próxima: ${CHARACTER_STAGES[attempt + 1]?.label}`)
    } catch (err) {
      setHint((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function finishEmptyLose() {
    if (!puzzle || busy) return
    setBusy(true)
    try {
      const result = await postCharacterGuess({
        puzzleId: puzzle.puzzleId,
        attempt: CHARACTER_MAX_TAKE,
        guess: '—',
        endless,
      })
      if (result.progress) onProgress(result.progress)
      setWon(false)
      setEnded(true)
      setPoints(0)
      setRevealName(result.namePt || result.name || '?')
      setRevealFilm(result.filmTitle || null)
    } catch (err) {
      setHint((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const blocked = Boolean(!endless && user && puzzle?.alreadyPlayed)

  return (
    <div className="min-h-0 flex-1">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-3 px-3 py-4 sm:px-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="border border-cinema-line px-2 py-1 text-xs text-cinema-gold"
          >
            ← Lobby
          </button>
          <h1 className="font-display text-2xl text-white sm:text-3xl">
            PERSONAGEM
          </h1>
          <p className="text-[10px] text-cinema-muted">
            +{prog.totalScore}
          </p>
        </div>

        <p className="text-center text-xs text-cinema-muted">
          {endless ? 'Ilimitado' : 'Diário'} · recorte{' '}
          {Math.min(attempt + 1, CHARACTER_MAX_TAKE)}/{CHARACTER_MAX_TAKE}
        </p>

        {loading ? (
          <p className="text-center text-cinema-muted">Carregando…</p>
        ) : loadError ? (
          <p className="text-center text-cinema-red">{loadError}</p>
        ) : puzzle ? (
          <>
            <div className="panel-frame mx-auto w-full max-w-sm overflow-hidden p-0">
              <div className="relative">
                <CharacterCrop
                  src={puzzle.imageUrl}
                  stage={attempt}
                  reveal={ended}
                />
                {ended ? (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/75 p-4 text-center">
                    <p className="font-display text-4xl text-cinema-gold">
                      {won ? 'ACERTOU!' : 'FIM'}
                    </p>
                    {won ? (
                      <p className="font-display text-2xl text-cinema-red">
                        +{points} PTS
                      </p>
                    ) : null}
                    <p className="mt-2 text-lg text-white">{revealName}</p>
                    {revealFilm ? (
                      <p className="text-sm text-cinema-muted">{revealFilm}</p>
                    ) : null}
                    {endless ? (
                      <button
                        type="button"
                        onClick={() => void goNext()}
                        className="mode-btn mode-btn-primary mode-btn-inline mt-4 px-4 py-2"
                      >
                        PRÓXIMO
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

            {wrong.length > 0 ? (
              <ul className="flex flex-wrap justify-center gap-1">
                {wrong.map((w) => (
                  <li
                    key={w}
                    className="border border-cinema-red/50 px-2 py-0.5 text-[11px] text-cinema-red"
                  >
                    {w}
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
                    placeholder="Nome do personagem…"
                    className="guess-input w-full"
                    autoComplete="off"
                  />
                  {showSuggestions ? (
                    <ul className="absolute right-0 bottom-full left-0 z-30 mb-1 max-h-48 overflow-auto border-2 border-cinema-gold bg-[#0a060c]">
                      {suggestions.map((item) => (
                        <li key={item.label}>
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
                VOCÊ JÁ JOGOU HOJE
              </p>
            ) : null}

            {hint ? (
              <p className="text-center text-xs text-cinema-muted">{hint}</p>
            ) : (
              <p className="text-center text-[11px] text-cinema-muted">
                Errou? Abre outro pedaço do personagem. Confirmar vazio pula.
              </p>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
