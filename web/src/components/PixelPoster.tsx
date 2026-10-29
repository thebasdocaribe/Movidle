import { useEffect, useRef } from 'react'

type PixelPosterProps = {
  src: string
  /** Quantos “blocos” na largura (menos = mais pixelado). Ex: 12–48 */
  columns: number
  sharp?: boolean
  className?: string
}

/**
 * Mosaico real via canvas (imageSmoothing off).
 * object-fit: contain — não estica a capa.
 */
export function PixelPoster({
  src,
  columns,
  sharp = false,
  className = '',
}: PixelPosterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const img = new Image()
    img.decoding = 'async'
    img.src = src

    let cancelled = false

    function paint() {
      if (cancelled || !canvas || !wrap) return
      const cw = wrap.clientWidth || 640
      const ch = wrap.clientHeight || 360
      canvas.width = cw
      canvas.height = ch
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.fillStyle = '#050308'
      ctx.fillRect(0, 0, cw, ch)

      if (sharp || columns <= 1) {
        ctx.imageSmoothingEnabled = true
        // contain
        const scale = Math.min(cw / img.width, ch / img.height)
        const dw = img.width * scale
        const dh = img.height * scale
        ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh)
        return
      }

      const cols = Math.max(6, Math.floor(columns))
      const rows = Math.max(4, Math.round((cols * img.height) / img.width))
      const tmp = document.createElement('canvas')
      tmp.width = cols
      tmp.height = rows
      const tctx = tmp.getContext('2d')
      if (!tctx) return
      tctx.imageSmoothingEnabled = false
      tctx.drawImage(img, 0, 0, cols, rows)

      ctx.imageSmoothingEnabled = false
      const scale = Math.min(cw / img.width, ch / img.height)
      const dw = img.width * scale
      const dh = img.height * scale
      const dx = (cw - dw) / 2
      const dy = (ch - dh) / 2
      ctx.drawImage(tmp, dx, dy, dw, dh)
    }

    img.onload = () => paint()
    if (img.complete) paint()

    const ro = new ResizeObserver(() => paint())
    ro.observe(wrap)

    return () => {
      cancelled = true
      ro.disconnect()
    }
  }, [src, columns, sharp])

  return (
    <div ref={wrapRef} className={`absolute inset-0 bg-[#050308] ${className}`}>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  )
}

/** Menos colunas = mais pixelado */
export function castMosaicColumns(takeIndex: number): number {
  const cols = [10, 14, 18, 24, 32, 48, 72]
  return cols[Math.min(takeIndex, cols.length - 1)] ?? 72
}
