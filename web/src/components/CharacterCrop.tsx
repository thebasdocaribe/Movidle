/** Estágios estilo Gamedle: detalhe → corpo inteiro */
export const CHARACTER_STAGES = [
  { label: 'Pernas', position: '50% 92%', zoom: 4.2 },
  // Mão/antebraço na faixa média-baixa (evita canto vazio do frame)
  { label: 'Mão', position: '72% 62%', zoom: 3.4 },
  { label: 'Cabelo', position: '50% 8%', zoom: 3.4 },
  { label: 'Rosto', position: '50% 22%', zoom: 2.6 },
  { label: 'Busto', position: '50% 38%', zoom: 1.7 },
  { label: 'Completo', position: '50% 50%', zoom: 1 },
] as const

export const CHARACTER_MAX_TAKE = CHARACTER_STAGES.length

/** Overrides por arquivo (ex.: Jaws → “pernas” na barbatana). */
const STAGE_OVERRIDES: Record<
  string,
  Partial<Record<number, { label?: string; position: string; zoom: number }>>
> = {
  'tubarao.jpg': {
    0: { label: 'Barbatana', position: '58% 70%', zoom: 3.8 },
    1: { label: 'Nadadeira', position: '35% 55%', zoom: 3.2 },
    3: { label: 'Boca', position: '55% 35%', zoom: 2.8 },
  },
}

type CharacterCropProps = {
  src: string
  /** 0-based stage while guessing */
  stage: number
  /** vitória / fim: mostra inteiro */
  reveal?: boolean
}

function fileKey(src: string) {
  const clean = src.split('?')[0] || src
  const parts = clean.split('/')
  return parts[parts.length - 1] || ''
}

export function CharacterCrop({ src, stage, reveal = false }: CharacterCropProps) {
  const idx = reveal
    ? CHARACTER_STAGES.length - 1
    : Math.min(Math.max(stage, 0), CHARACTER_STAGES.length - 1)
  const base = CHARACTER_STAGES[idx]
  const over = STAGE_OVERRIDES[fileKey(src)]?.[idx]
  const s = {
    label: over?.label || base.label,
    position: over?.position || base.position,
    zoom: over?.zoom ?? base.zoom,
  }
  const fullFrame = reveal || s.zoom <= 1

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#050308]">
      <img
        src={src}
        alt=""
        draggable={false}
        className={`pointer-events-none h-full w-full select-none ${
          fullFrame ? 'object-contain' : 'object-cover'
        }`}
        style={
          fullFrame
            ? undefined
            : {
                objectPosition: s.position,
                transform: `scale(${s.zoom})`,
                transformOrigin: s.position,
              }
        }
      />
      {!reveal ? (
        <p className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold tracking-wide text-cinema-gold uppercase">
          {s.label}
        </p>
      ) : null}
    </div>
  )
}
