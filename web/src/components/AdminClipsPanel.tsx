import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import {
  fetchAdminClips,
  fetchAdminMovie,
  fetchAutocomplete,
  uploadAdminMovieClip,
  type AdminClipMovie,
  type AutocompleteItem,
} from '../api'
import { watchClipBoundary } from '../lib/clipPlayback'

const TAKE_SECONDS = [1, 2, 3, 4, 5, 6] as const

export function AdminClipsPanel() {
  const [list, setList] = useState<AdminClipMovie[]>([])
  const [listQ, setListQ] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [filmQ, setFilmQ] = useState('')
  const [filmSuggestions, setFilmSuggestions] = useState<AutocompleteItem[]>(
    [],
  )
  const [showFilmSug, setShowFilmSug] = useState(false)
  const [movie, setMovie] = useState<AdminClipMovie | null>(null)

  const [localUrl, setLocalUrl] = useState<string | null>(null)
  const [localFile, setLocalFile] = useState<File | null>(null)
  /** slice = só o segundo N (N-1→N); all = 0→6 como sequência completa */
  const [playMode, setPlayMode] = useState<'slice' | 'all' | null>(null)
  const [activeSlice, setActiveSlice] = useState(1)
  const [playNonce, setPlayNonce] = useState(0)
  const [videoMeta, setVideoMeta] = useState<string | null>(null)

  const [overwrite, setOverwrite] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const filmTimer = useRef<number | null>(null)
  const localUrlRef = useRef<string | null>(null)

  const reloadList = useCallback(async (q = listQ) => {
    setLoadingList(true)
    setListError(null)
    try {
      const res = await fetchAdminClips(q)
      setList(res.clips)
    } catch (err) {
      setListError((err as Error).message)
    } finally {
      setLoadingList(false)
    }
  }, [listQ])

  useEffect(() => {
    void reloadList('')
  }, [])

  useEffect(() => {
    return () => {
      if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current)
    }
  }, [])

  function clearLocalVideo() {
    if (localUrlRef.current) {
      URL.revokeObjectURL(localUrlRef.current)
      localUrlRef.current = null
    }
    setLocalUrl(null)
    setLocalFile(null)
    setVideoMeta(null)
    setPlayMode(null)
  }

  function setLocalFromFile(file: File) {
    if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current)
    const url = URL.createObjectURL(file)
    localUrlRef.current = url
    setLocalUrl(url)
    setLocalFile(file)
    setActiveSlice(1)
    setPlayMode(null)
    setSaveMsg(null)
    setSaveError(null)
  }

  function stopPreview() {
    setPlayMode(null)
    const v = videoRef.current
    if (v) {
      v.pause()
      try {
        v.currentTime = 0
      } catch {
        /* ignore */
      }
    }
  }

  function openNewClip() {
    setMovie(null)
    setFilmQ('')
    setFilmSuggestions([])
    setShowFilmSug(false)
    setOverwrite(false)
    setSaveMsg(null)
    setSaveError(null)
    clearLocalVideo()
    stopPreview()
  }

  async function selectMovie(item: AutocompleteItem) {
    if (!item.movieId) return
    setShowFilmSug(false)
    setFilmQ(item.label)
    setSaveMsg(null)
    setSaveError(null)
    clearLocalVideo()
    setOverwrite(false)
    try {
      const res = await fetchAdminMovie(item.movieId)
      setMovie(res.movie)
      if (res.movie.hasClip) setOverwrite(false)
    } catch (err) {
      setSaveError((err as Error).message)
      setMovie(null)
    }
  }

  function onFilmChange(value: string) {
    setFilmQ(value)
    setMovie(null)
    if (filmTimer.current) window.clearTimeout(filmTimer.current)
    filmTimer.current = window.setTimeout(() => {
      void fetchAutocomplete(value).then((res) => {
        setFilmSuggestions(res.suggestions)
        setShowFilmSug(true)
      })
    }, 180)
  }

  function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!/video\/mp4/i.test(file.type) && !/\.mp4$/i.test(file.name)) {
      setSaveError('Use um arquivo MP4')
      return
    }
    if (file.size > 40 * 1024 * 1024) {
      setSaveError('Arquivo muito grande (máx 40MB)')
      return
    }
    setLocalFromFile(file)
  }

  const previewSrc = localUrl || movie?.clipUrl || null

  useEffect(() => {
    const video = videoRef.current
    if (!video || !previewSrc || !playMode) {
      video?.pause()
      return
    }
    // slice N = só (N-1)→N; all = 0→6 (sequência completa do clássico)
    const startAt = playMode === 'all' ? 0 : Math.max(0, activeSlice - 1)
    const endSeconds = playMode === 'all' ? 6 : activeSlice

    let unwatch: (() => void) | null = null
    let cancelled = false

    const start = () => {
      if (cancelled) return
      try {
        video.currentTime = startAt
      } catch {
        /* seek race */
      }
      unwatch?.()
      unwatch = watchClipBoundary(video, {
        startAt,
        endSeconds,
        onStop: () => setPlayMode(null),
      })
      void video.play().catch(() => setPlayMode(null))
    }

    if (video.readyState >= 2) start()
    else {
      const onReady = () => {
        video.removeEventListener('canplay', onReady)
        start()
      }
      video.addEventListener('canplay', onReady)
      return () => {
        cancelled = true
        video.removeEventListener('canplay', onReady)
        unwatch?.()
        video.pause()
      }
    }
    return () => {
      cancelled = true
      unwatch?.()
      video.pause()
    }
  }, [playMode, activeSlice, playNonce, previewSrc])

  function onVideoLoaded() {
    const video = videoRef.current
    if (!video) return
    const dur = Number.isFinite(video.duration) ? video.duration : null
    if (dur != null) {
      const tip =
        dur < 5.2
          ? 'curto demais (<5s) — o take 6 pode cortar cedo'
          : dur > 7.5
            ? 'mais longo que 6s — o jogo só usa os primeiros 6s'
            : 'duração ok pra takes 1–6s'
      setVideoMeta(`${dur.toFixed(1)}s · ${tip}`)
    }
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!movie?.id) {
      setSaveError('Escolha um filme do catálogo')
      return
    }
    if (!localFile) {
      setSaveError('Importe um MP4 pra enviar')
      return
    }
    const alreadyHasClip = Boolean(movie.hasClip || movie.clipUrl)
    if (alreadyHasClip && !overwrite) {
      setSaveError('Marque “Sobrescrever clipe atual” pra trocar o vídeo')
      return
    }
    setSaving(true)
    setSaveMsg(null)
    setSaveError(null)
    try {
      const res = await uploadAdminMovieClip(movie.id, localFile, {
        overwrite: alreadyHasClip || overwrite,
      })
      setMovie(res.movie)
      clearLocalVideo()
      setOverwrite(false)
      setSaveMsg(
        res.movie.overwritten
          ? 'Clipe sobrescrito no catálogo'
          : 'Clipe salvo no catálogo',
      )
      await reloadList(listQ)
    } catch (err) {
      setSaveError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="panel-frame flex max-h-[min(70vh,640px)] flex-col gap-2 overflow-hidden p-3 lg:sticky lg:top-4">
        <div className="flex shrink-0 items-center justify-between gap-2">
          <h2 className="font-display text-xl text-white">Com clipe</h2>
          <button
            type="button"
            onClick={openNewClip}
            className="border border-cinema-gold px-2 py-1 text-[10px] font-bold tracking-wide text-cinema-gold uppercase"
          >
            + Filme novo
          </button>
        </div>
        <input
          value={listQ}
          onChange={(e) => setListQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void reloadList(listQ)
          }}
          placeholder="Buscar…"
          className="shrink-0 border border-cinema-line bg-black/50 px-2 py-1.5 text-sm text-white outline-none focus:border-cinema-gold"
        />
        <button
          type="button"
          onClick={() => void reloadList(listQ)}
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
              <li className="text-xs text-cinema-muted">Nenhum clipe ainda</li>
            ) : (
              list.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setMovie(c)
                      setFilmQ(
                        c.year
                          ? `${c.titlePt || c.title} (${c.year})`
                          : c.titlePt || c.title,
                      )
                      clearLocalVideo()
                      setOverwrite(false)
                      setSaveMsg(null)
                      setSaveError(null)
                    }}
                    className={`flex w-full items-center gap-2 border px-2 py-1.5 text-left ${
                      movie?.id === c.id
                        ? 'border-cinema-gold bg-cinema-gold/10'
                        : 'border-cinema-line hover:border-cinema-muted'
                    }`}
                  >
                    {c.posterUrl ? (
                      <img
                        src={c.posterUrl}
                        alt=""
                        className="h-10 w-7 object-cover"
                      />
                    ) : (
                      <div className="h-10 w-7 bg-black/40" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-white">
                        {c.titlePt || c.title}
                      </span>
                      <span className="block truncate text-[10px] text-cinema-muted">
                        {c.year ?? '—'}
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
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl text-white">
              {movie ? 'Editar / trocar clipe' : 'Filme novo · upload'}
            </h2>
            <p className="mt-1 text-xs text-cinema-muted">
              Busca o filme no catálogo (mesmo sem clipe), importa o MP4 (~6s),
              testa os takes e salva. Lista à esquerda = quem já tem clipe.
            </p>
          </div>
          {movie ? (
            <button
              type="button"
              onClick={openNewClip}
              className="border border-cinema-line px-2.5 py-1 text-[10px] font-bold tracking-wide text-cinema-muted uppercase hover:border-cinema-gold hover:text-cinema-gold"
            >
              ← Filme novo
            </button>
          ) : null}
        </div>

        <form
          onSubmit={onSave}
          className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
        >
          <div className="flex flex-col gap-3">
            <div className="relative">
              <label className="block text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
                Filme (autocomplete do banco)
                <input
                  value={filmQ}
                  onChange={(e) => onFilmChange(e.target.value)}
                  onFocus={() => setShowFilmSug(filmSuggestions.length > 0)}
                  onBlur={() =>
                    window.setTimeout(() => setShowFilmSug(false), 150)
                  }
                  className="mt-1 w-full border border-cinema-line bg-black/50 px-2 py-2 text-sm text-white outline-none focus:border-cinema-gold"
                  placeholder="Digite o título…"
                  autoComplete="off"
                />
              </label>
              {showFilmSug && filmSuggestions.length > 0 ? (
                <ul className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto border border-cinema-line bg-[#120a14]">
                  {filmSuggestions.map((s) => (
                    <li key={`${s.movieId}-${s.label}`}>
                      <button
                        type="button"
                        className="w-full px-2 py-1.5 text-left text-sm text-white hover:bg-cinema-gold/15"
                        onMouseDown={(ev) => {
                          ev.preventDefault()
                          void selectMovie(s)
                        }}
                      >
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {movie ? (
              <div className="border border-cinema-line bg-black/30 px-3 py-2 text-xs text-cinema-muted">
                <p className="font-bold text-white">
                  {movie.titlePt || movie.title}
                  {movie.year != null ? ` (${movie.year})` : ''}
                </p>
                <p className="mt-1">
                  {movie.hasClip || movie.clipUrl
                    ? `Já tem clipe: ${movie.clipUrl}`
                    : 'Sem clipe ainda'}
                </p>
              </div>
            ) : null}

            <div>
              <p className="text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
                Arquivo MP4 (~6s)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,.mp4"
                onChange={onPickFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 border border-cinema-gold px-3 py-2 text-[11px] font-bold tracking-wide text-cinema-gold uppercase hover:bg-cinema-gold/10"
              >
                Importar MP4
              </button>
              {localFile ? (
                <p className="mt-1 text-[10px] text-cinema-cyan">
                  {localFile.name} · {(localFile.size / (1024 * 1024)).toFixed(1)}
                  MB — teste o preview antes de salvar
                </p>
              ) : null}
            </div>

            {movie?.hasClip || movie?.clipUrl ? (
              <label className="flex items-center gap-2 text-[11px] text-cinema-muted">
                <input
                  type="checkbox"
                  checked={overwrite}
                  onChange={(e) => setOverwrite(e.target.checked)}
                />
                Sobrescrever clipe atual
              </label>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={saving || !movie || !localFile}
                className="border border-cinema-gold bg-cinema-gold/15 px-4 py-2 text-xs font-bold tracking-wide text-cinema-gold uppercase disabled:opacity-50"
              >
                {saving ? 'Enviando…' : 'Salvar clipe'}
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
              Preview dos takes
            </p>
            <div className="film-grain relative aspect-video w-full overflow-hidden border border-cinema-line bg-[#050308]">
              {previewSrc ? (
                <video
                  ref={videoRef}
                  src={previewSrc}
                  muted
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={onVideoLoaded}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-cinema-muted">
                  Sem vídeo
                </div>
              )}
            </div>
            {videoMeta ? (
              <p className="mt-1 text-[10px] text-cinema-muted">{videoMeta}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-1">
              {TAKE_SECONDS.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  disabled={!previewSrc}
                  onClick={() => {
                    setActiveSlice(sec)
                    setPlayMode('slice')
                    setPlayNonce((n) => n + 1)
                  }}
                  className={`border px-2.5 py-1 text-[10px] font-bold uppercase disabled:opacity-40 ${
                    playMode === 'slice' && activeSlice === sec
                      ? 'border-cinema-gold text-cinema-gold'
                      : 'border-cinema-line text-cinema-muted hover:text-white'
                  }`}
                >
                  {sec}s
                </button>
              ))}
              <button
                type="button"
                disabled={!previewSrc}
                onClick={() => {
                  setActiveSlice(6)
                  setPlayMode('all')
                  setPlayNonce((n) => n + 1)
                }}
                className={`border px-2.5 py-1 text-[10px] font-bold uppercase disabled:opacity-40 ${
                  playMode === 'all'
                    ? 'border-cinema-gold text-cinema-gold'
                    : 'border-cinema-line text-cinema-muted hover:text-white'
                }`}
              >
                Tudo 1–6
              </button>
              <button
                type="button"
                disabled={!previewSrc}
                onClick={stopPreview}
                className="border border-cinema-line px-2.5 py-1 text-[10px] font-bold text-cinema-muted uppercase disabled:opacity-40"
              >
                Stop
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-cinema-muted">
              Cada botão toca só aquele segundo (ex.: 4s = do 3 ao 4). “Tudo
              1–6” roda a sequência completa como no clássico.
            </p>
          </div>
        </form>
      </section>
    </div>
  )
}
