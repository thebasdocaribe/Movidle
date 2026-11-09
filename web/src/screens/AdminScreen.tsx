import { useEffect, useState } from 'react'
import { authHeaders } from '../auth'
import type { AuthUser } from '../auth'
import { AdminCharactersPanel } from '../components/AdminCharactersPanel'
import { AdminClipsPanel } from '../components/AdminClipsPanel'
import { AdminPostersPanel } from '../components/AdminPostersPanel'
import { AdminWhoamiPanel } from '../components/AdminWhoamiPanel'

type AdminStats = {
  movies: number
  clips: number
  characters: number
}

type AdminTab = 'overview' | 'clips' | 'characters' | 'posters' | 'whoami'

type AdminScreenProps = {
  user: AuthUser
  onBack: () => void
}

async function fetchAdminStatus() {
  const res = await fetch('/api/admin/status', {
    headers: { ...authHeaders() },
  })
  const text = await res.text()
  let data: {
    error?: string
    ok?: boolean
    stats?: AdminStats
    admin?: AuthUser
  }
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Resposta inválida (HTTP ${res.status})`)
  }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data as { ok: true; stats: AdminStats; admin: AuthUser }
}

export function AdminScreen({ user, onBack }: AdminScreenProps) {
  const [tab, setTab] = useState<AdminTab>('overview')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError(null)
    void fetchAdminStatus()
      .then((res) => setStats(res.stats))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-0 flex-1">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="border border-cinema-line px-2.5 py-1 text-xs font-semibold tracking-wide text-cinema-gold uppercase"
          >
            ← Lobby
          </button>
          <div className="text-center">
            <h1 className="font-display text-3xl text-white sm:text-4xl">
              DASHBOARD
            </h1>
            <p className="text-[11px] font-bold tracking-widest text-cinema-cyan uppercase">
              Admin · @{user.username}
            </p>
          </div>
          <div className="w-[72px]" />
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-cinema-line pb-2">
          {(
            [
              ['overview', 'Visão geral'],
              ['clips', 'Clipes'],
              ['characters', 'Personagens'],
              ['posters', 'Posters'],
              ['whoami', 'Quem sou eu'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`border px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase ${
                tab === id
                  ? 'border-cinema-gold bg-cinema-gold/15 text-cinema-gold'
                  : 'border-cinema-line text-cinema-muted hover:border-cinema-muted hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-cinema-muted">Carregando…</p>
        ) : error ? (
          <p className="text-sm text-cinema-red">{error}</p>
        ) : tab === 'overview' ? (
          <section className="panel-frame grid gap-3 p-4 sm:grid-cols-3">
            <StatCard label="Filmes no catálogo" value={stats?.movies ?? 0} />
            <StatCard label="Com clipe (clássico)" value={stats?.clips ?? 0} />
            <StatCard label="Personagens com foto" value={stats?.characters ?? 0} />
            <p className="sm:col-span-3 text-sm text-cinema-muted">
              Clipes, personagens e posters/elenco — tudo daqui. Conta normal
              não vê este menu.
            </p>
          </section>
        ) : tab === 'clips' ? (
          <AdminClipsPanel />
        ) : tab === 'characters' ? (
          <AdminCharactersPanel />
        ) : tab === 'posters' ? (
          <AdminPostersPanel />
        ) : tab === 'whoami' ? (
          <AdminWhoamiPanel />
        ) : null}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-cinema-line bg-black/40 px-3 py-3">
      <p className="text-[10px] font-bold tracking-widest text-cinema-muted uppercase">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl text-cinema-gold tabular-nums">
        {value}
      </p>
    </div>
  )
}
