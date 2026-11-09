/** Defaults + helpers de crop do modo Personagem (espelha o front). */

export const DEFAULT_CHARACTER_STAGES = [
  { label: 'Pernas', x: 50, y: 92, zoom: 4.2 },
  { label: 'Mão', x: 72, y: 62, zoom: 3.4 },
  { label: 'Cabelo', x: 50, y: 8, zoom: 3.4 },
  { label: 'Busto', x: 50, y: 38, zoom: 1.7 },
  { label: 'Rosto', x: 50, y: 22, zoom: 2.6 },
  { label: 'Completo', x: 50, y: 50, zoom: 1 },
]

/** Overrides legados por filename (antes do crop_json no banco). */
/** Só enquadramento (x/y/zoom) — labels sempre genéricos (não entregar spoiler). */
export const LEGACY_FILE_OVERRIDES = {
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

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function fileKey(imagePath) {
  const clean = String(imagePath || '').split('?')[0]
  const parts = clean.split('/')
  return parts[parts.length - 1] || ''
}

function parsePosition(pos) {
  if (!pos || typeof pos !== 'string') return null
  const m = pos.trim().match(/^([\d.]+)%\s+([\d.]+)%$/)
  if (!m) return null
  return { x: Number(m[1]), y: Number(m[2]) }
}

function normalizeStage(raw, fallback) {
  const base = fallback || DEFAULT_CHARACTER_STAGES[0]
  let x = Number(raw?.x)
  let y = Number(raw?.y)
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    const parsed = parsePosition(raw?.position)
    x = parsed?.x ?? base.x
    y = parsed?.y ?? base.y
  }
  const zoom = Number(raw?.zoom)
  return {
    // Sempre label padrão do estágio — "Jaleco/Seringa" entregava o personagem
    label: base.label || 'Crop',
    x: clamp(x, 0, 100),
    y: clamp(y, 0, 100),
    zoom: clamp(Number.isFinite(zoom) ? zoom : base.zoom, 1, 8),
  }
}

/** Lista completa de 6 estágios pra API / editor. */
export function resolveCropStages(cropJson, imagePath) {
  const stored =
    cropJson && typeof cropJson === 'object' && !Array.isArray(cropJson)
      ? cropJson
      : {}
  const legacy = LEGACY_FILE_OVERRIDES[fileKey(imagePath)] || {}
  const hasStored = Object.keys(stored).length > 0

  return DEFAULT_CHARACTER_STAGES.map((base, i) => {
    const key = String(i)
    if (hasStored && stored[key]) return normalizeStage(stored[key], base)
    if (legacy[i]) return normalizeStage(legacy[i], base)
    return { ...base }
  })
}

export function sanitizeCropJson(input) {
  const src =
    input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const out = {}
  for (let i = 0; i < DEFAULT_CHARACTER_STAGES.length; i++) {
    const key = String(i)
    const raw = src[key] ?? src[i]
    out[key] = normalizeStage(raw, DEFAULT_CHARACTER_STAGES[i])
  }
  return out
}

export function slugCharacter(name) {
  return String(name)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}
