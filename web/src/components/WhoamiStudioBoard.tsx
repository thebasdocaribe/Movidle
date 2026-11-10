export type StudioId = 'pixar' | 'disney' | 'ghibli' | 'dreamworks'

export type StudioTileState = 'active' | 'eliminated' | 'confirmed'

export type StudioBoardState = {
  visible: boolean
  tiles: Record<StudioId, StudioTileState>
}

export const STUDIO_ORDER: StudioId[] = [
  'pixar',
  'dreamworks',
  'ghibli',
  'disney',
]

const STUDIO_META: Record<
  StudioId,
  { label: string; src: string }
> = {
  pixar: { label: 'Pixar', src: '/whoami/studios/pixar.jpg' },
  dreamworks: { label: 'DreamWorks', src: '/whoami/studios/dreamworks.png' },
  ghibli: { label: 'Ghibli', src: '/whoami/studios/ghibli.png' },
  disney: { label: 'Disney', src: '/whoami/studios/disney.jpg' },
}

/** questionId → estúdio (perguntas do banco seed). */
export const STUDIO_QUESTION_IDS: Record<string, StudioId> = {
  is_pixar: 'pixar',
  is_disney: 'disney',
  is_dreamworks: 'dreamworks',
  is_ghibli: 'ghibli',
}

export function initialStudioBoard(): StudioBoardState {
  return {
    visible: false,
    tiles: {
      pixar: 'active',
      disney: 'active',
      ghibli: 'active',
      dreamworks: 'active',
    },
  }
}

/**
 * Atualiza o quadro a partir de uma resposta da investigação.
 * v1: animação liga o board; estúdio SIM confirma / NÃO elimina.
 */
export function applyStudioBoardAnswer(
  prev: StudioBoardState,
  questionId: string,
  answer: 'yes' | 'no' | 'partial' | 'unknown',
): StudioBoardState {
  if (answer === 'partial' || answer === 'unknown') return prev

  if (questionId === 'is_animation') {
    if (answer === 'yes') {
      return {
        visible: true,
        tiles: {
          pixar: 'active',
          disney: 'active',
          ghibli: 'active',
          dreamworks: 'active',
        },
      }
    }
    return { ...prev, visible: false }
  }

  if (questionId === 'is_live_action' && answer === 'yes') {
    return { ...prev, visible: false }
  }

  const studio = STUDIO_QUESTION_IDS[questionId]
  if (!studio) return prev

  // Só mexe no quadro se já estiver visível (animação confirmada)
  // ou se a resposta for SIM (abre o quadro e confirma o estúdio).
  if (!prev.visible && answer !== 'yes') return prev

  if (answer === 'yes') {
    const tiles = { ...prev.tiles } as Record<StudioId, StudioTileState>
    for (const id of STUDIO_ORDER) {
      tiles[id] = id === studio ? 'confirmed' : 'eliminated'
    }
    return { visible: true, tiles }
  }

  // NÃO → elimina só aquele tile
  return {
    visible: true,
    tiles: {
      ...prev.tiles,
      [studio]: 'eliminated',
    },
  }
}

type WhoamiStudioBoardProps = {
  state: StudioBoardState
}

export function WhoamiStudioBoard({ state }: WhoamiStudioBoardProps) {
  if (!state.visible) return null

  const remaining = STUDIO_ORDER.filter(
    (id) => state.tiles[id] !== 'eliminated',
  ).length

  return (
    <section className="whoami-studio-board" aria-label="Quadro de estúdios">
      <div className="whoami-studio-board-head">
        <h3 className="whoami-studio-board-title">QUADRO · ESTÚDIOS</h3>
        <p className="whoami-studio-board-sub">
          {remaining === 1
            ? '1 estúdio em jogo'
            : `${remaining} estúdios em jogo`}
        </p>
      </div>
      <div className="whoami-studio-grid">
        {STUDIO_ORDER.map((id) => {
          const meta = STUDIO_META[id]
          const tile = state.tiles[id]
          return (
            <div
              key={id}
              className={`whoami-studio-tile whoami-studio-tile-${tile}`}
            >
              <img src={meta.src} alt="" className="whoami-studio-tile-img" />
              <span className="whoami-studio-tile-label">{meta.label}</span>
              {tile === 'eliminated' ? (
                <span className="whoami-studio-tile-x" aria-hidden>
                  ✕
                </span>
              ) : null}
              {tile === 'confirmed' ? (
                <span className="whoami-studio-tile-ok" aria-hidden>
                  ✓
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
