import { useMemo, useState, type ReactNode } from 'react'
import type { AuthUser } from '../auth'
import { curiosityOfWeek } from '../data/curiosities'
import { AboutModal } from './AboutModal'
import { BugReportModal } from './BugReportModal'
import { SideMenu } from './SideMenu'
import { SiteFooter } from './SiteFooter'

export type AppShellNav = 'play' | 'ranking' | 'achievements' | 'settings'

type AppShellProps = {
  children: ReactNode
  onHome: () => void
  onAuth?: () => void
  onLogout?: () => void
  onProfile?: () => void
  onBrowseProfiles?: () => void
  onOscars?: () => void
  onRanking?: () => void
  onAdmin?: () => void
  loggedIn: boolean
  user?: AuthUser | null
  username?: string | null
  showFooter?: boolean
  /** Aba ativa do header (só hub / oscars costumam destacar). */
  navActive?: AppShellNav
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
  onProfile,
  onBrowseProfiles,
  onOscars,
  onRanking,
  onAdmin,
  loggedIn,
  user,
  username,
  showFooter = true,
  navActive = 'play',
}: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [bugOpen, setBugOpen] = useState(false)
  const curiosity = useMemo(() => curiosityOfWeek(), [])
  const [logoOk, setLogoOk] = useState(true)

  return (
    <div className="hub-stage flex min-h-svh flex-col">
      <header className="relative z-40 shrink-0 border-b border-cinema-line/40 bg-black/25 px-3 py-2.5 backdrop-blur-[2px] sm:px-4">
        <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onHome}
            className="flex min-w-0 items-center gap-2 text-left"
            title="CineBlitz"
          >
            {logoOk ? (
              <img
                src="/hub/logo-mark.webp"
                alt=""
                className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10"
                onError={() => setLogoOk(false)}
              />
            ) : (
              <span className="hub-logo-fallback shrink-0" aria-hidden>
                <LogoReel />
              </span>
            )}
            <span className="min-w-0">
              <span className="font-display block text-2xl leading-none tracking-[0.06em] text-cinema-gold drop-shadow-[0_2px_0_#7a0c20] sm:text-3xl">
                CINEBLITZ
              </span>
              <span className="mt-0.5 hidden text-[9px] font-bold tracking-[0.12em] text-cinema-muted uppercase sm:block">
                Teste seus conhecimentos sobre cinema
              </span>
            </span>
          </button>

          <nav className="hidden justify-center md:flex">
            <div className="hub-topnav">
              <TopNavItem
                label="Jogar"
                active={navActive === 'play'}
                onClick={onHome}
                icon={<NavHome />}
              />
              <TopNavItem
                label="Ranking"
                active={navActive === 'ranking'}
                onClick={() => {
                  onHome()
                  onRanking?.()
                }}
                icon={<NavRank />}
              />
              <TopNavItem
                label="Conquistas"
                active={navActive === 'achievements'}
                onClick={() => onOscars?.()}
                icon={<NavTrophy />}
              />
              <TopNavItem
                label="Configurações"
                active={navActive === 'settings'}
                onClick={() => setMenuOpen(true)}
                icon={<NavGear />}
              />
            </div>
          </nav>

          <div className="flex items-center justify-end gap-2">
            {loggedIn ? (
              <button
                type="button"
                onClick={() => onProfile?.()}
                className="flex max-w-[9.5rem] items-center gap-1.5 border border-cinema-gold/50 bg-black/35 py-1 pr-2 pl-1 text-left hover:border-cinema-gold sm:max-w-[13rem]"
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
        </div>

        {showFooter && curiosity ? (
          <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] leading-snug text-white/80 sm:text-[12px]">
            <span className="font-bold tracking-wide text-cinema-gold uppercase">
              Curiosidade ·{' '}
            </span>
            {curiosity}
          </p>
        ) : null}
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
        onProfile={loggedIn ? onProfile : undefined}
        onBrowseProfiles={onBrowseProfiles}
        onOscars={onOscars}
        onAdmin={onAdmin}
        isAdmin={Boolean(user?.isAdmin)}
        loggedIn={loggedIn}
        onLogout={onLogout}
      />

      {aboutOpen ? <AboutModal onClose={() => setAboutOpen(false)} /> : null}
      {bugOpen ? <BugReportModal onClose={() => setBugOpen(false)} /> : null}
    </div>
  )
}

function TopNavItem({
  label,
  active,
  onClick,
  icon,
}: {
  label: string
  active?: boolean
  onClick: () => void
  icon: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`hub-topnav-item ${active ? 'hub-topnav-item-active' : ''}`}
    >
      <span className="hub-topnav-ico">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function LogoReel() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden>
      <circle cx="18" cy="18" r="15" stroke="#ffc44d" strokeWidth="2" />
      <circle cx="18" cy="18" r="3.5" fill="#ffc44d" />
      <circle cx="18" cy="8.5" r="2" fill="#ffc44d" />
      <circle cx="18" cy="27.5" r="2" fill="#ffc44d" />
      <circle cx="8.5" cy="18" r="2" fill="#ffc44d" />
      <circle cx="27.5" cy="18" r="2" fill="#ffc44d" />
    </svg>
  )
}

function NavHome() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M4.5 11.2 12 4.8l7.5 6.4V19a1.2 1.2 0 0 1-1.2 1.2h-4.1v-5.2h-4.4V20.2H5.7A1.2 1.2 0 0 1 4.5 19v-7.8z"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function NavRank() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 19V12M12 19V6M18 19v-5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  )
}

function NavTrophy() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 4h8v3.8a4 4 0 0 1-8 0V4zM8 6.2H5.7A2.3 2.3 0 0 0 8 9.3M16 6.2h2.3A2.3 2.3 0 0 1 16 9.3M12 11.8V14M9.4 19.2h5.2M10.2 14h3.6v2.4a1.8 1.8 0 0 1-1.8 1.8h0a1.8 1.8 0 0 1-1.8-1.8V14z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function NavGear() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 3.4v2.3M12 18.3v2.3M3.4 12h2.3M18.3 12h2.3M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}
