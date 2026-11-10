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
import { ProfileScreen } from './screens/ProfileScreen'
import { OscarsScreen } from './screens/OscarsScreen'
import { ProfilesBrowseScreen } from './screens/ProfilesBrowseScreen'
import { WhoAmIScreen } from './screens/WhoAmIScreen'
import { KeywordsScreen } from './screens/KeywordsScreen'
import { AchievementToastHost } from './components/AchievementToast'
import type { DailyNavMode, DailyPlayedMap } from './components/DailyModeNav'
import { todayBRT, yesterdayOf } from './components/DayCalendarModal'
import type { Achievement } from './api'
import { AdminScreen } from './screens/AdminScreen'

const EMPTY_DAILY_PLAYED: DailyPlayedMap = {
  daily: false,
  cast: false,
  character: false,
  keywords: false,
  whoami: false,
}

type Screen =
  | 'hub'
  | 'play'
  | 'cast'
  | 'cast-endless'
  | 'character'
  | 'whoami'
  | 'whoami-endless'
  | 'keywords'
  | 'duel'
  | 'profile'
  | 'profiles'
  | 'oscars'
  | 'admin'

export default function App() {
  const [screen, setScreen] = useState<Screen>('hub')
  const [mode, setMode] = useState<GameMode>('daily')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [progress, setProgress] = useState<ProgressMap>(emptyProgress())
  const [dailyPlayedToday, setDailyPlayedToday] = useState(false)
  const [castPlayedToday, setCastPlayedToday] = useState(false)
  const [dailyPlayed, setDailyPlayed] = useState<DailyPlayedMap>(EMPTY_DAILY_PLAYED)
  const [showAuth, setShowAuth] = useState(false)
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [duelCode, setDuelCode] = useState<string | null>(null)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [banner, setBanner] = useState<string | null>(null)
  const [pendingDuel, setPendingDuel] = useState(false)
  const [playDate, setPlayDate] = useState<string | null>(null)
  const [profileUsername, setProfileUsername] = useState<string | null>(null)
  /** De onde abriu o perfil — Voltar volta pra lista, não pro hub */
  const [profileReturnTo, setProfileReturnTo] = useState<'hub' | 'profiles'>(
    'hub',
  )
  const [achToasts, setAchToasts] = useState<Achievement[]>([])

  function pushAchievements(list?: Achievement[] | null) {
    if (!list?.length) return
    setAchToasts((prev) => [...prev, ...list])
  }

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

    // Mantém sessão: só apaga token se for 401 (não em cold start / rede)
    async function restoreSession(attempt = 0): Promise<void> {
      try {
        const res = await fetchMe()
        setUser(res.user)
        setProgress({ ...emptyProgress(), ...res.progress })
        setDailyPlayedToday(res.dailyPlayedToday)
        setCastPlayedToday(Boolean(res.castPlayedToday))
        setDailyPlayed({
          daily: Boolean(res.dailyPlayedToday),
          cast: Boolean(res.castPlayedToday),
          character: Boolean(res.characterPlayedToday),
          keywords: Boolean(res.keywordsPlayedToday),
          whoami: Boolean(res.whoamiPlayedToday),
        })
        if (duel) setScreen('duel')
      } catch (err) {
        const msg = (err as Error).message || ''
        const unauthorized =
          /401|não autenticado|unauthorized|token|sessão/i.test(msg)
        if (!unauthorized && attempt < 2) {
          await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)))
          return restoreSession(attempt + 1)
        }
        if (unauthorized) {
          setToken(null)
          setUser(null)
        }
        if (duel) {
          setPendingDuel(true)
          setShowAuth(true)
        }
      }
    }

    void restoreSession().finally(() => setBootstrapping(false))
  }, [])

  function goHome() {
    setScreen('hub')
    setDuelCode(null)
    setPlayDate(null)
    setProfileUsername(null)
    setProfileReturnTo('hub')
  }

  function openProfile(
    username?: string | null,
    returnTo: 'hub' | 'profiles' = 'hub',
  ) {
    setProfileUsername(username || user?.username || null)
    setProfileReturnTo(returnTo)
    setScreen('profile')
  }

  function openBrowseProfiles() {
    setProfileUsername(null)
    setProfileReturnTo('hub')
    setScreen('profiles')
  }

  function backFromProfile() {
    if (profileReturnTo === 'profiles') {
      setProfileUsername(null)
      setScreen('profiles')
      return
    }
    goHome()
  }

  function openOscars() {
    setScreen('oscars')
  }

  function openAdmin() {
    if (!user?.isAdmin) return
    setScreen('admin')
  }

  function markDailyPlayed(modeKey: DailyNavMode) {
    setDailyPlayed((prev) =>
      prev[modeKey] ? prev : { ...prev, [modeKey]: true },
    )
    if (modeKey === 'daily') setDailyPlayedToday(true)
    if (modeKey === 'cast') setCastPlayedToday(true)
  }

  useEffect(() => {
    if (dailyPlayedToday) markDailyPlayed('daily')
    if (castPlayedToday) markDailyPlayed('cast')
  }, [dailyPlayedToday, castPlayedToday])

  function openMode(
    next:
      | GameMode
      | 'cast-endless'
      | 'character'
      | 'whoami-endless'
      | 'keywords',
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
    if (next === 'whoami') {
      setScreen('whoami')
      return
    }
    if (next === 'whoami-endless') {
      setPlayDate(null)
      setScreen('whoami-endless')
      return
    }
    if (next === 'keywords') {
      setScreen('keywords')
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
    setDailyPlayed(EMPTY_DAILY_PLAYED)
    setScreen('hub')
    setDuelCode(null)
    setProfileUsername(null)
    setProfileReturnTo('hub')
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
        onProfile={() => openProfile(user?.username)}
        onBrowseProfiles={openBrowseProfiles}
        onOscars={openOscars}
        onRanking={() => {
          window.setTimeout(() => {
            document
              .getElementById('hall-da-fama')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }, 50)
        }}
        onAdmin={openAdmin}
        loggedIn={Boolean(user)}
        user={user}
        username={user?.username}
        showFooter={screen === 'hub'}
        navActive={
          screen === 'oscars'
            ? 'achievements'
            : screen === 'hub'
              ? 'play'
              : 'play'
        }
      >
        {screen === 'admin' && user?.isAdmin ? (
          <AdminScreen user={user} onBack={goHome} />
        ) : screen === 'hub' ? (
          <HubScreen
            user={user}
            progress={progress}
            onPlayDaily={(date) => openMode('daily', date)}
            onPlayCast={(date) => openMode('cast', date)}
            onPlayClassic={() => openMode('classic')}
            onPlayCastEndless={() => openMode('cast-endless')}
            onPlayCharacter={(date) => openMode('character', date)}
            onPlayWhoami={(date) => openMode('whoami', date)}
            onPlayWhoamiEndless={() => openMode('whoami-endless')}
            onPlayKeywords={(date) => openMode('keywords', date)}
            onPlayDuel={openDuel}
            onOpenAuth={() => setShowAuth(true)}
            onOpenProfile={(uname) => openProfile(uname)}
          />
        ) : screen === 'profile' ? (
          <ProfileScreen
            username={profileUsername}
            viewer={user}
            onBack={backFromProfile}
            onOpenOscars={openOscars}
            onSaved={(u) => {
              setUser(u)
              setProfileUsername(u.username)
            }}
          />
        ) : screen === 'profiles' ? (
          <ProfilesBrowseScreen
            onBack={goHome}
            onOpenProfile={(uname) => openProfile(uname, 'profiles')}
          />
        ) : screen === 'oscars' ? (
          <OscarsScreen onBack={goHome} />
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
            onAchievements={pushAchievements}
            puzzleDate={playDate}
            onBack={goHome}
            onPickArchiveDate={(date) => openMode('character', date)}
            modeNav={{
              active: 'character',
              played: dailyPlayed,
              onSelect: (m) => openMode(m),
            }}
            onDailyModePlayed={() => markDailyPlayed('character')}
          />
        ) : screen === 'whoami' || screen === 'whoami-endless' ? (
          <WhoAmIScreen
            variant={screen === 'whoami-endless' ? 'endless' : 'daily'}
            user={user}
            progress={progress}
            onProgress={(p) => setProgress({ ...emptyProgress(), ...p })}
            onAchievements={pushAchievements}
            puzzleDate={screen === 'whoami' ? playDate : null}
            onBack={goHome}
            onPlayEndless={() => openMode('whoami-endless')}
            onPickArchiveDate={(date) => openMode('whoami', date)}
            modeNav={
              screen === 'whoami'
                ? {
                    active: 'whoami',
                    played: dailyPlayed,
                    onSelect: (m) => openMode(m),
                  }
                : null
            }
            onDailyModePlayed={() => markDailyPlayed('whoami')}
          />
        ) : screen === 'keywords' ? (
          <KeywordsScreen
            user={user}
            progress={progress}
            onProgress={(p) => setProgress({ ...emptyProgress(), ...p })}
            onAchievements={pushAchievements}
            puzzleDate={playDate}
            onBack={goHome}
            onPickArchiveDate={(date) => openMode('keywords', date)}
            modeNav={{
              active: 'keywords',
              played: dailyPlayed,
              onSelect: (m) => openMode(m),
            }}
            onDailyModePlayed={() => markDailyPlayed('keywords')}
          />
        ) : screen === 'cast' || screen === 'cast-endless' ? (
          <CastScreen
            variant={screen === 'cast-endless' ? 'endless' : 'daily'}
            user={user}
            progress={progress}
            onProgress={(p) => setProgress({ ...emptyProgress(), ...p })}
            onAchievements={pushAchievements}
            castPlayedToday={castPlayedToday}
            onCastPlayed={() => markDailyPlayed('cast')}
            puzzleDate={screen === 'cast' ? playDate : null}
            onBack={goHome}
            onPlayYesterday={() =>
              openMode('cast', yesterdayOf(todayBRT()))
            }
            onPlayEndless={() => openMode('cast-endless')}
            onPickArchiveDate={(date) => openMode('cast', date)}
            modeNav={
              screen === 'cast'
                ? {
                    active: 'cast',
                    played: dailyPlayed,
                    onSelect: (m) => openMode(m),
                  }
                : null
            }
          />
        ) : (
          <DailyScreen
            mode={mode === 'cast' ? 'daily' : mode}
            user={user}
            progress={progress}
            onProgress={(p) => setProgress({ ...emptyProgress(), ...p })}
            onAchievements={pushAchievements}
            onDailyPlayed={() => markDailyPlayed('daily')}
            dailyPlayedToday={dailyPlayedToday}
            puzzleDate={mode === 'daily' ? playDate : null}
            onBack={goHome}
            onPlayYesterday={() =>
              openMode('daily', yesterdayOf(todayBRT()))
            }
            onPlayEndless={() => openMode('classic')}
            onPickArchiveDate={(date) => openMode('daily', date)}
            modeNav={
              mode === 'daily'
                ? {
                    active: 'daily',
                    played: dailyPlayed,
                    onSelect: (m) => openMode(m),
                  }
                : null
            }
          />
        )}
      </AppShell>

      <AchievementToastHost
        queue={achToasts}
        onConsumed={() => setAchToasts((prev) => prev.slice(1))}
      />

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
