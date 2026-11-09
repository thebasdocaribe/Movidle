import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent as ReactDragEvent,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  createAdminCharacter,
  fetchAdminCharacters,
  fetchAutocomplete,
  updateAdminCharacter,
  type AdminCharacter,
  type AutocompleteItem,
  type CharacterCropStage,
} from '../api'
import { CHARACTER_STAGES, CharacterCrop } from './CharacterCrop'

function stagesToPayload(stages: CharacterCropStage[]) {
  const out: Record<string, CharacterCropStage> = {}
  stages.forEach((s, i) => {
    out[String(i)] = s
  })
  return out
}

function cloneStages(stages?: CharacterCropStage[] | null): CharacterCropStage[] {
  const src = stages?.length ? stages : CHARACTER_STAGES
  return CHARACTER_STAGES.map((base, i) => {
    const s = src[i]
    return {
      label: base.label,
      x: Number.isFinite(s?.x) ? Number(s!.x) : base.x,
      y: Number.isFinite(s?.y) ? Number(s!.y) : base.y,
      zoom: Number.isFinite(s?.zoom) ? Number(s!.zoom) : base.zoom,
    }
  })
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Falha ao ler imagem'))
    reader.readAsDataURL(file)
  })
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

type EditorState = {
  id: string | null
  name: string
  namePt: string
  filmTitle: string
  movieId: string | null
  imageUrl: string | null
  imageDataUrl: string | null
  stages: CharacterCropStage[]
}

const emptyEditor = (): EditorState => ({
  id: null,
  name: '',
  namePt: '',
  filmTitle: '',
  movieId: null,
  imageUrl: null,
  imageDataUrl: null,
  stages: cloneStages(null),
})

