import { useEffect, useMemo, useState } from 'react'
import {
  deleteAdminWhoamiQuestion,
  fetchAdminWhoamiQuestions,
  saveAdminWhoamiCategory,
  saveAdminWhoamiQuestion,
  type AdminWhoamiQuestion,
  type WhoamiRule,
} from '../api'

type Meta = {
  categories: { id: string; label: string; sort_order: number }[]
  ruleTypes: { id: string; label: string; needs: string }[]
  boolFields: { id: string; label: string }[]
  boolPaths: { id: string; label: string }[]
  eqPaths: { id: string; label: string }[]
  studios: { id: string; label: string }[]
  tags: { id: string; label: string }[]
}

function emptyRule(type = 'bool'): WhoamiRule {
  if (type === 'format') return { type, value: 'animation' }
  if (type === 'studio') return { type, value: 'disney' }
  if (type === 'tag') return { type, value: 'comedy' }
  if (type === 'bool') return { type, field: 'franchise' }
  if (type === 'bool_path') return { type, path: 'protagonist.human' }
  if (type === 'eq') return { type, path: 'protagonist.color', value: 'green' }
  if (type === 'year_range') return { type, min: 1990, max: 1999 }
  if (type === 'year_gt') return { type, value: 2010 }
  if (type === 'region') {
    return { type, aliases: ['eua', 'usa'] }
  }
  if (type === 'species_includes') {
    return { type, value: 'robot', aliases: ['robô'] }
  }
  return { type }
}

function ruleSummary(rule: WhoamiRule): string {
  if (!rule?.type) return '—'
  if (rule.type === 'format') return `formato = ${rule.value}`
  if (rule.type === 'studio') return `estúdio = ${rule.value}`
  if (rule.type === 'tag') return `tag = ${rule.value}`
  if (rule.type === 'bool') return `${rule.field}?`
  if (rule.type === 'bool_path') return `${rule.path}?`
  if (rule.type === 'eq') return `${rule.path} = ${rule.value}`
  if (rule.type === 'year_range') return `ano ${rule.min}–${rule.max}`
  if (rule.type === 'year_gt') return `ano > ${rule.value}`
  if (rule.type === 'region') return `região ∈ ${(rule.aliases || []).join(',')}`
  if (rule.type === 'species_includes') return `espécie contém ${rule.value}`
  return rule.type
}

