type AboutModalProps = {
  onClose: () => void
}

export function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4">
      <div
        role="dialog"
        aria-labelledby="about-title"
        className="panel-frame relative w-full max-w-md border-cinema-gold/50 bg-[#120a12] p-5"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center border border-cinema-red bg-cinema-red text-white"
          aria-label="Fechar"
        >
          ×
        </button>
        <h2
          id="about-title"
          className="font-display pr-10 text-3xl text-cinema-gold"
        >
          Sobre
        </h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-cinema-muted">
          <p className="text-white">
            CineBlitz é um jogo de adivinhar o filme — diário, infinito, elenco e
            duelo 1v1. Inspirado em Wordle, Framed e derivados.
          </p>
          <p>
            Clipes e pôsteres usam material em domínio público ou marcado para
            revisão. Direitos pertencem aos respectivos titulares.
          </p>
          <p>
            Feito pra jogar rápido com amigos. Feedback e bugs: use o menu →
            Relatório de erro.
          </p>
        </div>
      </div>
    </div>
  )
}
