import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  createDuel,
  duelAct,
  fetchDuel,
  joinDuel,
  type DuelState,
} from '../api'
import type { AuthUser } from '../auth'

type DuelScreenProps = {
  user: AuthUser
  initialCode?: string | null
  onBack: () => void
}

export function DuelScreen({ user, initialCode, onBack }: DuelScreenProps) {
  const [codeInput, setCodeInput] = useState(initialCode || '')
  const [duel, setDuel] = useState<DuelState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [guess, setGuess] = useState('')
  const [phase, setPhase] = useState<'lobby' | 'match'>('lobby')
  const [playing, setPlaying] = useState(false)
  const [showReveal, setShowReveal] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const revealKeyRef = useRef<string>('')

  const clipSeconds = duel ? duel.take : 1

  useEffect(() => {
    if (initialCode) {
      void handleJoin(initialCode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!duel?.code || phase !== 'match') return
    const id = window.setInterval(() => {
      fetchDuel(duel.code)
        .then((next) => {
          setDuel((prev) => {
            // novo take/filme → os dois podem (re)ver o clipe
            if (
              prev &&
              (prev.filmIndex !== next.filmIndex || prev.take !== next.take)
            ) {
              setPlaying(false)
            }
            return next
          })
        })
        .catch(() => {})
    }, 1200)
    return () => window.clearInterval(id)
  }, [duel?.code, phase])

  // Reveal temporário (não trava o próximo filme)
  useEffect(() => {
    if (!duel?.lastReveal || !duel.lastEvent) {
      setShowReveal(false)
      return
    }
    const key = `${duel.filmIndex}|${duel.take}|${duel.lastEvent}`
    if (key === revealKeyRef.current) return
    revealKeyRef.current = key
    setShowReveal(true)
    const id = window.setTimeout(() => setShowReveal(false), 2800)
    return () => window.clearTimeout(id)
  }, [duel?.lastReveal, duel?.lastEvent, duel?.filmIndex, duel?.take])

  useEffect(() => {
    if (!playing || !duel?.media) return
    const video = videoRef.current
    const endAt = Math.max(0.05, clipSeconds - 0.08)
    const ms = Math.max(200, clipSeconds * 1000 - 80)

    if (duel.media.type === 'video' && video) {
      const stopAtBoundary = () => {
        if (video.currentTime >= endAt) {
          video.pause()
          video.currentTime = endAt
        }
      }
      try {
        video.currentTime = 0
      } catch {
        /* seek race */
      }
      video.addEventListener('timeupdate', stopAtBoundary)
      void video.play().catch(() => {})
      const id = window.setTimeout(() => setPlaying(false), ms)
      return () => {
        video.removeEventListener('timeupdate', stopAtBoundary)
        video.pause()
        window.clearTimeout(id)
      }
    }

    const id = window.setTimeout(() => setPlaying(false), ms)
    return () => window.clearTimeout(id)
  }, [playing, duel?.media?.url, duel?.take, clipSeconds, duel?.filmIndex])

  async function handleCreate() {
    setBusy(true)
    setError(null)
    try {
      const d = await createDuel()
      setDuel(d)
      setPhase('match')
      const url = `${window.location.origin}/?duel=${d.code}`
      try {
        await navigator.clipboard.writeText(url)
      } catch {
        /* ignore */
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin(code = codeInput) {
    setBusy(true)
    setError(null)
    try {
      const d = await joinDuel(code.trim().toUpperCase())
      setDuel(d)
      setPhase('match')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!duel || !duel.yourTurn || busy || showReveal) return
    setBusy(true)
    setError(null)
    try {
      const next = await duelAct(duel.code, guess)
      setDuel(next)
      setGuess('')
      setPlaying(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function skipTake() {
    if (!duel || !duel.yourTurn || busy || showReveal) return
    setBusy(true)
    try {
      const next = await duelAct(duel.code, '')
      setDuel(next)
      setPlaying(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (phase === 'lobby') {
    return (
      <div className="min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6">
          <button
            type="button"
            onClick={onBack}
            className="self-start border border-cinema-line px-2 py-1 text-xs text-cinema-gold"
          >
            ← Lobby
          </button>
          <h1 className="font-display text-4xl text-cinema-gold">
            DESAFIE UM AMIGO
          </h1>
          <p className="text-sm text-cinema-muted">
            10 filmes · turnos alternados · os dois veem o mesmo clipe. Host
            começa o filme 1; depois de cada filme, o outro começa.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleCreate()}
            className="mode-btn mode-btn-primary mode-btn-inline px-4 py-3 font-display text-2xl"
          >
            CRIAR SALA
          </button>
          <div className="flex gap-2">
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="CÓDIGO"
              className="guess-input flex-1"
              maxLength={6}
            />
            <button
              type="button"
              disabled={busy || codeInput.trim().length < 4}
              onClick={() => void handleJoin()}
              className="mode-btn mode-btn-inline border-cinema-gold px-4 text-cinema-gold"
            >
              ENTRAR
            </button>
          </div>
          {error ? <p className="text-sm text-cinema-red">{error}</p> : null}
          <p className="text-xs text-cinema-muted">Logado como @{user.username}</p>
        </div>
      </div>
    )
  }

  if (!duel) return null

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?duel=${duel.code}`
      : duel.code

  return (
    <div className="min-h-0 flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="border border-cinema-line px-2 py-1 text-xs text-cinema-gold"
          >
            ← Lobby
          </button>
          <p className="font-display text-2xl text-white">DUELO {duel.code}</p>
          <div className="w-16" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div
            className={`border px-2 py-2 ${
              duel.yourTurn && duel.youAreHost
                ? 'border-cinema-red bg-cinema-red/20'
                : 'border-cinema-line bg-black/40'
            }`}
          >
            <p className="text-[10px] text-cinema-muted uppercase">Host</p>
            <p className="font-semibold text-cinema-gold">
              @{duel.host.username}
              {duel.youAreHost ? ' (você)' : ''}
            </p>
            <p className="font-display text-2xl text-cinema-cyan">
              {duel.host.score}
            </p>
          </div>
          <div
            className={`border px-2 py-2 ${
              duel.yourTurn && !duel.youAreHost
                ? 'border-cinema-red bg-cinema-red/20'
                : 'border-cinema-line bg-black/40'
            }`}
          >
            <p className="text-[10px] text-cinema-muted uppercase">Convidado</p>
            <p className="font-semibold text-cinema-gold">
              {duel.guest
                ? `@${duel.guest.username}${!duel.youAreHost ? ' (você)' : ''}`
                : 'aguardando…'}
            </p>
            <p className="font-display text-2xl text-cinema-cyan">
              {duel.guest?.score ?? 0}
            </p>
          </div>
        </div>

        {duel.status === 'waiting' ? (
          <div className="panel-frame space-y-2 p-4 text-center">
            <p className="text-cinema-cyan">Aguardando amigo entrar…</p>
            <p className="break-all text-xs text-cinema-muted">{shareUrl}</p>
            <p className="text-[11px] text-cinema-muted">
              Link copiado (se o browser permitir). Código: {duel.code}
            </p>
          </div>
        ) : null}

        {duel.status === 'finished' ? (
          <div className="panel-frame space-y-3 p-5 text-center">
            <p className="font-display text-4xl text-cinema-gold">FIM DE JOGO</p>
            <p className="text-white">
              {duel.winnerUserId == null
                ? 'Empate!'
                : String(duel.winnerUserId) === String(user.id)
                  ? 'Você venceu!'
                  : 'Seu amigo venceu.'}
            </p>
            <p className="text-cinema-cyan">
              {duel.host.score} × {duel.guest?.score ?? 0}
            </p>
            <button
              type="button"
              onClick={onBack}
              className="mode-btn mode-btn-primary mode-btn-inline px-4 py-2"
            >
              LOBBY
            </button>
          </div>
        ) : null}

        {duel.status === 'playing' ? (
          <>
            <p className="text-center text-xs text-cinema-muted">
              Filme {duel.filmIndex + 1}/{duel.filmsTotal} · Take {duel.take}/6
              {duel.yourTurn ? ' · SUA VEZ' : ' · vez do amigo (você também vê)'}
            </p>
            {duel.lastEvent ? (
              <p className="text-center text-sm text-cinema-gold">{duel.lastEvent}</p>
            ) : null}

            <div className="panel-frame overflow-hidden p-0">
              <div className="film-grain relative aspect-video w-full bg-black">
                {duel.media ? (
                  duel.media.type === 'video' ? (
                    <video
                      ref={videoRef}
                      src={duel.media.url}
                      muted
                      playsInline
                      preload="auto"
                      className={`absolute inset-0 h-full w-full object-contain transition-opacity ${
                        playing || showReveal ? 'opacity-100' : 'opacity-90'
                      }`}
                    />
                  ) : (
                    <img
                      src={duel.media.url}
                      alt=""
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  )
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-cinema-muted">
                    Sem mídia
                  </div>
                )}

                {!playing && !showReveal && duel.media ? (
                  <div className="absolute inset-0 z-[5] flex items-center justify-center bg-black/45">
                    <p className="font-display text-xl text-white sm:text-2xl">
                      PLAY pra ver o take {duel.take}
                    </p>
                  </div>
                ) : null}

                {showReveal && duel.lastReveal ? (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/80 p-4">
                    {duel.lastReveal.posterUrl ? (
                      <img
                        src={duel.lastReveal.posterUrl}
                        alt=""
                        className="h-28 border border-cinema-gold object-cover"
                      />
                    ) : null}
                    <p className="text-white">
                      {duel.lastReveal.titlePt || duel.lastReveal.title}
                      {duel.lastReveal.year
                        ? ` (${duel.lastReveal.year})`
                        : ''}
                    </p>
                    {duel.lastReveal.points > 0 ? (
                      <p className="font-display text-2xl text-cinema-red">
                        +{duel.lastReveal.points}
                      </p>
                    ) : null}
                    <p className="text-[11px] text-cinema-muted">
                      Próximo filme em instantes…
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Os dois podem assistir; só quem tem a vez chuta */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={playing || showReveal || !duel.media}
                onClick={() => setPlaying(true)}
                className="mode-btn mode-btn-primary mode-btn-inline px-4 py-2 font-display text-xl disabled:opacity-40"
              >
                PLAY TAKE {duel.take}
              </button>

              {duel.yourTurn && !showReveal ? (
                <>
                  <form onSubmit={submit} className="flex gap-2">
                    <input
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      placeholder="chute o filme…"
                      className="guess-input flex-1"
                      disabled={busy}
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="mode-btn mode-btn-inline border-cinema-gold px-3 text-cinema-gold"
                    >
                      OK
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => void skipTake()}
                    className="text-xs text-cinema-muted underline"
                  >
                    Passar take (vazio)
                  </button>
                </>
              ) : (
                <p className="text-center text-xs text-cinema-muted">
                  {showReveal
                    ? 'Revelando…'
                    : 'Você assiste junto · espere sua vez pra chutar'}
                </p>
              )}
            </div>
          </>
        ) : null}

        {error ? <p className="text-sm text-cinema-red">{error}</p> : null}
      </div>
    </div>
  )
}
