import { useEffect, useState } from 'react'
import { fetchMe, verifyEmail, type GameMode } from './api'
import {
  emptyProgress,
  getToken,
  setToken,
  type AuthUser,
  type ProgressMap,
} from './auth'
import { AppShell } from './components/AppShell'
import { AuthModal } from './components/AuthModal'
import { CastScreen } from './screens/CastScreen'
import { CharacterScreen } from './screens/CharacterScreen'
import { DailyScreen } from './screens/DailyScreen'
import { DuelScreen } from './screens/DuelScreen'
import { HubScreen } from './screens/HubScreen'

type Screen = 'hub' | 'play' | 'cast' | 'cast-endless' | 'character' | 'duel'

export default function App() {
  const [screen, setScreen] = useState<Screen>('hub')
  const [mode, setMode] = useState<GameMode>('daily')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [progress, setProgress] = useState<ProgressMap>(emptyProgress())
  const [dailyPlayedToday, setDailyPlayedToday] = useState(false)
  const [castPlayedToday, setCastPlayedToday] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [duelCode, setDuelCode] = useState<string | null>(null)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [banner, setBanner] = useState<string | null>(null)
  const [pendingDuel, setPendingDuel] = useState(false)
  const [playDate, setPlayDate] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const reset = params.get('reset')
    const verify = params.get('verify')
    const duel = params.get('duel')

    if (reset || verify || duel) {
      window.history.replaceState({}, '', window.location.pathname)
    }

    if (duel) {
      setDuelCode(duel.toUpperCase())
    }

    if (reset) {
      setResetToken(reset)
      setShowAuth(true)
      setBootstrapping(false)
      return
    }

    if (verify) {
      verifyEmail(verify)
        .then((res) => {
          setToken(res.token)
          setUser(res.user)
          setProgress({ ...emptyProgress(), ...res.progress })
          setBanner(res.message || 'E-mail confirmado!')
        })
        .catch((err) => {
          setBanner((err as Error).message)
          setShowAuth(true)
        })
        .finally(() => setBootstrapping(false))
      return
    }

    const token = getToken()
    if (!token) {
      if (duel) {
        setPendingDuel(true)
        setShowAuth(true)
      }
      setBootstrapping(false)
      return
    }
    fetchMe()
      .then((res) => {
        setUser(res.user)
        setProgress({ ...emptyProgress(), ...res.progress })
        setDailyPlayedToday(res.dailyPlayedToday)
        setCastPlayedToday(Boolean(res.castPlayedToday))
        if (duel) setScreen('duel')
      })
      .catch(() => {
        setToken(null)
        setUser(null)
        if (duel) {
          setPendingDuel(true)
          setShowAuth(true)
        }
      })
      .finally(() => setBootstrapping(false))
  }, [])

  function goHome() {
    setScreen('hub')
    setDuelCode(null)
    setPlayDate(null)
  }

  function openMode(
    next: GameMode | 'cast-endless' | 'character',
    date?: string,
  ) {
    // Guest pode jogar; só duelo exige conta
    setPlayDate(date || null)
    if (next === 'cast') {
      setScreen('cast')
      return
    }
    if (next === 'cast-endless') {
      setPlayDate(null)
      setScreen('cast-endless')
      return
    }
    if (next === 'character') {
      setScreen('character')
      return
    }
    setMode(next)
    setScreen('play')
  }

  function openDuel() {
    if (!user) {
      setPendingDuel(true)
      setShowAuth(true)
      return
    }
    setScreen('duel')
  }

  function logout() {
    setToken(null)
    setUser(null)
    setProgress(emptyProgress())
    setDailyPlayedToday(false)
    setCastPlayedToday(false)
    setScreen('hub')
    setDuelCode(null)
  }

  if (bootstrapping) {
    return (
      <div className="cinema-bg flex min-h-svh items-center justify-center text-cinema-muted">
        Carregando…
      </div>
    )
  }

  return (
    <div className="cinema-bg min-h-svh text-white">
      {banner ? (
        <div className="border-b border-cinema-line bg-black/60 px-4 py-2 text-center text-sm text-cinema-cyan">
          {banner}
          <button
            type="button"
            className="ml-3 text-cinema-muted underline"
            onClick={() => setBanner(null)}
          >
            fechar
          </button>
        </div>
      ) : null}

      <AppShell
        onHome={goHome}
        onAuth={() => setShowAuth(true)}
        onLogout={logout}
        loggedIn={Boolean(user)}
        username={user?.username}
        showFooter={screen === 'hub'}
      >
        {screen === 'hub' ? (
          <HubScreen
            user={user}
            progress={progress}
            onPlayDaily={(date) => openMode('daily', date)}
            onPlayCast={(date) => openMode('cast', date)}
            onPlayClassic={() => openMode('classic')}
            onPlayCastEndless={() => openMode('cast-endless')}
            onPlayCharacter={(date) => openMode('character', date)}
            onPlayDuel={openDuel}
            onOpenAuth={() => setShowAuth(true)}
          />
        ) : screen === 'duel' && user ? (
          <DuelScreen
            user={user}
            initialCode={duelCode}
            onBack={goHome}
          />
        ) : screen === 'character' ? (
          <CharacterScreen
            variant="daily"
            user={user}
            progress={progress}
            onProgress={(p) => setProgress({ ...emptyProgress(), ...p })}
            puzzleDate={playDate}
            onBack={goHome}
          />
        ) : screen === 'cast' || screen === 'cast-endless' ? (
          <CastScreen
            variant={screen === 'cast-endless' ? 'endless' : 'daily'}
            user={user}
            progress={progress}
            onProgress={(p) => setProgress({ ...emptyProgress(), ...p })}
            castPlayedToday={castPlayedToday}
            onCastPlayed={() => setCastPlayedToday(true)}
            puzzleDate={screen === 'cast' ? playDate : null}
            onBack={goHome}
          />
        ) : (
          <DailyScreen
            mode={mode === 'cast' ? 'daily' : mode}
            user={user}
            progress={progress}
            onProgress={(p) => setProgress({ ...emptyProgress(), ...p })}
            onDailyPlayed={() => setDailyPlayedToday(true)}
            dailyPlayedToday={dailyPlayedToday}
            puzzleDate={mode === 'daily' ? playDate : null}
            onBack={goHome}
          />
        )}
      </AppShell>

      {showAuth ? (
        <AuthModal
          resetToken={resetToken}
          initialMode={resetToken ? 'reset' : 'register'}
          onClose={() => {
            setShowAuth(false)
            setResetToken(null)
          }}
          onSuccess={(u, p) => {
            setUser(u)
            setProgress({ ...emptyProgress(), ...p })
            if (pendingDuel || duelCode) {
              setPendingDuel(false)
              setScreen('duel')
            }
          }}
        />
      ) : null}
    </div>
  )
}
