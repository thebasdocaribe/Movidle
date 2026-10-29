import { useState, type ReactNode } from 'react'
import { AboutModal } from './AboutModal'
import { BugReportModal } from './BugReportModal'
import { SideMenu } from './SideMenu'
import { SiteFooter } from './SiteFooter'

type AppShellProps = {
  children: ReactNode
  onHome: () => void
  onAuth?: () => void
  onLogout?: () => void
  loggedIn: boolean
  username?: string | null
  showFooter?: boolean
}

export function AppShell({
  children,
  onHome,
  onAuth,
  onLogout,
  loggedIn,
  username,
  showFooter = true,
}: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [bugOpen, setBugOpen] = useState(false)

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
        <div className="flex justify-end">
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
        loggedIn={loggedIn}
        username={username}
        onLogout={onLogout}
      />

      {aboutOpen ? <AboutModal onClose={() => setAboutOpen(false)} /> : null}
      {bugOpen ? <BugReportModal onClose={() => setBugOpen(false)} /> : null}
    </div>
  )
}
