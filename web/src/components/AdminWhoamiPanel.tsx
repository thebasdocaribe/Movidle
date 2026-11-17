import { useEffect, useMemo, useRef, useState } from 'react'
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
type NicheField = { path: 'protagonist' | 'antagonist' | 'story' | 'production'; key: string; label: string }
type NicheBlock = { id: string; title: string; when: (t: WhoamiTraits) => boolean; fields: NicheField[] }

const NICHE_BLOCKS: NicheBlock[] = [
  {
    id: 'animation',
    title: 'Aprofundar · Animação',
    when: (t) => t.format === 'animation' || t.format === 'hybrid',
    fields: [
      { path: 'production', key: 'animation2d', label: 'Animação 2D' },
      { path: 'production', key: 'animation3d', label: 'Animação 3D' },
      { path: 'production', key: 'stopMotion', label: 'Stop-motion' },
      { path: 'production', key: 'anime', label: 'Anime japonês' },
      { path: 'protagonist', key: 'anthropomorphic', label: 'Animal antropomórfico' },
      { path: 'story', key: 'fairyTale', label: 'Baseado em conto de fadas' },
      { path: 'production', key: 'animatedMusical', label: 'Musical animado' },
      { path: 'production', key: 'handDrawnLook', label: 'Estética desenhada à mão' },
    ],
  },
  {
    id: 'horror',
    title: 'Aprofundar · Terror',
    when: (t) => t.tags.includes('horror'),
    fields: [
      { path: 'story', key: 'supernaturalThreat', label: 'Elementos sobrenaturais' },
      { path: 'story', key: 'possession', label: 'Possessão demoníaca' },
      { path: 'antagonist', key: 'humanKiller', label: 'Antagonista assassino humano' },
      { path: 'story', key: 'hauntedHouse', label: 'Casa mal-assombrada' },
      { path: 'antagonist', key: 'monster', label: 'Antagonista criatura/monstro' },
      { path: 'production', key: 'foundFootage', label: 'Found footage' },
      { path: 'story', key: 'zombies', label: 'Zumbis' },
      { path: 'story', key: 'bodyHorror', label: 'Body horror' },
    ],
  },
  {
    id: 'scifi',
    title: 'Aprofundar · Ficção científica',
    when: (t) => t.tags.includes('scifi'),
    fields: [
      { path: 'story', key: 'spaceTravel', label: 'Viagens espaciais' },
      { path: 'story', key: 'aliens', label: 'Extraterrestres' },
      { path: 'story', key: 'ai', label: 'Inteligência artificial' },
      { path: 'story', key: 'timeTravel', label: 'Viagem no tempo' },
      { path: 'story', key: 'dystopia', label: 'Sociedade distópica' },
      { path: 'story', key: 'apocalypse', label: 'Pós-apocalipse' },
      { path: 'story', key: 'robots', label: 'Robôs / androides' },
      { path: 'story', key: 'scienceExperiments', label: 'Experimentos científicos' },
      { path: 'story', key: 'virtualReality', label: 'Realidade virtual / simulada' },
      { path: 'story', key: 'firstContact', label: 'Contato com civilização alienígena' },
    ],
  },
  {
    id: 'action',
    title: 'Aprofundar · Ação',
    when: (t) => t.tags.includes('action'),
    fields: [
      { path: 'protagonist', key: 'spy', label: 'Agente secreto / espião' },
      { path: 'story', key: 'martialArts', label: 'Artes marciais' },
      { path: 'protagonist', key: 'superhero', label: 'Super-herói' },
      { path: 'story', key: 'rescue', label: 'Missão de resgate' },
      { path: 'story', key: 'chase', label: 'Perseguição' },
      { path: 'story', key: 'revenge', label: 'Vingança' },
      { path: 'story', key: 'crimeOrg', label: 'Organização criminosa' },
      { path: 'protagonist', key: 'lawEnforcement', label: 'Policial / agente da lei' },
      { path: 'story', key: 'heist', label: 'Assalto / roubo elaborado' },
      { path: 'story', key: 'saveWorld', label: 'Impedir ameaça de grandes proporções' },
    ],
  },
  {
    id: 'comedy',
    title: 'Aprofundar · Comédia',
    when: (t) => t.tags.includes('comedy'),
    fields: [
      { path: 'story', key: 'darkComedy', label: 'Humor negro' },
      { path: 'story', key: 'absurdComedy', label: 'Humor absurdo' },
      { path: 'story', key: 'satire', label: 'Sátira social / política' },
      { path: 'story', key: 'slapstick', label: 'Humor físico / pastelão' },
      { path: 'protagonist', key: 'comedyDuo', label: 'Dupla cômica' },
      { path: 'story', key: 'teenComedy', label: 'Comédia adolescente' },
      { path: 'story', key: 'misunderstandings', label: 'Confusões e mal-entendidos' },
    ],
  },
  {
    id: 'fantasy',
    title: 'Aprofundar · Fantasia / aventura',
    when: (t) => t.tags.includes('fantasy') || t.tags.includes('adventure'),
    fields: [
      { path: 'story', key: 'magic', label: 'Magia' },
      { path: 'story', key: 'fantasyWorld', label: 'Mundo fictício' },
      { path: 'story', key: 'mythicalCreatures', label: 'Dragões / criaturas mitológicas' },
      { path: 'story', key: 'prophecy', label: 'Profecia' },
      { path: 'story', key: 'powerfulObject', label: 'Objeto poderoso' },
      { path: 'story', key: 'journey', label: 'Jornada por lugares' },
      { path: 'story', key: 'kingdom', label: 'Reinos / monarquias' },
      { path: 'protagonist', key: 'specialDestiny', label: 'Origem / destino especial' },
      { path: 'story', key: 'mythology', label: 'Mitologias / lendas' },
      { path: 'story', key: 'goodVsEvil', label: 'Bem vs mal' },
    ],
  },
  {
    id: 'thriller',
    title: 'Aprofundar · Suspense',
    when: (t) => t.tags.includes('thriller') || t.tags.includes('psychological_thriller'),
    fields: [
      { path: 'story', key: 'investigation', label: 'Investigação criminal' },
      { path: 'protagonist', key: 'detective', label: 'Detetive / investigador' },
      { path: 'story', key: 'serialKiller', label: 'Serial killer' },
      { path: 'story', key: 'identityMystery', label: 'Descobrir identidade de alguém' },
      { path: 'story', key: 'bigTwist', label: 'Grande reviravolta' },
      { path: 'story', key: 'hunted', label: 'Protagonista perseguido' },
      { path: 'story', key: 'conspiracy', label: 'Conspiração' },
      { path: 'story', key: 'centralMystery', label: 'Mistério central' },
      { path: 'story', key: 'crime', label: 'Crime a solucionar' },
      { path: 'story', key: 'trustIssues', label: 'Não pode confiar nas pessoas' },
    ],
  },
  {
    id: 'drama',
    title: 'Aprofundar · Drama',
    when: (t) => t.tags.includes('drama'),
    fields: [
      { path: 'protagonist', key: 'basedOnRealPerson', label: 'Baseado em pessoa real' },
      { path: 'story', key: 'familyIssues', label: 'Problemas familiares' },
      { path: 'story', key: 'socialInequality', label: 'Desigualdade social' },
      { path: 'story', key: 'familyConflict', label: 'Relacionamento familiar complicado' },
      { path: 'protagonist', key: 'addiction', label: 'Protagonista com vício' },
      { path: 'story', key: 'personalTragedy', label: 'Tragédia pessoal' },
      { path: 'story', key: 'prison', label: 'Prisão' },
      { path: 'story', key: 'discrimination', label: 'Preconceito / discriminação' },
      { path: 'story', key: 'psychologicalConflict', label: 'Conflitos psicológicos' },
      { path: 'story', key: 'politicalSocial', label: 'Questões políticas / sociais' },
    ],
  },
  {
    id: 'romance',
    title: 'Aprofundar · Romance',
    when: (t) => t.tags.includes('romance'),
    fields: [
      { path: 'story', key: 'coupleLeads', label: 'Casal como protagonistas' },
      { path: 'story', key: 'forbiddenLove', label: 'Romance proibido' },
      { path: 'story', key: 'impossibleLove', label: 'Amor impossível' },
      { path: 'story', key: 'historicalEra', label: 'Época histórica' },
      { path: 'story', key: 'loveTriangle', label: 'Triângulo amoroso' },
      { path: 'story', key: 'coupleSeparation', label: 'Separação do casal' },
      { path: 'story', key: 'classDifferenceRomance', label: 'Classes sociais diferentes' },
      { path: 'story', key: 'loveAtFirstSight', label: 'Amor à primeira vista' },
    ],
  },
  {
    id: 'western',
    title: 'Aprofundar · Faroeste',
    when: (t) => t.tags.includes('western') || t.tags.includes('spaghetti_western'),
    fields: [
      { path: 'story', key: 'oldWest', label: 'Velho Oeste americano' },
      { path: 'protagonist', key: 'gunslinger', label: 'Pistoleiro' },
      { path: 'story', key: 'landDispute', label: 'Disputa por terras' },
      { path: 'story', key: 'sheriffOutlaws', label: 'Xerifes e foras da lei' },
      { path: 'protagonist', key: 'bountyHunter', label: 'Caçador de recompensas' },
      { path: 'story', key: 'indigenousConflict', label: 'Conflito com povos indígenas' },
      { path: 'story', key: 'gunDuel', label: 'Duelos de armas' },
    ],
  },
  {
    id: 'war',
    title: 'Aprofundar · Guerra / história',
    when: (t) => t.tags.includes('war') || t.story.war === true,
    fields: [
      { path: 'story', key: 'ww2', label: 'Segunda Guerra Mundial' },
      { path: 'story', key: 'ww1', label: 'Primeira Guerra Mundial' },
      { path: 'story', key: 'realBattle', label: 'Baseado em batalha real' },
      { path: 'protagonist', key: 'soldier', label: 'Protagonista soldado' },
      { path: 'story', key: 'militaryGroup', label: 'Grupo de militares' },
      { path: 'story', key: 'holocaust', label: 'Holocausto' },
      { path: 'story', key: 'revolution', label: 'Revolução' },
      { path: 'story', key: 'historicalFigure', label: 'Figura histórica conhecida' },
      { path: 'story', key: 'antiquity', label: 'Antiguidade' },
      { path: 'story', key: 'coldWar', label: 'Guerra Fria' },
    ],
  },
  {
    id: 'musical',
    title: 'Aprofundar · Musical',
    when: (t) => t.tags.includes('musical') || t.production.animatedMusical === true,
    fields: [
      { path: 'story', key: 'charactersSing', label: 'Personagens cantam' },
      { path: 'story', key: 'musicalNumbers', label: 'Números de dança' },
      { path: 'story', key: 'musicIndustry', label: 'Mundo da música' },
      { path: 'protagonist', key: 'musician', label: 'Protagonista músico / cantor' },
      { path: 'production', key: 'basedOnPlay', label: 'Baseado em musical teatral' },
      { path: 'production', key: 'originalSongs', label: 'Músicas originais' },
      { path: 'story', key: 'band', label: 'Banda / grupo musical' },
      { path: 'production', key: 'animatedMusical', label: 'Musical animado' },
    ],
  },
  {
    id: 'documentary',
    title: 'Aprofundar · Documentário',
    when: (t) => t.tags.includes('documentary') || t.basedOnTrueEvents === true,
    fields: [
      { path: 'production', key: 'realPeople', label: 'Acompanha pessoas reais' },
      { path: 'production', key: 'interviews', label: 'Baseado em entrevistas' },
      { path: 'story', key: 'environment', label: 'Ambiental / natureza' },
      { path: 'story', key: 'historicalEvent', label: 'Acontecimento histórico real' },
      { path: 'production', key: 'investigativeDoc', label: 'Documentário investigativo' },
      { path: 'production', key: 'biographyDoc', label: 'Vida de uma pessoa específica' },
      { path: 'production', key: 'musicDoc', label: 'Sobre música / artistas' },
      { path: 'production', key: 'archiveFootage', label: 'Imagens de arquivo' },
    ],
  },
  {
    id: 'family',
    title: 'Aprofundar · Infantil / família',
    // Só com tag Infantil — teen/child em terror NÃO abre este bloco
    when: (t) => t.tags.includes('kids'),
    fields: [
      { path: 'protagonist', key: 'child', label: 'Protagonista criança' },
      { path: 'story', key: 'familyLeads', label: 'Protagonizada por uma família' },
      { path: 'story', key: 'talkingAnimals', label: 'Animais que falam' },
      { path: 'story', key: 'moralLesson', label: 'Lição moral explícita' },
      { path: 'story', key: 'fairyTale', label: 'Conto infantil' },
      { path: 'story', key: 'absentParents', label: 'Ausência dos pais' },
      { path: 'story', key: 'childCreatureFriendship', label: 'Amizade criança + criatura' },
    ],
  },
]

