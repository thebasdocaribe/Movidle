import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  fetchAdminTmdbMovie,
  fetchAdminTmdbSearch,
  saveAdminMovieFromTmdb,
  type AdminCastHint,
  type AdminCastJson,
  type AdminTmdbMoviePreview,
  type AdminTmdbSearchHit,
} from '../api'

function slotName(
  entry: { name?: string; none?: boolean } | null | undefined,
  empty = '',
) {
  if (!entry || entry.none) return empty
  return entry.name || empty
}

function setSlotName(
  castJson: AdminCastJson,
  key: 'screenwriter' | 'protagonist' | 'secondary',
  name: string,
): AdminCastJson {
  const trimmed = name.trim()
  const prev = castJson[key]
  if (!trimmed) return { ...castJson, [key]: null }
  return {
    ...castJson,
    [key]: {
      ...(prev && typeof prev === 'object' ? prev : {}),
      name: trimmed,
      image_url:
        prev && typeof prev === 'object' ? prev.image_url ?? null : null,
    },
  }
}

export function AdminPostersPanel() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AdminTmdbSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [loadingMovie, setLoadingMovie] = useState(false)
  const [movie, setMovie] = useState<AdminTmdbMoviePreview | null>(null)
  const [existingId, setExistingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [titlePt, setTitlePt] = useState('')
  const [director, setDirector] = useState('')
  const [screenwriter, setScreenwriter] = useState('')
  const [protagonist, setProtagonist] = useState('')
  const [secondary, setSecondary] = useState('')
  const [antagonist, setAntagonist] = useState('')
  const [noAntagonist, setNoAntagonist] = useState(false)
  const [region, setRegion] = useState('')
  const [castJson, setCastJson] = useState<AdminCastJson | null>(null)
  const [hints, setHints] = useState<AdminCastHint[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const searchTimer = useRef<number | null>(null)

  useEffect(() => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current)
    if (query.trim().length < 2) {
      setResults([])
      setSearchError(null)
      return
    }
    searchTimer.current = window.setTimeout(() => {
      setSearching(true)
      setSearchError(null)
      void fetchAdminTmdbSearch(query)
        .then((res) => setResults(res.results))
        .catch((err) => setSearchError((err as Error).message))
        .finally(() => setSearching(false))
    }, 280)
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current)
    }
  }, [query])

  function applyMovie(
    preview: AdminTmdbMoviePreview,
    existing: string | null,
  ) {
    setMovie(preview)
    setExistingId(existing)
    setTitle(preview.title)
    setTitlePt(preview.titlePt)
    setDirector(preview.director || '')
    setCastJson(preview.castJson)
    setHints(preview.hints)
    setScreenwriter(slotName(preview.castJson.screenwriter))
    setProtagonist(slotName(preview.castJson.protagonist))
    setSecondary(slotName(preview.castJson.secondary))
    const ant = preview.castJson.antagonist
    const none = Boolean(ant && typeof ant === 'object' && ant.none)
    setNoAntagonist(none || !ant)
    setAntagonist(none ? '' : slotName(ant))
    setRegion(
      typeof preview.castJson.region === 'string'
        ? preview.castJson.region
        : '',
    )
    setSaveMsg(null)
    setSaveError(null)
  }

  async function pickResult(hit: AdminTmdbSearchHit) {
    setLoadingMovie(true)
    setSaveError(null)
    try {
      const res = await fetchAdminTmdbMovie(hit.tmdbId)
      applyMovie(res.movie, res.existingId)
    } catch (err) {
      setSaveError((err as Error).message)
    } finally {
      setLoadingMovie(false)
    }
  }

  function buildEditedCastJson(): AdminCastJson {
    const base = castJson || {}
    let next: AdminCastJson = {
      ...base,
      region: region.trim() || base.region || '—',
      director_image_url: base.director_image_url ?? null,
    }
    next = setSlotName(next, 'screenwriter', screenwriter)
    next = setSlotName(next, 'protagonist', protagonist)
    next = setSlotName(next, 'secondary', secondary)
    if (noAntagonist || !antagonist.trim()) {
      next = { ...next, antagonist: { none: true } }
    } else {
      const prev = base.antagonist
      next = {
        ...next,
        antagonist: {
          name: antagonist.trim(),
          image_url:
            prev && typeof prev === 'object' && !prev.none
              ? prev.image_url ?? null
              : null,
        },
      }
    }
    return next
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!movie) return
    setSaving(true)
    setSaveMsg(null)
    setSaveError(null)
    try {
      const edited = buildEditedCastJson()
      const res = await saveAdminMovieFromTmdb({
        tmdbId: movie.tmdbId,
        title: title.trim(),
        titlePt: titlePt.trim() || title.trim(),
        director: director.trim() || null,
        castJson: edited,
      })
      applyMovie(
        {
          ...movie,
          title: res.movie.title,
          titlePt: res.movie.titlePt,
          year: res.movie.year,
          director: res.movie.director,
          posterUrl: res.movie.posterUrl,
          castJson: res.movie.castJson,
          hints: res.movie.hints,
        },
        res.movie.id,
      )
      setSaveMsg(
        res.movie.updated
          ? 'Filme atualizado no catálogo'
          : 'Filme adicionado ao catálogo',
      )
    } catch (err) {
      setSaveError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="panel-frame flex max-h-[min(70vh,640px)] flex-col gap-2 overflow-hidden p-3 lg:sticky lg:top-4">
        <h2 className="font-display text-xl text-white">Busca TMDB</h2>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Título do filme…"
          className="shrink-0 border border-cinema-line bg-black/50 px-2 py-1.5 text-sm text-white outline-none focus:border-cinema-gold"
          autoComplete="off"
        />
        {searching ? (
          <p className="text-xs text-cinema-muted">Buscando…</p>
        ) : searchError ? (
          <p className="text-xs text-cinema-red">{searchError}</p>
        ) : (
          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain">
            {results.length === 0 ? (
              <li className="text-xs text-cinema-muted">
                Digite pelo menos 2 letras
              </li>
            ) : (
              results.map((hit) => (
                <li key={hit.tmdbId}>
                  <button
                    type="button"
                    onClick={() => void pickResult(hit)}
                    className={`flex w-full items-center gap-2 border px-2 py-1.5 text-left ${
                      movie?.tmdbId === hit.tmdbId
                        ? 'border-cinema-gold bg-cinema-gold/10'
                        : 'border-cinema-line hover:border-cinema-muted'
                    }`}
                  >
                    {hit.posterUrl ? (
                      <img
                        src={hit.posterUrl}
                        alt=""
                        className="h-12 w-8 object-cover"
                      />
                    ) : (
                      <div className="h-12 w-8 bg-black/50" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-white">
                        {hit.titlePt || hit.title}
                      </span>
                      <span className="block truncate text-[10px] text-cinema-muted">
                        {hit.year ?? '—'} · TMDB {hit.tmdbId}
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
        <h2 className="font-display text-2xl text-white">Pôster + elenco</h2>
        <p className="mt-1 text-xs text-cinema-muted">
          Busca no TMDB, confere o pôster e os créditos, salva no catálogo.
          Antagonista às vezes erra — ajuste antes de salvar.
        </p>

        {loadingMovie ? (
          <p className="mt-4 text-sm text-cinema-muted">Carregando filme…</p>
        ) : !movie ? (
          <p className="mt-4 text-sm text-cinema-muted">
            Escolha um resultado à esquerda pra começar.
          </p>
        ) : (
          <form
            onSubmit={onSave}
            className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]"
          >
            <div className="flex flex-col gap-3">
              {existingId ? (
                <p className="text-[11px] font-bold tracking-wide text-cinema-cyan uppercase">
                  Já no catálogo — salvar atualiza
                </p>
              ) : (
                <p className="text-[11px] font-bold tracking-wide text-cinema-gold uppercase">
                  Novo no catálogo
                </p>
              )}

              <label className="block text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
                Título (EN / original)
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full border border-cinema-line bg-black/50 px-2 py-2 text-sm text-white outline-none focus:border-cinema-gold"
                  required
                />
              </label>
              <label className="block text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
                Título PT
                <input
                  value={titlePt}
                  onChange={(e) => setTitlePt(e.target.value)}
                  className="mt-1 w-full border border-cinema-line bg-black/50 px-2 py-2 text-sm text-white outline-none focus:border-cinema-gold"
                />
              </label>
              <label className="block text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
                Diretor
                <input
                  value={director}
                  onChange={(e) => setDirector(e.target.value)}
                  className="mt-1 w-full border border-cinema-line bg-black/50 px-2 py-2 text-sm text-white outline-none focus:border-cinema-gold"
                />
              </label>
              <label className="block text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
                Roteirista
                <input
                  value={screenwriter}
                  onChange={(e) => setScreenwriter(e.target.value)}
                  className="mt-1 w-full border border-cinema-line bg-black/50 px-2 py-2 text-sm text-white outline-none focus:border-cinema-gold"
                />
              </label>
              <label className="block text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
                Protagonista
                <input
                  value={protagonist}
                  onChange={(e) => setProtagonist(e.target.value)}
                  className="mt-1 w-full border border-cinema-line bg-black/50 px-2 py-2 text-sm text-white outline-none focus:border-cinema-gold"
                />
              </label>
              <label className="block text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
                Secundário
                <input
                  value={secondary}
                  onChange={(e) => setSecondary(e.target.value)}
                  className="mt-1 w-full border border-cinema-line bg-black/50 px-2 py-2 text-sm text-white outline-none focus:border-cinema-gold"
                />
              </label>
              <div>
                <label className="flex items-center gap-2 text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
                  <input
                    type="checkbox"
                    checked={noAntagonist}
                    onChange={(e) => setNoAntagonist(e.target.checked)}
                  />
                  Sem antagonista
                </label>
                {!noAntagonist ? (
                  <input
                    value={antagonist}
                    onChange={(e) => setAntagonist(e.target.value)}
                    placeholder="Nome do antagonista"
                    className="mt-1 w-full border border-cinema-line bg-black/50 px-2 py-2 text-sm text-white outline-none focus:border-cinema-gold"
                  />
                ) : null}
              </div>
              <label className="block text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
                Origem
                <input
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="mt-1 w-full border border-cinema-line bg-black/50 px-2 py-2 text-sm text-white outline-none focus:border-cinema-gold"
                />
              </label>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="border border-cinema-gold bg-cinema-gold/15 px-4 py-2 text-xs font-bold tracking-wide text-cinema-gold uppercase disabled:opacity-50"
                >
                  {saving ? 'Salvando…' : 'Salvar no catálogo'}
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
                Preview
              </p>
              {movie.posterUrl ? (
                <img
                  src={movie.posterUrl}
                  alt=""
                  className="w-full border border-cinema-line object-cover"
                />
              ) : (
                <div className="flex aspect-[2/3] items-center justify-center border border-dashed border-cinema-line text-xs text-cinema-muted">
                  Sem pôster
                </div>
              )}
              <p className="mt-2 text-[11px] text-cinema-muted">
                {movie.year ?? '—'} · TMDB {movie.tmdbId}
              </p>
              <ul className="mt-3 space-y-1.5">
                {hints.map((h) => (
                  <li
                    key={h.kind}
                    className="flex items-center gap-2 border border-cinema-line bg-black/30 px-2 py-1.5"
                  >
                    {h.imageUrl ? (
                      <img
                        src={h.imageUrl}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-black/50" />
                    )}
                    <span className="min-w-0">
                      <span className="block text-[9px] font-bold tracking-wide text-cinema-muted uppercase">
                        {h.label}
                      </span>
                      <span className="block truncate text-xs text-white">
                        {h.name}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </form>
        )}
        {saveError && !movie ? (
          <p className="mt-3 text-sm text-cinema-red">{saveError}</p>
        ) : null}
      </section>
    </div>
  )
}
