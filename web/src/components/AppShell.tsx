import { useState, type ReactNode } from 'react'
import type { AuthUser } from '../auth'
import { AboutModal } from './AboutModal'
import { BugReportModal } from './BugReportModal'
import { ProfileModal } from './ProfileModal'
import { SideMenu } from './SideMenu'
import { SiteFooter } from './SiteFooter'

type AppShellProps = {
  children: ReactNode
  onHome: () => void
  onAuth?: () => void
  onLogout?: () => void
  onUserUpdate?: (user: AuthUser) => void
  loggedIn: boolean
  user?: AuthUser | null
  username?: string | null
  showFooter?: boolean
}

function avatarSrc(user?: AuthUser | null) {
  if (user?.avatarUrl) return user.avatarUrl
  const name = user?.username || 'U'
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a0a12&color=ffc44d&size=64&bold=true`
}

export function AppShell({
  children,
  onHome,
  onAuth,
  onLogout,
  onUserUpdate,
  loggedIn,
  user,
  username,
  showFooter = true,
}: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [bugOpen, setBugOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <div className="hub-stage flex min-h-svh flex-col">
      <header className="relative z-40 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center bg-transparent px-3 py-3 sm:px-4">
        <div />
        <button
          type="button"
          onClick={onHome}
          className="font-display text-3xl tracking-[0.08em] text-cinema-gold drop-shadow-[0_3px_0_#7a0c20] sm:text-4xl"
        >
          CINEBLITZ
        </button>
        <div className="flex items-center justify-end gap-2">
          {loggedIn ? (
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="flex max-w-[9.5rem] items-center gap-1.5 border border-cinema-gold/50 bg-black/30 py-1 pr-2 pl-1 text-left hover:border-cinema-gold sm:max-w-[12rem]"
              title="Meu perfil"
            >
              <img
                src={avatarSrc(user)}
                alt=""
                className="h-7 w-7 rounded-full object-cover"
              />
              <span className="truncate text-[11px] font-bold tracking-wide text-cinema-gold uppercase">
                @{username}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onAuth?.()}
              className="mode-btn mode-btn-primary mode-btn-inline px-3 py-1.5 font-display text-lg tracking-wide sm:px-4 sm:text-xl"
            >
              ENTRAR
            </button>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex items-center gap-2 border border-white/25 bg-transparent px-2.5 py-1.5 text-xs font-bold tracking-wide text-white uppercase hover:border-cinema-gold"
            aria-label="Abrir menu"
          >
            <span className="flex flex-col gap-0.5" aria-hidden>
              <span className="block h-0.5 w-4 bg-white" />
              <span className="block h-0.5 w-4 bg-white" />
              <span className="block h-0.5 w-4 bg-white" />
            </span>
            Menu
          </button>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>

      {showFooter ? (
        <div className="relative z-10">
          <SiteFooter onAbout={() => setAboutOpen(true)} />
        </div>
      ) : null}

      <SideMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onHome={onHome}
        onAbout={() => setAboutOpen(true)}
        onBug={() => setBugOpen(true)}
        onAuth={onAuth}
        onProfile={loggedIn ? () => setProfileOpen(true) : undefined}
        loggedIn={loggedIn}
        username={username}
        onLogout={onLogout}
      />

      {aboutOpen ? <AboutModal onClose={() => setAboutOpen(false)} /> : null}
      {bugOpen ? <BugReportModal onClose={() => setBugOpen(false)} /> : null}
      {profileOpen && user ? (
        <ProfileModal
          user={user}
          onClose={() => setProfileOpen(false)}
          onSaved={(u) => {
            onUserUpdate?.(u)
          }}
        />
      ) : null}
    </div>
  )
}
