import type { ReactNode } from 'react'

export type GenreClueId = 'horror' | 'action'
export type EraClueId = 'eighties'
export type ClueTileState = 'active' | 'eliminated' | 'confirmed'

export type GenreBoardState = {
  visible: boolean
  tiles: Record<GenreClueId, ClueTileState>
}

export type EraBoardState = {
  visible: boolean
  tiles: Record<EraClueId, ClueTileState>
}

/** Estado agregado dos quadros de pista (gênero e época separados). */
export type ClueBoardState = {
  genre: GenreBoardState
  era: EraBoardState
}

export const GENRE_ORDER: GenreClueId[] = ['horror', 'action']
export const ERA_ORDER: EraClueId[] = ['eighties']

const GENRE_META: Record<GenreClueId, { label: string; src: string }> = {
  horror: { label: 'Terror', src: '/whoami/clues/horror.webp' },
  action: { label: 'Ação', src: '/whoami/clues/action.jpg' },
}

const ERA_META: Record<EraClueId, { label: string; src: string }> = {
  eighties: { label: 'Anos 80', src: '/whoami/clues/eighties.jpg' },
}

const GENRE_QUESTION_IDS: Record<string, GenreClueId> = {
  tag_horror: 'horror',
  tag_action: 'action',
}

const ERA_QUESTION_IDS: Record<string, EraClueId> = {
  decade_80s: 'eighties',
}

export function initialClueBoard(): ClueBoardState {
  return {
    genre: {
      visible: false,
      tiles: { horror: 'active', action: 'active' },
    },
    era: {
      visible: false,
      tiles: { eighties: 'active' },
    },
  }
}

function applyTileAnswer<T extends string>(
  prev: { visible: boolean; tiles: Record<T, ClueTileState> },
  tile: T,
  answer: 'yes' | 'no',
): { visible: boolean; tiles: Record<T, ClueTileState> } {
  return {
    visible: true,
    tiles: {
      ...prev.tiles,
      [tile]: answer === 'yes' ? 'confirmed' : 'eliminated',
    },
  }
}

/**
 * Gênero e época são quadros separados.
 * Gênero: SIM confirma sem matar as outras (podem coexistir).
 * Época: SIM/NÃO só mexe na tile da década (por enquanto só 80s).
 */
export function applyClueBoardAnswer(
  prev: ClueBoardState,
  questionId: string,
  answer: 'yes' | 'no' | 'partial' | 'unknown',
): ClueBoardState {
  if (answer === 'partial' || answer === 'unknown') return prev

  const genre = GENRE_QUESTION_IDS[questionId]
  if (genre) {
    return {
      ...prev,
      genre: applyTileAnswer(prev.genre, genre, answer),
    }
  }

  const era = ERA_QUESTION_IDS[questionId]
  if (era) {
    return {
      ...prev,
      era: applyTileAnswer(prev.era, era, answer),
    }
  }

  return prev
}

function BoardSection({
  title,
  ariaLabel,
  remainingLabel,
  remaining,
  gridClass,
  children,
}: {
  title: string
  ariaLabel: string
  remainingLabel: string
  remaining: number
  gridClass: string
  children: ReactNode
}) {
  return (
    <section className="whoami-studio-board" aria-label={ariaLabel}>
      <div className="whoami-studio-board-head">
        <h3 className="whoami-studio-board-title">{title}</h3>
        <p className="whoami-studio-board-sub">
          {remaining === 1
            ? `1 ${remainingLabel} em jogo`
            : `${remaining} ${remainingLabel}s em jogo`}
        </p>
      </div>
      <div className={gridClass}>{children}</div>
    </section>
  )
}

function Tile({
  label,
  src,
  tile,
}: {
  label: string
  src: string
  tile: ClueTileState
}) {
  return (
    <div className={`whoami-studio-tile whoami-studio-tile-${tile}`}>
      <img src={src} alt="" className="whoami-studio-tile-img" />
      <span className="whoami-studio-tile-label">{label}</span>
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
}

type WhoamiClueBoardProps = {
  state: ClueBoardState
}

export function WhoamiClueBoard({ state }: WhoamiClueBoardProps) {
  const genreRemaining = GENRE_ORDER.filter(
    (id) => state.genre.tiles[id] !== 'eliminated',
  ).length
  const eraRemaining = ERA_ORDER.filter(
    (id) => state.era.tiles[id] !== 'eliminated',
  ).length

  if (!state.genre.visible && !state.era.visible) return null

  return (
    <div className="whoami-clue-boards">
      {state.genre.visible ? (
        <BoardSection
          title="QUADRO · GÊNERO"
          ariaLabel="Quadro de gênero"
          remainingLabel="gênero"
          remaining={genreRemaining}
          gridClass="whoami-clue-grid whoami-clue-grid-genre"
        >
          {GENRE_ORDER.map((id) => {
            const meta = GENRE_META[id]
            return (
              <Tile
                key={id}
                label={meta.label}
                src={meta.src}
                tile={state.genre.tiles[id]}
              />
            )
          })}
        </BoardSection>
      ) : null}

      {state.era.visible ? (
        <BoardSection
          title="QUADRO · ÉPOCA"
          ariaLabel="Quadro de época"
          remainingLabel="época"
          remaining={eraRemaining}
          gridClass="whoami-clue-grid whoami-clue-grid-era"
        >
          {ERA_ORDER.map((id) => {
            const meta = ERA_META[id]
            return (
              <Tile
                key={id}
                label={meta.label}
                src={meta.src}
                tile={state.era.tiles[id]}
              />
            )
          })}
        </BoardSection>
      ) : null}
    </div>
  )
}
