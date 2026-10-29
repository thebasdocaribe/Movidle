type SiteFooterProps = {
  onAbout: () => void
}

export function SiteFooter({ onAbout }: SiteFooterProps) {
  return (
    <footer className="mt-auto border-t border-cinema-line/60 bg-black/40 px-4 py-6 text-center">
      <p className="font-display text-xl text-white">Ajude o CineBlitz</p>
      <p className="mt-1 text-xs text-cinema-muted">
        Em breve: código de apoiador sem anúncios e modos extras
      </p>
      <a
        href="https://ko-fi.com"
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-sm font-bold text-cinema-gold underline-offset-2 hover:underline"
      >
        Apoiar (Ko-fi) →
      </a>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[11px] text-cinema-muted">
        <button
          type="button"
          onClick={onAbout}
          className="hover:text-white"
        >
          Sobre
        </button>
        <span>·</span>
        <span>CineBlitz © {new Date().getFullYear()}</span>
        <span>·</span>
        <span className="opacity-60">Privacidade (em breve)</span>
      </div>
    </footer>
  )
}
