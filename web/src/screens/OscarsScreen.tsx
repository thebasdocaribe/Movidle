import {
  formatRarity,
  OSCAR_PLACEHOLDERS,
  type OscarDef,
} from '../data/oscars'

type OscarsScreenProps = {
  onBack: () => void
}

export function OscarsScreen({ onBack }: OscarsScreenProps) {
  const list = OSCAR_PLACEHOLDERS
  const unlocked = list.filter((o) => o.unlocked).length
  const total = list.length
  const overallPct = total > 0 ? Math.round((unlocked / total) * 100) : 0

  return (
    <div className="min-h-0 flex-1">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="border border-cinema-line px-2 py-1 text-xs text-cinema-gold"
          >
            ← Voltar
          </button>
          <h1 className="font-display text-3xl tracking-wide text-cinema-gold sm:text-4xl">
            ÓSCARES
          </h1>
          <span className="w-14" />
        </div>

        <section className="panel-frame px-4 py-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold tracking-[0.22em] text-cinema-muted uppercase">
                Sua estante
              </p>
              <p className="font-display text-2xl text-white sm:text-3xl">
                {unlocked}
                <span className="text-cinema-muted"> / {total}</span>
              </p>
            </div>
            <p className="text-xs text-cinema-muted">
              <span className="font-bold text-cinema-gold">{overallPct}%</span>{' '}
              desbloqueado
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden border border-cinema-line/80 bg-black/50">
            <div
              className="h-full bg-gradient-to-r from-cinema-red to-cinema-gold transition-[width]"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-cinema-muted/80">
            Placeholders · unlock real em breve
          </p>
        </section>

        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((oscar) => (
            <li key={oscar.id}>
              <OscarCard oscar={oscar} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function OscarCard({ oscar }: { oscar: OscarDef }) {
  const locked = !oscar.unlocked
  const secret = !oscar.description
  const progressPct =
    oscar.progress && oscar.progress.max > 0
      ? Math.min(100, (oscar.progress.current / oscar.progress.max) * 100)
      : 0

  return (
    <article
      className={`flex h-full gap-3 border px-3 py-3 ${
        locked
          ? 'border-cinema-line/70 bg-black/35'
          : 'border-cinema-gold/55 bg-cinema-gold/10'
      }`}
    >
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center border text-xl font-bold ${
          locked
            ? 'border-cinema-line bg-[#0a060c] text-cinema-gold/60'
            : 'border-cinema-gold bg-cinema-gold/15 text-cinema-gold'
        }`}
        aria-hidden
      >
        {oscar.icon}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-display text-xl leading-none tracking-wide text-white">
            {oscar.title}
          </h2>
          {locked ? (
            <span className="shrink-0 border border-cinema-line/80 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-cinema-muted uppercase">
              Locked
            </span>
          ) : (
            <span className="shrink-0 border border-cinema-gold/60 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-cinema-gold uppercase">
              Won
            </span>
          )}
        </div>

        {secret ? (
          <p className="mt-1 text-[11px] text-cinema-muted italic">
            Conquista secreta
          </p>
        ) : (
          <p className="mt-1 text-[12px] leading-snug text-cinema-muted">
            {oscar.description}
          </p>
        )}

        {oscar.progress ? (
          <div className="mt-2.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-[9px] font-bold tracking-[0.18em] text-cinema-cyan uppercase">
                Seu progresso
              </p>
              <p className="text-[10px] font-semibold text-cinema-muted">
                {oscar.progress.current}/{oscar.progress.max}
              </p>
            </div>
            <div className="h-1.5 overflow-hidden bg-black/55">
              <div
                className="h-full bg-cinema-cyan transition-[width]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="mt-auto flex justify-end pt-2.5">
          <p
            className="inline-flex items-center gap-1.5 border border-cinema-line/90 bg-black/40 px-2 py-1 text-[10px] text-cinema-muted"
            title="Porcentagem estimada de jogadores que já desbloquearam"
          >
            <span
              className="font-bold tracking-[0.14em] text-cinema-gold/90 uppercase"
              aria-hidden
            >
              Comunidade
            </span>
            <span className="text-cinema-line">·</span>
            <span className="font-semibold text-white">
              {formatRarity(oscar.rarityPct)}
            </span>
            <span className="text-cinema-muted">já têm</span>
          </p>
        </div>
      </div>
    </article>
  )
}
