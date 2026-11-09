/** Estágios estilo Gamedle: detalhe → corpo inteiro */

export type CropStage = {
  label: string
  x: number
  y: number
  zoom: number
}

export const CHARACTER_STAGES: CropStage[] = [
  { label: 'Pernas', x: 50, y: 92, zoom: 4.2 },
  { label: 'Mão', x: 72, y: 62, zoom: 3.4 },
  { label: 'Cabelo', x: 50, y: 8, zoom: 3.4 },
  { label: 'Busto', x: 50, y: 38, zoom: 1.7 },
  { label: 'Rosto', x: 50, y: 22, zoom: 2.6 },
  { label: 'Completo', x: 50, y: 50, zoom: 1 },
]

export const CHARACTER_MAX_TAKE = CHARACTER_STAGES.length

/** Overrides legados: só enquadramento. Labels sempre genéricos. */
const STAGE_OVERRIDES: Record<string, Partial<Record<number, Partial<CropStage>>>> =
  {
    'tubarao.jpg': {
      0: { x: 58, y: 70, zoom: 3.8 },
      1: { x: 35, y: 55, zoom: 3.2 },
      4: { x: 55, y: 35, zoom: 2.8 },
    },
    'herbert-west.jpg': {
      0: { x: 50, y: 78, zoom: 3.2 },
      1: { x: 78, y: 42, zoom: 3.6 },
      2: { x: 48, y: 12, zoom: 3.4 },
      4: { x: 50, y: 28, zoom: 2.8 },
    },
  }

type CharacterCropProps = {
  src: string
  /** 0-based stage while guessing */
  stage: number
  /** vitória / fim: mostra inteiro */
  reveal?: boolean
  /** Crops vindos da API; se omitido, usa defaults + overrides por arquivo */
  stages?: CropStage[] | null
}

function fileKey(src: string) {
  const clean = src.split('?')[0] || src
  const parts = clean.split('/')
  return parts[parts.length - 1] || ''
}

function resolveStage(
  src: string,
  idx: number,
  stages?: CropStage[] | null,
): CropStage {
  const base = CHARACTER_STAGES[idx] || CHARACTER_STAGES[CHARACTER_STAGES.length - 1]
  if (stages && stages[idx]) {
    const s = stages[idx]
    return {
      label: base.label,
      x: Number.isFinite(s.x) ? s.x : base.x,
      y: Number.isFinite(s.y) ? s.y : base.y,
      zoom: Number.isFinite(s.zoom) ? s.zoom : base.zoom,
    }
  }
  const over = STAGE_OVERRIDES[fileKey(src)]?.[idx]
  return {
    label: base.label,
    x: over?.x ?? base.x,
    y: over?.y ?? base.y,
    zoom: over?.zoom ?? base.zoom,
  }
}

export function CharacterCrop({
  src,
  stage,
  reveal = false,
  stages = null,
}: CharacterCropProps) {
  const max = stages?.length || CHARACTER_STAGES.length
  const idx = reveal
    ? max - 1
    : Math.min(Math.max(stage, 0), max - 1)
  const s = resolveStage(src, idx, stages)
  const position = `${s.x}% ${s.y}%`
  const fullFrame = reveal || s.zoom <= 1

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#050308]">
      <img
        src={src}
        alt=""
        data-role="crop-img"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        className={`pointer-events-none h-full w-full select-none [-webkit-user-drag:none] ${
          fullFrame ? 'object-contain' : 'object-cover'
        }`}
        style={
          fullFrame
            ? undefined
            : {
                objectPosition: position,
                transform: `scale(${s.zoom})`,
                transformOrigin: position,
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
