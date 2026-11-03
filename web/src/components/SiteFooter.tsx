type SiteFooterProps = {
  onAbout: () => void
}

export function SiteFooter({ onAbout }: SiteFooterProps) {
  return (
    <footer className="relative z-10 mt-auto px-4 pt-10 pb-8 text-center">
      <p className="font-display text-xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] sm:text-2xl">
        Ajude o CineBlitz
      </p>
      <p className="mt-1 text-xs text-cinema-muted drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
        Em breve: código de apoiador sem anúncios e modos extras
      </p>
      <a
        href="https://ko-fi.com"
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-sm font-bold text-cinema-gold underline-offset-2 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] hover:underline"
      >
        Apoiar (Ko-fi) →
      </a>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-[11px] text-cinema-muted drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] sm:gap-4">
        <button type="button" onClick={onAbout} className="hover:text-white">
          Sobre
        </button>
        <span className="opacity-40">·</span>
        <span>CineBlitz © {new Date().getFullYear()}</span>
        <span className="opacity-40">·</span>
        <span className="opacity-60">Privacidade (em breve)</span>
      </div>
    </footer>
  )
}
