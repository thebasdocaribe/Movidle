import { useEffect, useRef, useState } from 'react'
import {
  fetchAdminWhoamiMovie,
  fetchAdminWhoamiMovies,
  patchAdminWhoamiTraits,
  type AdminWhoamiMovieCard,
  type AdminWhoamiMovieDetail,
  type WhoamiAnswer,
  type WhoamiTraits,
} from '../api'
import { AdminWhoamiQuestionsPanel } from './AdminWhoamiQuestionsPanel'

type Tri = boolean | null

const ANSWER_CLASS: Record<WhoamiAnswer, string> = {
  yes: 'text-emerald-400',
  no: 'text-cinema-red',
  partial: 'text-amber-300',
  unknown: 'text-cinema-muted',
}

function TriToggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: Tri
  onChange: (v: Tri) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px]">
      <span className="font-bold tracking-wide text-cinema-muted uppercase">
        {label}
      </span>
      <div className="flex gap-1">
        {(
          [
            [true, 'Sim'],
            [false, 'Não'],
            [null, '—'],
          ] as const
        ).map(([v, text]) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={`flex-1 border px-2 py-1 text-[10px] font-bold uppercase ${
              value === v
                ? 'border-cinema-gold bg-cinema-gold/15 text-cinema-gold'
                : 'border-cinema-line text-cinema-muted'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </label>
  )
}

function ChipMulti({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: { id: string; label: string }[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold tracking-wide text-cinema-muted uppercase">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.includes(o.id)
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onToggle(o.id)}
              className={`border px-2 py-1 text-[11px] ${
                on
                  ? 'border-cinema-gold bg-cinema-gold/15 text-cinema-gold'
                  : 'border-cinema-line text-cinema-muted'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function AdminWhoamiPanel() {
  const [subTab, setSubTab] = useState<'movies' | 'questions'>('movies')
  const [query, setQuery] = useState('')
  const [list, setList] = useState<AdminWhoamiMovieCard[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<AdminWhoamiMovieDetail | null>(null)
  const [studiosMeta, setStudiosMeta] = useState<{ id: string; label: string }[]>(
    [],
  )
  const [tagsMeta, setTagsMeta] = useState<{ id: string; label: string }[]>([])
  const [traits, setTraits] = useState<WhoamiTraits | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const searchTimer = useRef<number | null>(null)

  function loadList(q: string) {
    setLoadingList(true)
    setListError(null)
    void fetchAdminWhoamiMovies(q)
      .then((res) => setList(res.movies))
      .catch((err) => setListError((err as Error).message))
      .finally(() => setLoadingList(false))
  }

  useEffect(() => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => loadList(query), 220)
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current)
    }
  }, [query])

  async function openMovie(id: string) {
    setSelectedId(id)
    setLoadingDetail(true)
    setSaveMsg(null)
    setSaveError(null)
    try {
      const res = await fetchAdminWhoamiMovie(id)
      setDetail(res.movie)
      setTraits(structuredClone(res.movie.traits))
      setStudiosMeta(res.meta.studios)
      setTagsMeta(res.meta.tags)
    } catch (err) {
      setSaveError((err as Error).message)
      setDetail(null)
      setTraits(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  async function save() {
    if (!selectedId || !traits) return
    setSaving(true)
    setSaveMsg(null)
    setSaveError(null)
    try {
      const res = await patchAdminWhoamiTraits(selectedId, traits)
      setDetail(res.movie)
      setTraits(structuredClone(res.movie.traits))
      setSaveMsg('Traits salvos')
      loadList(query)
    } catch (err) {
      setSaveError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function setBool<K extends keyof WhoamiTraits>(key: K, value: Tri) {
    setTraits((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ['movies', 'Traits dos filmes'],
            ['questions', 'Perguntas'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className={`border px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase ${
              subTab === id
                ? 'border-cinema-gold bg-cinema-gold/15 text-cinema-gold'
                : 'border-cinema-line text-cinema-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === 'questions' ? (
        <AdminWhoamiQuestionsPanel />
      ) : (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <section className="panel-frame flex flex-col gap-3 p-3">
        <div>
          <h2 className="font-display text-2xl text-cinema-gold">Filmes</h2>
          <p className="text-[11px] text-cinema-muted">
            Quanto mais traits você preenche, menos “NÃO SEI” o jogo responde.
            Campo vazio = informação indisponível (nunca inventa NÃO).
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar filme…"
          className="guess-input !min-h-0 py-2 text-sm"
        />
        {loadingList ? (
          <p className="text-sm text-cinema-muted">Carregando…</p>
        ) : listError ? (
          <p className="text-sm text-cinema-red">{listError}</p>
        ) : (
          <ul className="max-h-[28rem] overflow-y-auto border border-cinema-line/50">
            {list.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => void openMovie(m.id)}
                  className={`flex w-full items-center gap-2 border-b border-cinema-line/40 px-2 py-2 text-left hover:bg-cinema-gold/10 ${
                    selectedId === m.id ? 'bg-cinema-gold/15' : ''
                  }`}
                >
                  {m.posterUrl ? (
                    <img
                      src={m.posterUrl}
                      alt=""
                      className="h-12 w-8 object-cover"
                    />
                  ) : (
                    <span className="flex h-12 w-8 items-center justify-center border border-cinema-line text-[10px] text-cinema-muted">
                      —
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">
                      {m.titlePt}
                      {m.year ? ` (${m.year})` : ''}
                    </span>
                    <span className="text-[10px] text-cinema-muted">
                      Traits {m.completeness.pct}%
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel-frame flex flex-col gap-3 p-3">
        {!selectedId ? (
          <p className="text-sm text-cinema-muted">
            Selecione um filme à esquerda.
          </p>
        ) : loadingDetail ? (
          <p className="text-sm text-cinema-muted">Carregando filme…</p>
        ) : !detail || !traits ? (
          <p className="text-sm text-cinema-red">
            {saveError || 'Não deu pra carregar'}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-2xl text-white">
                  {detail.titlePt}
                  {detail.year ? ` (${detail.year})` : ''}
                </h2>
                <p className="text-[11px] text-cinema-muted">
                  Completude {detail.completeness.filled}/
                  {detail.completeness.total} ({detail.completeness.pct}%)
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="mode-btn mode-btn-primary mode-btn-inline px-4 py-2 font-display text-lg disabled:opacity-40"
              >
                {saving ? '…' : 'SALVAR'}
              </button>
            </div>
            {saveMsg ? (
              <p className="text-sm text-cinema-cyan">{saveMsg}</p>
            ) : null}
            {saveError ? (
              <p className="text-sm text-cinema-red">{saveError}</p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-[11px]">
                <span className="font-bold text-cinema-muted uppercase">
                  Formato
                </span>
                <select
                  value={traits.format || ''}
                  onChange={(e) =>
                    setTraits((p) =>
                      p
                        ? {
                            ...p,
                            format:
                              e.target.value === 'animation' ||
                              e.target.value === 'live_action'
                                ? e.target.value
                                : null,
                          }
                        : p,
                    )
                  }
                  className="guess-input !min-h-0 py-2 text-sm"
                >
                  <option value="">—</option>
                  <option value="animation">Animação</option>
                  <option value="live_action">Live-action</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[11px]">
                <span className="font-bold text-cinema-muted uppercase">
                  Região
                </span>
                <input
                  value={traits.region || ''}
                  onChange={(e) =>
                    setTraits((p) =>
                      p ? { ...p, region: e.target.value || null } : p,
                    )
                  }
                  className="guess-input !min-h-0 py-2 text-sm"
                  placeholder="EUA, Japão…"
                />
              </label>
            </div>

            <ChipMulti
              label="Estúdios"
              options={studiosMeta}
              selected={traits.studios}
              onToggle={(id) =>
                setTraits((p) => {
                  if (!p) return p
                  const has = p.studios.includes(id)
                  return {
                    ...p,
                    studios: has
                      ? p.studios.filter((s) => s !== id)
                      : [...p.studios, id],
                  }
                })
              }
            />
            <ChipMulti
              label="Tags / gêneros"
              options={tagsMeta}
              selected={traits.tags}
              onToggle={(id) =>
                setTraits((p) => {
                  if (!p) return p
                  const has = p.tags.includes(id)
                  return {
                    ...p,
                    tags: has
                      ? p.tags.filter((s) => s !== id)
                      : [...p.tags, id],
                  }
                })
              }
            />

            <div className="grid gap-2 sm:grid-cols-2">
              <TriToggle
                label="Baseado em livro"
                value={traits.basedOnBook}
                onChange={(v) => setBool('basedOnBook', v)}
              />
              <TriToggle
                label="Franquia"
                value={traits.franchise}
                onChange={(v) => setBool('franchise', v)}
              />
              <TriToggle
                label="Baseado em fatos reais"
                value={traits.basedOnTrueEvents}
                onChange={(v) => setBool('basedOnTrueEvents', v)}
              />
              <TriToggle
                label="Clássico"
                value={traits.classic}
                onChange={(v) => setBool('classic', v)}
              />
            </div>

            <h3 className="font-display text-xl text-cinema-gold">
              Personagens
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <TriToggle
                label="Protagonista humano"
                value={traits.protagonist.human}
                onChange={(v) =>
                  setTraits((p) =>
                    p
                      ? { ...p, protagonist: { ...p.protagonist, human: v } }
                      : p,
                  )
                }
              />
              <TriToggle
                label="Protagonista animal"
                value={traits.protagonist.animal}
                onChange={(v) =>
                  setTraits((p) =>
                    p
                      ? { ...p, protagonist: { ...p.protagonist, animal: v } }
                      : p,
                  )
                }
              />
              <TriToggle
                label="Tem poderes"
                value={traits.protagonist.powers}
                onChange={(v) =>
                  setTraits((p) =>
                    p
                      ? { ...p, protagonist: { ...p.protagonist, powers: v } }
                      : p,
                  )
                }
              />
              <TriToggle
                label="Vários protagonistas"
                value={traits.protagonist.multiple}
                onChange={(v) =>
                  setTraits((p) =>
                    p
                      ? {
                          ...p,
                          protagonist: { ...p.protagonist, multiple: v },
                        }
                      : p,
                  )
                }
              />
              <label className="flex flex-col gap-1 text-[11px]">
                <span className="font-bold text-cinema-muted uppercase">
                  Cor do protagonista
                </span>
                <input
                  value={traits.protagonist.color || ''}
                  onChange={(e) =>
                    setTraits((p) =>
                      p
                        ? {
                            ...p,
                            protagonist: {
                              ...p.protagonist,
                              color: e.target.value || null,
                            },
                          }
                        : p,
                    )
                  }
                  className="guess-input !min-h-0 py-2 text-sm"
                  placeholder="green, azul…"
                />
              </label>
              <label className="flex flex-col gap-1 text-[11px]">
                <span className="font-bold text-cinema-muted uppercase">
                  Espécie
                </span>
                <input
                  value={traits.protagonist.species || ''}
                  onChange={(e) =>
                    setTraits((p) =>
                      p
                        ? {
                            ...p,
                            protagonist: {
                              ...p.protagonist,
                              species: e.target.value || null,
                            },
                          }
                        : p,
                    )
                  }
                  className="guess-input !min-h-0 py-2 text-sm"
                  placeholder="ogro, robô…"
                />
              </label>
              <TriToggle
                label="Tem antagonista"
                value={traits.antagonist.exists}
                onChange={(v) =>
                  setTraits((p) =>
                    p
                      ? { ...p, antagonist: { ...p.antagonist, exists: v } }
                      : p,
                  )
                }
              />
              <TriToggle
                label="Vilão humano"
                value={traits.antagonist.human}
                onChange={(v) =>
                  setTraits((p) =>
                    p
                      ? { ...p, antagonist: { ...p.antagonist, human: v } }
                      : p,
                  )
                }
              />
              <TriToggle
                label="Tem príncipe"
                value={traits.antagonist.prince}
                onChange={(v) =>
                  setTraits((p) =>
                    p
                      ? { ...p, antagonist: { ...p.antagonist, prince: v } }
                      : p,
                  )
                }
              />
            </div>

            <h3 className="font-display text-xl text-cinema-gold">História</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ['kingdom', 'Reino'],
                  ['future', 'Futuro'],
                  ['journey', 'Viagem'],
                  ['saveSomeone', 'Salvar alguém'],
                  ['revenge', 'Vingança'],
                  ['fantasyWorld', 'Universo fantástico'],
                  ['prophecy', 'Profecia'],
                ] as const
              ).map(([key, label]) => (
                <TriToggle
                  key={key}
                  label={label}
                  value={traits.story[key]}
                  onChange={(v) =>
                    setTraits((p) =>
                      p ? { ...p, story: { ...p.story, [key]: v } } : p,
                    )
                  }
                />
              ))}
            </div>

            <h3 className="font-display text-xl text-cinema-gold">
              Produção
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ['oscar', 'Oscar'],
                  ['famousSong', 'Música famosa'],
                  ['sequel', 'Sequência'],
                  ['controversial', 'Controverso'],
                  ['horrorDirector', 'Diretor de terror'],
                  ['postCredits', 'Pós-créditos'],
                ] as const
              ).map(([key, label]) => (
                <TriToggle
                  key={key}
                  label={label}
                  value={traits.production[key]}
                  onChange={(v) =>
                    setTraits((p) =>
                      p
                        ? {
                            ...p,
                            production: { ...p.production, [key]: v },
                          }
                        : p,
                    )
                  }
                />
              ))}
            </div>

            <h3 className="font-display text-xl text-cinema-gold">
              Preview das respostas
            </h3>
            <ul className="max-h-56 overflow-y-auto border border-cinema-line/50 bg-black/30 p-2 text-[11px]">
              {detail.preview.map((p) => (
                <li
                  key={p.questionId}
                  className="flex justify-between gap-2 border-b border-cinema-line/30 py-1"
                >
                  <span className="text-cinema-muted">{p.text}</span>
                  <span className={`shrink-0 font-bold ${ANSWER_CLASS[p.answer]}`}>
                    {p.answerLabel}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
      )}
    </div>
  )
}
