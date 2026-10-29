type SideMenuProps = {
  open: boolean
  onClose: () => void
  onHome: () => void
  onAbout: () => void
  onBug: () => void
  onAuth?: () => void
  loggedIn: boolean
  username?: string | null
  onLogout?: () => void
}

export function SideMenu({
  open,
  onClose,
  onHome,
  onAbout,
  onBug,
  onAuth,
  loggedIn,
  username,
  onLogout,
}: SideMenuProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Fechar menu"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-[min(100%,20rem)] flex-col border-r border-cinema-line bg-[#140b18] shadow-2xl">
        <div className="flex items-center justify-between border-b border-cinema-line px-4 py-3">
          <p className="text-[11px] font-bold tracking-[0.3em] text-cinema-muted uppercase">
            Menu
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-xl text-cinema-muted hover:text-white"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
          {loggedIn ? (
            <p className="mb-2 px-2 text-xs text-cinema-gold">@{username}</p>
          ) : (
            <MenuRow
              label="Entrar"
              onClick={() => {
                onClose()
                onAuth?.()
              }}
            />
          )}
          <MenuRow
            label="Início"
            active
            onClick={() => {
              onHome()
              onClose()
            }}
          />

          <div className="my-2 border-t border-cinema-line" />

          <MenuRow label="Sons" badge="em breve" disabled />
          <MenuRow label="Óscares" badge="em breve" disabled />
          <MenuRow label="Código apoiador" badge="em breve" disabled />

          <div className="my-2 border-t border-cinema-line" />

          <MenuRow
            label="Configurações"
            badge="em breve"
            disabled
          />
          <MenuRow
            label="Relatório de erro"
            onClick={() => {
              onClose()
              onBug()
            }}
          />
          <MenuRow
            label="Sobre"
            onClick={() => {
              onClose()
              onAbout()
            }}
          />

          {loggedIn && onLogout ? (
            <>
              <div className="my-2 border-t border-cinema-line" />
              <MenuRow
                label="Sair"
                onClick={() => {
                  onClose()
                  onLogout()
                }}
              />
            </>
          ) : null}
        </nav>
      </aside>
    </div>
  )
}

function MenuRow({
  label,
  onClick,
  active,
  disabled,
  badge,
}: {
  label: string
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  badge?: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-sm px-3 py-2.5 text-left text-sm font-semibold transition ${
        active
          ? 'bg-[#2a1520] text-white'
          : disabled
            ? 'text-cinema-muted/50'
            : 'text-white/90 hover:bg-[#2a1520]'
      }`}
    >
      <span>{label}</span>
      {badge ? (
        <span className="text-[9px] font-bold tracking-wide text-cinema-gold uppercase">
          {badge}
        </span>
      ) : null}
    </button>
  )
}
