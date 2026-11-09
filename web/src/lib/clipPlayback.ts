/** ~1 frame @ 30fps — congela no último frame do segundo, sem vazar o próximo. */
export const CLIP_FRAME_EPS = 1 / 30

/** Tempo de congelamento / fim visual do take (ex.: 6s → ~5.967). */
export function clipFreezeAt(endSeconds: number, eps = CLIP_FRAME_EPS) {
  return Math.max(0, endSeconds - eps)
}

/**
 * Monitora o vídeo a cada animation frame (timeupdate sozinho atrasa ~100–250ms
 * e deixa 2–3 frames do segundo seguinte vazar).
 */
export function watchClipBoundary(
  video: HTMLVideoElement,
  opts: {
    startAt: number
    /** Limite exclusivo em segundos (1, 2, … 6). */
    endSeconds: number
    onStop?: () => void
  },
): () => void {
  let stopped = false
  let raf = 0
  const freezeAt = clipFreezeAt(opts.endSeconds)
  const startAt = Math.max(0, opts.startAt)

  const halt = () => {
    if (stopped) return
    stopped = true
    cancelAnimationFrame(raf)
    video.pause()
    try {
      // Volta pro último frame do intervalo — evita freeze no “próximo segundo”
      video.currentTime = Math.max(startAt, freezeAt)
    } catch {
      /* ignore seek race */
    }
    opts.onStop?.()
  }

  const check = () => {
    if (stopped) return
    // Dispara um frame antes do segundo seguinte
    if (video.currentTime >= freezeAt) {
      halt()
      return
    }
    raf = requestAnimationFrame(check)
  }

  video.addEventListener('timeupdate', check)
  raf = requestAnimationFrame(check)

  return () => {
    stopped = true
    cancelAnimationFrame(raf)
    video.removeEventListener('timeupdate', check)
  }
}
