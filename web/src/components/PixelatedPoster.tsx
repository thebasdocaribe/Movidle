import { useEffect, useRef } from 'react'

type PixelatedPosterProps = {
  src: string
  /** Largura do “bloco” em pixels da amostragem (menor = mais pixelado) */
  sampleW?: number
  sampleH?: number
  displayW?: number
  displayH?: number
  className?: string
  alt?: string
}

/** Reduz a imagem e amplia com nearest-neighbor (pôster bem pixelado). */
export function PixelatedPoster({
  src,
  sampleW = 14,
  sampleH = 21,
  displayW = 140,
  displayH = 210,
  className = '',
  alt = '',
}: PixelatedPosterProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !src) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let cancelled = false
    const img = new Image()
    // sem crossOrigin: só desenhamos (não lemos pixels) — evita bloqueio CORS do CDN
    img.onload = () => {
      if (cancelled) return
      const tiny = document.createElement('canvas')
      tiny.width = sampleW
      tiny.height = sampleH
      const tctx = tiny.getContext('2d')
      if (!tctx) return
      tctx.imageSmoothingEnabled = false
      const iw = img.naturalWidth || img.width
      const ih = img.naturalHeight || img.height
      const scale = Math.max(sampleW / iw, sampleH / ih)
      const sw = sampleW / scale
      const sh = sampleH / scale
      const sx = (iw - sw) / 2
      const sy = (ih - sh) / 2
      tctx.drawImage(img, sx, sy, sw, sh, 0, 0, sampleW, sampleH)

      canvas.width = displayW
      canvas.height = displayH
      ctx.imageSmoothingEnabled = false
      // @ts-expect-error vendor prefixes
      ctx.mozImageSmoothingEnabled = false
      // @ts-expect-error vendor prefixes
      ctx.webkitImageSmoothingEnabled = false
      // @ts-expect-error vendor prefixes
      ctx.msImageSmoothingEnabled = false
      ctx.clearRect(0, 0, displayW, displayH)
      ctx.drawImage(tiny, 0, 0, sampleW, sampleH, 0, 0, displayW, displayH)
    }
    img.src = src

    return () => {
      cancelled = true
    }
  }, [src, sampleW, sampleH, displayW, displayH])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      width={displayW}
      height={displayH}
      role="img"
      aria-label={alt}
    />
  )
}