export function AdminWhoamiQuestionsPanel() {
  const [meta, setMeta] = useState<Meta | null>(null)
  const [questions, setQuestions] = useState<AdminWhoamiQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState('all')
  const [editing, setEditing] = useState<AdminWhoamiQuestion | null>(null)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [newCatLabel, setNewCatLabel] = useState('')

  // form
  const [formId, setFormId] = useState<string | undefined>()
  const [formText, setFormText] = useState('')
  const [formCategory, setFormCategory] = useState('identity')
  const [formActive, setFormActive] = useState(true)
  const [formSort, setFormSort] = useState(100)
  const [formRule, setFormRule] = useState<WhoamiRule>(emptyRule('bool'))

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchAdminWhoamiQuestions()
      setMeta({
        categories: res.categories,
        ruleTypes: res.ruleTypes,
        boolFields: res.boolFields,
        boolPaths: res.boolPaths,
        eqPaths: res.eqPaths,
        studios: res.studios,
        tags: res.tags,
      })
      setQuestions(res.questions)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const filtered = useMemo(() => {
    if (filterCat === 'all') return questions
    return questions.filter((q) => q.categoryId === filterCat)
  }, [questions, filterCat])

  function openCreate() {
    setCreating(true)
    setEditing(null)
    setFormId(undefined)
    setFormText('')
    setFormCategory(meta?.categories[0]?.id || 'identity')
    setFormActive(true)
    setFormSort(100)
    setFormRule(emptyRule('bool'))
    setMsg(null)
  }

  function openEdit(q: AdminWhoamiQuestion) {
    setCreating(false)
    setEditing(q)
    setFormId(q.id)
    setFormText(q.text)
    setFormCategory(q.categoryId)
    setFormActive(q.active)
    setFormSort(q.sortOrder)
    setFormRule(q.rule?.type ? { ...q.rule } : emptyRule('bool'))
    setMsg(null)
  }

  function closeForm() {
    setCreating(false)
    setEditing(null)
  }

  async function save() {
    setBusy(true)
    setMsg(null)
    try {
      await saveAdminWhoamiQuestion({
        id: formId,
        text: formText.trim(),
        categoryId: formCategory,
        rule: formRule,
        sortOrder: formSort,
        active: formActive,
      })
      setMsg(formId ? 'Pergunta atualizada' : 'Pergunta criada')
      closeForm()
      await reload()
    } catch (err) {
      setMsg((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Apagar esta pergunta?')) return
    setBusy(true)
    try {
      await deleteAdminWhoamiQuestion(id)
      if (formId === id) closeForm()
      await reload()
    } catch (err) {
      setMsg((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function addCategory() {
    const label = newCatLabel.trim()
    if (!label) return
    setBusy(true)
    try {
      await saveAdminWhoamiCategory({ label })
      setNewCatLabel('')
      await reload()
    } catch (err) {
      setMsg((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const showForm = creating || editing

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl text-cinema-gold">Perguntas</h2>
          <p className="text-[11px] text-cinema-muted">
            Crie ou edite perguntas e a regra que liga cada uma a um trait.
            Sem trait no filme → o jogo responde NÃO SEI.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="mode-btn mode-btn-primary mode-btn-inline px-4 py-2 font-display text-lg"
        >
          NOVA PERGUNTA
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={newCatLabel}
          onChange={(e) => setNewCatLabel(e.target.value)}
          placeholder="Nova categoria…"
          className="guess-input !min-h-0 max-w-xs py-1.5 text-sm"
        />
        <button
          type="button"
          disabled={busy || !newCatLabel.trim()}
          onClick={() => void addCategory()}
          className="border border-cinema-line px-3 py-1.5 text-[11px] font-bold text-cinema-gold uppercase disabled:opacity-40"
        >
          + Categoria
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setFilterCat('all')}
          className={`border px-2 py-1 text-[10px] font-bold uppercase ${
            filterCat === 'all'
              ? 'border-cinema-gold text-cinema-gold'
              : 'border-cinema-line text-cinema-muted'
          }`}
        >
          Todas
        </button>
        {(meta?.categories || []).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFilterCat(c.id)}
            className={`border px-2 py-1 text-[10px] font-bold uppercase ${
              filterCat === c.id
                ? 'border-cinema-gold text-cinema-gold'
                : 'border-cinema-line text-cinema-muted'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {msg ? <p className="text-sm text-cinema-cyan">{msg}</p> : null}
      {loading ? (
        <p className="text-sm text-cinema-muted">Carregando…</p>
      ) : error ? (
        <p className="text-sm text-cinema-red">{error}</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <ul className="max-h-[32rem] overflow-y-auto border border-cinema-line/50">
            {filtered.map((q) => (
              <li
                key={q.id}
                className={`border-b border-cinema-line/40 px-2 py-2 ${
                  !q.active ? 'opacity-50' : ''
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => openEdit(q)}
                >
                  <p className="text-sm text-white">{q.text}</p>
                  <p className="text-[10px] text-cinema-muted">
                    {q.categoryId} · {ruleSummary(q.rule)}
                    {!q.active ? ' · inativa' : ''}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          {showForm && meta ? (
            <div className="panel-frame flex flex-col gap-2 p-3">
              <h3 className="font-display text-xl text-white">
                {formId ? 'Editar' : 'Nova'} pergunta
              </h3>
              <label className="flex flex-col gap-1 text-[11px]">
                <span className="font-bold text-cinema-muted uppercase">
                  Texto
                </span>
                <input
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  className="guess-input !min-h-0 py-2 text-sm"
                  placeholder="Sou uma animação?"
                />
              </label>
              <label className="flex flex-col gap-1 text-[11px]">
                <span className="font-bold text-cinema-muted uppercase">
                  Categoria
                </span>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="guess-input !min-h-0 py-2 text-sm"
                >
                  {meta.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[11px]">
                <span className="font-bold text-cinema-muted uppercase">
                  Tipo de regra
                </span>
                <select
                  value={formRule.type}
                  onChange={(e) => setFormRule(emptyRule(e.target.value))}
                  className="guess-input !min-h-0 py-2 text-sm"
                >
                  {meta.ruleTypes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>

              {formRule.type === 'format' ? (
                <select
                  value={String(formRule.value || 'animation')}
                  onChange={(e) =>
                    setFormRule({ type: 'format', value: e.target.value })
                  }
                  className="guess-input !min-h-0 py-2 text-sm"
                >
                  <option value="animation">Animação</option>
                  <option value="live_action">Live-action</option>
                </select>
              ) : null}

              {formRule.type === 'studio' ? (
                <select
                  value={String(formRule.value || 'disney')}
                  onChange={(e) =>
                    setFormRule({ type: 'studio', value: e.target.value })
                  }
                  className="guess-input !min-h-0 py-2 text-sm"
                >
                  {meta.studios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              ) : null}

              {formRule.type === 'tag' ? (
                <select
                  value={String(formRule.value || 'comedy')}
                  onChange={(e) =>
                    setFormRule({ type: 'tag', value: e.target.value })
                  }
                  className="guess-input !min-h-0 py-2 text-sm"
                >
                  {meta.tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              ) : null}

              {formRule.type === 'bool' ? (
                <select
                  value={formRule.field || 'franchise'}
                  onChange={(e) =>
                    setFormRule({ type: 'bool', field: e.target.value })
                  }
                  className="guess-input !min-h-0 py-2 text-sm"
                >
                  {meta.boolFields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              ) : null}

              {formRule.type === 'bool_path' ? (
                <select
                  value={formRule.path || 'protagonist.human'}
                  onChange={(e) =>
                    setFormRule({ type: 'bool_path', path: e.target.value })
                  }
                  className="guess-input !min-h-0 py-2 text-sm"
                >
                  {meta.boolPaths.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              ) : null}

              {formRule.type === 'eq' ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    value={formRule.path || 'protagonist.color'}
                    onChange={(e) =>
                      setFormRule((r) => ({ ...r, type: 'eq', path: e.target.value }))
                    }
                    className="guess-input !min-h-0 py-2 text-sm"
                  >
                    {meta.eqPaths.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={String(formRule.value || '')}
                    onChange={(e) =>
                      setFormRule((r) => ({
                        ...r,
                        type: 'eq',
                        value: e.target.value,
                      }))
                    }
                    className="guess-input !min-h-0 py-2 text-sm"
                    placeholder="green"
                  />
                </div>
              ) : null}

              {formRule.type === 'year_range' ? (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={formRule.min ?? 1990}
                    onChange={(e) =>
                      setFormRule((r) => ({
                        ...r,
                        type: 'year_range',
                        min: Number(e.target.value),
                      }))
                    }
                    className="guess-input !min-h-0 py-2 text-sm"
                  />
                  <input
                    type="number"
                    value={formRule.max ?? 1999}
                    onChange={(e) =>
                      setFormRule((r) => ({
                        ...r,
                        type: 'year_range',
                        max: Number(e.target.value),
                      }))
                    }
                    className="guess-input !min-h-0 py-2 text-sm"
                  />
                </div>
              ) : null}

              {formRule.type === 'year_gt' ? (
                <input
                  type="number"
                  value={Number(formRule.value) || 2010}
                  onChange={(e) =>
                    setFormRule({ type: 'year_gt', value: Number(e.target.value) })
                  }
                  className="guess-input !min-h-0 py-2 text-sm"
                />
              ) : null}

              {formRule.type === 'region' ? (
                <input
                  value={(formRule.aliases || []).join(', ')}
                  onChange={(e) =>
                    setFormRule({
                      type: 'region',
                      aliases: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="guess-input !min-h-0 py-2 text-sm"
                  placeholder="eua, usa, estados unidos"
                />
              ) : null}

              {formRule.type === 'species_includes' ? (
                <input
                  value={String(formRule.value || '')}
                  onChange={(e) =>
                    setFormRule({
                      type: 'species_includes',
                      value: e.target.value,
                      aliases: ['robô', 'android'],
                    })
                  }
                  className="guess-input !min-h-0 py-2 text-sm"
                  placeholder="robot"
                />
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-[11px] text-cinema-muted">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                  />
                  Ativa no jogo
                </label>
                <label className="flex items-center gap-2 text-[11px] text-cinema-muted">
                  Ordem
                  <input
                    type="number"
                    value={formSort}
                    onChange={(e) => setFormSort(Number(e.target.value))}
                    className="guess-input !min-h-0 w-20 py-1 text-sm"
                  />
                </label>
              </div>

              <div className="mt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !formText.trim()}
                  onClick={() => void save()}
                  className="mode-btn mode-btn-primary mode-btn-inline px-4 py-2 font-display text-lg disabled:opacity-40"
                >
                  SALVAR
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="border border-cinema-line px-3 py-2 text-xs text-cinema-muted"
                >
                  Cancelar
                </button>
                {formId ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(formId)}
                    className="border border-cinema-red px-3 py-2 text-xs text-cinema-red"
                  >
                    Apagar
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-cinema-muted">
              Selecione uma pergunta ou crie uma nova.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