const GENERAL_CATS = new Set([
  'identity',
  'era',
  'genre',
  'characters',
  'story',
  'production',
])

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

  const openNicheIds = useMemo(() => {
    if (!traits) return new Set<string>()
    return new Set(
      NICHE_BLOCKS.filter((b) => b.when(traits)).map((b) => `niche_${b.id}`),
    )
  }, [traits])

  const visiblePreview = useMemo(() => {
    if (!detail) return []
    return detail.preview.filter((p) => {
      const cat = p.category || ''
      if (!cat || GENERAL_CATS.has(cat)) return true
      return openNicheIds.has(cat)
    })
  }, [detail, openNicheIds])

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
        ) : list.length === 0 ? (
          <p className="rounded-md border border-dashed border-cinema-line/70 px-3 py-6 text-center text-[12px] text-cinema-muted">
            Nenhum filme na pool curada
            {query.trim() ? ' para essa busca' : ''}.
          </p>
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
                              e.target.value === 'live_action' ||
                              e.target.value === 'hybrid'
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
                  <option value="hybrid">Mistura animação + live-action</option>
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
                label="Adaptação de outra obra"
                value={traits.isAdaptation ?? null}
                onChange={(v) => setBool('isAdaptation', v)}
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
              <TriToggle
                label="Independente"
                value={traits.independent}
                onChange={(v) => setBool('independent', v)}
              />
            </div>

            <h3 className="font-display text-xl text-cinema-gold">
              Personagens
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ['male', 'Homem'],
                  ['female', 'Mulher'],
                  ['child', 'Criança'],
                  ['teen', 'Adolescente'],
                  ['animal', 'Animal'],
                  ['fantastical', 'Criatura fantástica'],
                  ['alien', 'Extraterrestre'],
                  ['monster', 'Monstro'],
                  ['villain', 'Vilão (protagonista)'],
                  ['hero', 'Herói'],
                  ['basedOnRealPerson', 'Baseado em pessoa real'],
                  ['powers', 'Protagonista com poderes'],
                  ['human', 'Humano'],
                  ['multiple', 'Vários protagonistas'],
                ] as const
              ).map(([key, label]) => (
                <TriToggle
                  key={key}
                  label={label}
                  value={(traits.protagonist[key] as Tri) ?? null}
                  onChange={(v) =>
                    setTraits((p) =>
                      p
                        ? {
                            ...p,
                            protagonist: { ...p.protagonist, [key]: v },
                          }
                        : p,
                    )
                  }
                />
              ))}
              <TriToggle
                label="Tem antagonista principal"
                value={(traits.antagonist.exists as Tri) ?? null}
                onChange={(v) =>
                  setTraits((p) =>
                    p
                      ? { ...p, antagonist: { ...p.antagonist, exists: v } }
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
                  Espécie (ex.: robô)
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
            </div>

            <h3 className="font-display text-xl text-cinema-gold">História</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ['onEarth', 'Na Terra'],
                  ['inSpace', 'No espaço'],
                  ['inPast', 'No passado'],
                  ['future', 'No futuro'],
                  ['historicalEra', 'Época histórica'],
                  ['inCity', 'Em cidade'],
                  ['investigation', 'Investigação'],
                  ['journey', 'Jornada / viagem'],
                  ['survival', 'Sobrevivência'],
                  ['revenge', 'Vingança'],
                  ['war', 'Guerra'],
                  ['crime', 'Crime'],
                  ['supernaturalThreat', 'Ameaça sobrenatural'],
                  ['charactersHavePowers', 'Personagens com poderes'],
                ] as const
              ).map(([key, label]) => (
                <TriToggle
                  key={key}
                  label={label}
                  value={(traits.story[key] as Tri) ?? null}
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
                  ['oscar', 'Ganhou Oscar (qualquer categoria)'],
                  ['oscarNominated', 'Indicado a Oscar (qualquer categoria)'],
                  ['oscarBestPictureNom', 'Indicado a Melhor Filme'],
                  ['oscarBestPicture', 'Ganhou Melhor Filme'],
                  ['adaptedFromGame', 'Baseado em videogame'],
                  ['adaptedFromComics', 'De HQ'],
                  ['basedOnPlay', 'De peça teatral'],
                  ['theatricalRelease', 'Lançado nos cinemas'],
                  ['hasRemake', 'Tem refilmagem'],
                  ['isRemake', 'É remake'],
                ] as const
              ).map(([key, label]) => (
                <TriToggle
                  key={key}
                  label={label}
                  value={(traits.production[key] as Tri) ?? null}
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

            <p className="rounded-md border border-dashed border-cinema-line/60 px-3 py-2 text-[11px] text-cinema-muted">
              Blocos de aprofundamento aparecem conforme as tags/formato
              (ex.: marque <span className="text-cinema-gold">Ação</span> para
              curar espião, perseguição, heist…).
            </p>

            {NICHE_BLOCKS.filter((b) => b.when(traits)).map((block) => (
              <div key={block.id} className="flex flex-col gap-2">
                <h3 className="font-display text-xl text-cinema-gold">
                  {block.title}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {block.fields.map((f) => (
                    <TriToggle
                      key={`${block.id}-${f.path}-${f.key}`}
                      label={f.label}
                      value={(traits[f.path][f.key] as Tri) ?? null}
                      onChange={(v) =>
                        setTraits((p) => {
                          if (!p) return p
                          return {
                            ...p,
                            [f.path]: { ...p[f.path], [f.key]: v },
                          }
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            ))}

            <h3 className="font-display text-xl text-cinema-gold">
              Preview das respostas
            </h3>
            <p className="text-[10px] text-cinema-muted">
              Só gerais + nichos liberados pelas tags atuais. Salve pra
              atualizar o preview.
            </p>
            <ul className="max-h-56 overflow-y-auto border border-cinema-line/50 bg-black/30 p-2 text-[11px]">
              {visiblePreview.map((p) => (
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
