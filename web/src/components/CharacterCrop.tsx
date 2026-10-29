/** Estágios estilo Gamedle: detalhe → rosto → corpo inteiro */
export const CHARACTER_STAGES = [
  { label: 'Pés', position: '50% 95%', zoom: 4.2 },
  { label: 'Braço', position: '12% 55%', zoom: 3.6 },
  { label: 'Cabelo', position: '50% 6%', zoom: 3.4 },
  { label: 'Rosto', position: '50% 22%', zoom: 2.6 },
  { label: 'Busto', position: '50% 35%', zoom: 1.7 },
  { label: 'Completo', position: '50% 50%', zoom: 1 },
] as const

export const CHARACTER_MAX_TAKE = CHARACTER_STAGES.length

type CharacterCropProps = {
  src: string
  /** 0-based stage while guessing */
  stage: number
  /** vitória / fim: mostra inteiro */
  reveal?: boolean
}

export function CharacterCrop({ src, stage, reveal = false }: CharacterCropProps) {
  const idx = reveal
    ? CHARACTER_STAGES.length - 1
    : Math.min(Math.max(stage, 0), CHARACTER_STAGES.length - 1)
  const s = CHARACTER_STAGES[idx]

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#050308]">
      <img
        src={src}
        alt=""
        draggable={false}
        className="pointer-events-none h-full w-full select-none object-cover"
        style={{
          objectPosition: s.position,
          transform: `scale(${s.zoom})`,
          transformOrigin: s.position,
        }}
      />
      {!reveal ? (
        <p className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold tracking-wide text-cinema-gold uppercase">
          {s.label}
        </p>
      ) : null}
    </div>
  )
}
