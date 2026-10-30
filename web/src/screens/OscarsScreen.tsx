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

        <div className="text-center">
          <div className="mx-auto mb-2 flex max-w-xs items-center gap-3">
            <span className="h-px flex-1 bg-cinema-line" />
            <p className="text-[11px] font-bold tracking-[0.25em] text-cinema-muted uppercase">
              Conquistas
            </p>
            <span className="h-px flex-1 bg-cinema-line" />
          </div>
          <p className="text-sm text-cinema-muted">
            Desbloqueadas{' '}
            <span className="font-bold text-cinema-gold">{unlocked}</span>
            {' / '}
            <span className="font-bold text-cinema-gold">{total}</span>
          </p>
          <p className="mt-1 text-[11px] text-cinema-muted/80">
            Placeholders · lógica de unlock em breve
          </p>
        </div>

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
  const pct =
    oscar.progress && oscar.progress.max > 0
      ? Math.min(100, (oscar.progress.current / oscar.progress.max) * 100)
      : 0

  return (
    <article
      className={`flex gap-3 border px-3 py-3 ${
        locked
          ? 'border-cinema-line/70 bg-black/35 opacity-80'
          : 'border-cinema-gold/50 bg-cinema-gold/10'
      }`}
    >
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center border text-xl font-bold ${
          locked
            ? 'border-cinema-line bg-[#0a060c] text-cinema-gold/70'
            : 'border-cinema-gold bg-cinema-gold/15 text-cinema-gold'
        }`}
        aria-hidden
      >
        {oscar.icon}
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="font-display text-xl leading-none tracking-wide text-white">
          {oscar.title}
        </h2>
        {secret ? (
          <p className="mt-1 text-[11px] text-cinema-muted italic">Secreta</p>
        ) : (
          <p className="mt-1 text-[12px] leading-snug text-cinema-muted">
            {oscar.description}
          </p>
        )}

        {oscar.progress ? (
          <div className="mt-2">
            <div className="h-1.5 w-full overflow-hidden bg-black/50">
              <div
                className="h-full bg-cinema-gold transition-[width]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-cinema-muted">
              {oscar.progress.current} / {oscar.progress.max}
            </p>
          </div>
        ) : null}

        <p className="mt-2 flex items-center justify-end gap-1 text-[10px] text-cinema-muted">
          <span aria-hidden className="opacity-70">
            ⌂
          </span>
          {formatRarity(oscar.rarityPct)}
        </p>
      </div>
    </article>
  )
}
