import { useEffect, useState } from 'react'
import { fetchMe, verifyEmail, type GameMode } from './api'
import {
  emptyProgress,
  getToken,
  setToken,
  type AuthUser,
  type ProgressMap,
} from './auth'
import { AuthModal } from './components/AuthModal'
import { DailyScreen } from './screens/DailyScreen'
import { DuelScreen } from './screens/DuelScreen'
import { HubScreen } from './screens/HubScreen'

type Screen = 'hub' | 'play' | 'duel'

export default function App() {
  const [screen, setScreen] = useState<Screen>('hub')
  const [mode, setMode] = useState<GameMode>('daily')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [progress, setProgress] = useState<ProgressMap>(emptyProgress())
  const [dailyPlayedToday, setDailyPlayedToday] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [duelCode, setDuelCode] = useState<string | null>(null)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [banner, setBanner] = useState<string | null>(null)
  const [pendingDuel, setPendingDuel] = useState(false)

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
          setProgress(res.progress)
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
        setProgress(res.progress)
        setDailyPlayedToday(res.dailyPlayedToday)
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

  function openMode(next: GameMode) {
    if (!user) {
      setShowAuth(true)
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

      {screen === 'hub' ? (
        <HubScreen
          user={user}
          progress={progress}
          onPlayDaily={() => openMode('daily')}
          onPlayClassic={() => openMode('classic')}
          onPlayDuel={openDuel}
          onOpenAuth={() => setShowAuth(true)}
          onLogout={logout}
        />
      ) : screen === 'duel' && user ? (
        <DuelScreen
          user={user}
          initialCode={duelCode}
          onBack={() => {
            setScreen('hub')
            setDuelCode(null)
          }}
        />
      ) : (
        <DailyScreen
          mode={mode}
          user={user}
          progress={progress}
          onProgress={setProgress}
          onDailyPlayed={() => setDailyPlayedToday(true)}
          dailyPlayedToday={dailyPlayedToday}
          onBack={() => setScreen('hub')}
          onNeedAuth={() => setShowAuth(true)}
        />
      )}

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
            setProgress(p)
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