export function AdminCharactersPanel() {
  const [list, setList] = useState<AdminCharacter[]>([])
  const [query, setQuery] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState>(emptyEditor)
  const [stageIdx, setStageIdx] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [movieSuggestions, setMovieSuggestions] = useState<AutocompleteItem[]>(
    [],
  )
  const [showMovieSug, setShowMovieSug] = useState(false)
  const movieTimer = useRef<number | null>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    origX: number
    origY: number
    zoom: number
    img: HTMLImageElement
    lastX: number
    lastY: number
  } | null>(null)
  const panUnbindRef = useRef<(() => void) | null>(null)
  const stageIdxRef = useRef(stageIdx)
  stageIdxRef.current = stageIdx
  const frameRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reload = useCallback(async (q = query) => {
    setLoadingList(true)
    setListError(null)
    try {
      const res = await fetchAdminCharacters(q)
      setList(res.characters)
    } catch (err) {
      setListError((err as Error).message)
    } finally {
      setLoadingList(false)
    }
  }, [query])

  useEffect(() => {
    void reload('')
  }, [])

  const stopPanDrag = useCallback((commit: boolean) => {
    panUnbindRef.current?.()
    panUnbindRef.current = null
    const drag = dragRef.current
    dragRef.current = null
    if (!commit || !drag) return
    const idx = stageIdxRef.current
    setEditor((prev) => {
      const stages = prev.stages.map((s, i) =>
        i === idx ? { ...s, x: drag.lastX, y: drag.lastY } : s,
      )
      return { ...prev, stages }
    })
  }, [])

  /** Sem setPointerCapture — ele prendia os sliders depois de trocar aba / pan. */
  useEffect(() => {
    function onBlur() {
      stopPanDrag(true)
    }
    function onVis() {
      if (document.visibilityState === 'hidden') stopPanDrag(true)
    }
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onVis)
      stopPanDrag(false)
    }
  }, [stopPanDrag])

  function openNew() {
    setEditor(emptyEditor())
    setStageIdx(0)
    setSaveMsg(null)
    setSaveError(null)
  }

  function openEdit(ch: AdminCharacter) {
    setEditor({
      id: ch.id,
      name: ch.name,
      namePt: ch.namePt || ch.name,
      filmTitle: ch.filmTitle || '',
      movieId: ch.movieId,
      imageUrl: ch.imageUrl,
      imageDataUrl: null,
      stages: cloneStages(ch.cropStages),
    })
    setStageIdx(0)
    setSaveMsg(null)
    setSaveError(null)
  }

  async function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
      setSaveError('Use JPEG, PNG ou WebP')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setSaveError('Imagem muito grande (máx ~8MB)')
      return
    }
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setEditor((prev) => ({
        ...prev,
        imageDataUrl: dataUrl,
        imageUrl: dataUrl,
      }))
      setSaveError(null)
    } catch (err) {
      setSaveError((err as Error).message)
    }
  }

  function onFilmChange(value: string) {
    setEditor((prev) => ({
      ...prev,
      filmTitle: value,
      movieId: null,
    }))
    if (movieTimer.current) window.clearTimeout(movieTimer.current)
    movieTimer.current = window.setTimeout(() => {
      void fetchAutocomplete(value).then((res) => {
        setMovieSuggestions(res.suggestions)
        setShowMovieSug(true)
      })
    }, 180)
  }

  function pickMovie(item: AutocompleteItem) {
    setEditor((prev) => ({
      ...prev,
      filmTitle: item.titlePt || item.title,
      movieId: item.movieId || null,
    }))
    setShowMovieSug(false)
  }

  function updateStage(patch: Partial<CharacterCropStage>) {
    setEditor((prev) => {
      const stages = prev.stages.map((s, i) =>
        i === stageIdx ? { ...s, ...patch } : s,
      )
      return { ...prev, stages }
    })
  }

  function applyCropImgStyle(img: HTMLImageElement, x: number, y: number, zoom: number) {
    const position = `${x}% ${y}%`
    img.style.objectPosition = position
    img.style.transformOrigin = position
    img.style.transform = `scale(${zoom})`
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!editor.imageUrl) return
    if (e.button !== 0) return
    const stage = editor.stages[stageIdx]
    if (!stage || stage.zoom <= 1) return
    const img = frameRef.current?.querySelector(
      'img[data-role="crop-img"]',
    ) as HTMLImageElement | null
    if (!img) return
    // Sem isso o Brave inicia drag nativo da <img> (“tirar a foto”)
    e.preventDefault()
    stopPanDrag(false)
    const pointerId = e.pointerId
    dragRef.current = {
      pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: stage.x,
      origY: stage.y,
      zoom: stage.zoom,
      img,
      lastX: stage.x,
      lastY: stage.y,
    }

    function onMove(ev: PointerEvent) {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== ev.pointerId) return
      ev.preventDefault()
      const box = frameRef.current?.getBoundingClientRect()
      if (!box || box.width <= 0 || box.height <= 0) return
      const zoom = Math.max(drag.zoom, 1)
      const sens = Math.sqrt(zoom) * 0.85
      const dx = ((ev.clientX - drag.startX) / box.width) * 100 * sens
      const dy = ((ev.clientY - drag.startY) / box.height) * 100 * sens
      const x = clamp(drag.origX - dx, 0, 100)
      const y = clamp(drag.origY - dy, 0, 100)
      drag.lastX = x
      drag.lastY = y
      applyCropImgStyle(drag.img, x, y, drag.zoom)
    }

    function onUp(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return
      stopPanDrag(true)
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    panUnbindRef.current = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }

  function onDragStartCapture(e: ReactDragEvent<HTMLDivElement>) {
    e.preventDefault()
  }

  /** Qualquer clique nos sliders limpa pan residual. */
  function onSliderPointerDown() {
    stopPanDrag(false)
  }

  function onWheel(e: React.WheelEvent<HTMLDivElement>) {
    if (!editor.imageUrl) return
    e.preventDefault()
    const stage = editor.stages[stageIdx]
    if (!stage) return
    const delta = e.deltaY > 0 ? -0.15 : 0.15
    updateStage({ zoom: clamp(stage.zoom + delta, 1, 8) })
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg(null)
    setSaveError(null)
    try {
      const name = editor.name.trim()
      if (name.length < 2) throw new Error('Nome do personagem obrigatório')
      const cropStages = stagesToPayload(editor.stages)
      let saved: AdminCharacter
      if (editor.id) {
        const body: Parameters<typeof updateAdminCharacter>[1] = {
          name,
          namePt: editor.namePt.trim() || name,
          filmTitle: editor.filmTitle.trim() || null,
          movieId: editor.movieId,
          cropStages,
        }
        if (editor.imageDataUrl) body.imageDataUrl = editor.imageDataUrl
        const res = await updateAdminCharacter(editor.id, body)
        saved = res.character
      } else {
        if (!editor.imageDataUrl) {
          throw new Error('Envie uma foto do personagem')
        }
        const res = await createAdminCharacter({
          name,
          namePt: editor.namePt.trim() || name,
          filmTitle: editor.filmTitle.trim() || null,
          movieId: editor.movieId,
          imageDataUrl: editor.imageDataUrl,
          cropStages,
        })
        saved = res.character
      }
      setEditor({
        id: saved.id,
        name: saved.name,
        namePt: saved.namePt,
        filmTitle: saved.filmTitle || '',
        movieId: saved.movieId,
        imageUrl: saved.imageUrl,
        imageDataUrl: null,
        stages: cloneStages(saved.cropStages),
      })
      setSaveMsg(editor.id ? 'Personagem atualizado' : 'Personagem criado')
      await reload(query)
    } catch (err) {
      setSaveError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const previewSrc = editor.imageUrl
  const activeStage = editor.stages[stageIdx]

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="panel-frame flex max-h-[min(70vh,640px)] flex-col gap-2 overflow-hidden p-3 lg:sticky lg:top-4">
        <div className="flex shrink-0 items-center justify-between gap-2">
          <h2 className="font-display text-xl text-white">Lista</h2>
          <button
            type="button"
            onClick={openNew}
            className="border border-cinema-gold px-2 py-1 text-[10px] font-bold tracking-wide text-cinema-gold uppercase"
          >
            + Novo
          </button>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void reload(query)
          }}
          placeholder="Buscar…"
          className="shrink-0 border border-cinema-line bg-black/50 px-2 py-1.5 text-sm text-white outline-none focus:border-cinema-gold"
        />
        <button
          type="button"
          onClick={() => void reload(query)}
          className="shrink-0 self-start text-[10px] font-bold tracking-wide text-cinema-muted uppercase hover:text-white"
        >
          Filtrar
        </button>
        {loadingList ? (
          <p className="text-xs text-cinema-muted">Carregando…</p>
        ) : listError ? (
          <p className="text-xs text-cinema-red">{listError}</p>
        ) : (
          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain">
            {list.length === 0 ? (
              <li className="text-xs text-cinema-muted">Nenhum personagem</li>
            ) : (
              list.map((ch) => (
                <li key={ch.id}>
                  <button
                    type="button"
                    onClick={() => openEdit(ch)}
                    className={`flex w-full items-center gap-2 border px-2 py-1.5 text-left ${
                      editor.id === ch.id
                        ? 'border-cinema-gold bg-cinema-gold/10'
                        : 'border-cinema-line hover:border-cinema-muted'
                    }`}
                  >
                    <img
                      src={ch.imageUrl}
                      alt=""
                      className="h-10 w-8 object-cover"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-white">
                        {ch.namePt || ch.name}
                      </span>
                      <span className="block truncate text-[10px] text-cinema-muted">
                        {ch.filmTitle || '—'}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </aside>

      <section className="panel-frame p-3 sm:p-4">
        <h2 className="font-display text-2xl text-white">
          {editor.id ? 'Editar personagem' : 'Novo personagem'}
        </h2>
        <p className="mt-1 text-xs text-cinema-muted">
          Sobe a still, liga o filme do catálogo e ajusta cada crop (arrasta pra
          pan, scroll pra zoom) — igual Paint.
        </p>

        <form onSubmit={onSave} className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <label className="block text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
              Nome (EN / canônico)
              <input
                value={editor.name}
                onChange={(e) =>
                  setEditor((p) => ({ ...p, name: e.target.value }))
                }
                className="mt-1 w-full border border-cinema-line bg-black/50 px-2 py-2 text-sm text-white outline-none focus:border-cinema-gold"
                required
              />
            </label>
            <label className="block text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
              Nome PT
              <input
                value={editor.namePt}
                onChange={(e) =>
                  setEditor((p) => ({ ...p, namePt: e.target.value }))
                }
                className="mt-1 w-full border border-cinema-line bg-black/50 px-2 py-2 text-sm text-white outline-none focus:border-cinema-gold"
              />
            </label>
            <div className="relative">
              <label className="block text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
                Filme (autocomplete do banco)
                <input
                  value={editor.filmTitle}
                  onChange={(e) => onFilmChange(e.target.value)}
                  onFocus={() => setShowMovieSug(movieSuggestions.length > 0)}
                  onBlur={() =>
                    window.setTimeout(() => setShowMovieSug(false), 150)
                  }
                  className="mt-1 w-full border border-cinema-line bg-black/50 px-2 py-2 text-sm text-white outline-none focus:border-cinema-gold"
                  placeholder="Digite o título…"
                  autoComplete="off"
                />
              </label>
              {showMovieSug && movieSuggestions.length > 0 ? (
                <ul className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto border border-cinema-line bg-[#120a14]">
                  {movieSuggestions.map((s) => (
                    <li key={`${s.movieId}-${s.label}`}>
                      <button
                        type="button"
                        className="w-full px-2 py-1.5 text-left text-sm text-white hover:bg-cinema-gold/15"
                        onMouseDown={(ev) => {
                          ev.preventDefault()
                          pickMovie(s)
                        }}
                      >
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {editor.movieId ? (
                <p className="mt-1 text-[10px] text-cinema-cyan">
                  Ligado ao catálogo ✓
                </p>
              ) : null}
            </div>

            <div>
              <p className="text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
                Foto (JPEG/PNG/WebP)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onPickImage}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 border border-cinema-gold px-3 py-2 text-[11px] font-bold tracking-wide text-cinema-gold uppercase hover:bg-cinema-gold/10"
              >
                {editor.id ? 'Trocar / importar foto' : 'Importar foto'}
              </button>
              {editor.imageDataUrl ? (
                <p className="mt-1 text-[10px] text-cinema-cyan">
                  Nova foto pronta — clique em Salvar pra gravar
                </p>
              ) : editor.imageUrl ? (
                <p className="mt-1 text-[10px] text-cinema-muted">
                  Já tem foto no banco; importe outra pra substituir
                </p>
              ) : (
                <p className="mt-1 text-[10px] text-cinema-muted">
                  Obrigatório pra personagem novo
                </p>
              )}
            </div>

            <div>
              <p className="text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
                Estágio do crop
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {editor.stages.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setStageIdx(i)}
                    className={`border px-2 py-1 text-[10px] font-bold uppercase ${
                      stageIdx === i
                        ? 'border-cinema-gold text-cinema-gold'
                        : 'border-cinema-line text-cinema-muted'
                    }`}
                  >
                    {i + 1}. {s.label}
                  </button>
                ))}
              </div>
            </div>

            {activeStage ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="col-span-2 text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
                  Zoom {activeStage.zoom.toFixed(2)}×
                  <input
                    type="range"
                    min={1}
                    max={8}
                    step={0.05}
                    value={activeStage.zoom}
                    onPointerDown={onSliderPointerDown}
                    onChange={(e) =>
                      updateStage({ zoom: Number(e.target.value) })
                    }
                    className="mt-2 w-full"
                  />
                </label>
                <label className="text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
                  X {activeStage.x.toFixed(0)}%
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={activeStage.x}
                    onPointerDown={onSliderPointerDown}
                    onChange={(e) =>
                      updateStage({ x: Number(e.target.value) })
                    }
                    className="mt-2 w-full"
                  />
                </label>
                <label className="text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
                  Y {activeStage.y.toFixed(0)}%
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={activeStage.y}
                    onPointerDown={onSliderPointerDown}
                    onChange={(e) =>
                      updateStage({ y: Number(e.target.value) })
                    }
                    className="mt-2 w-full"
                  />
                </label>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="border border-cinema-gold bg-cinema-gold/15 px-4 py-2 text-xs font-bold tracking-wide text-cinema-gold uppercase disabled:opacity-50"
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
              {saveMsg ? (
                <span className="text-xs text-cinema-cyan">{saveMsg}</span>
              ) : null}
              {saveError ? (
                <span className="text-xs text-cinema-red">{saveError}</span>
              ) : null}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
              Preview · arraste / scroll
            </p>
            {previewSrc ? (
              <div
                ref={frameRef}
                onPointerDown={onPointerDown}
                onDragStartCapture={onDragStartCapture}
                onWheel={onWheel}
                className="cursor-grab touch-none select-none active:cursor-grabbing"
              >
                <CharacterCrop
                  src={previewSrc}
                  stage={stageIdx}
                  stages={editor.stages}
                />
              </div>
            ) : (
              <div className="flex aspect-[3/4] w-full items-center justify-center border border-dashed border-cinema-line bg-black/30 text-sm text-cinema-muted">
                Sem foto
              </div>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-cinema-muted">
              No jogo: tentativa 1 = estágio 1, e assim por diante até o
              completo. Ajuste o foco em cada parte (perna, mão, rosto…).
            </p>
          </div>
        </form>
      </section>
    </div>
  )
}
