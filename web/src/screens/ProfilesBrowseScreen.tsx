import { useEffect, useState } from 'react'
import { searchPublicUsers, type PublicUserCard } from '../api'

type ProfilesBrowseScreenProps = {
  onBack: () => void
  onOpenProfile: (username: string) => void
}

function avatarSrc(u: PublicUserCard) {
  if (u.avatarUrl) return u.avatarUrl
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || u.username)}&background=1a0a12&color=ffc44d&size=64&bold=true`
}

export function ProfilesBrowseScreen({
  onBack,
  onOpenProfile,
}: ProfilesBrowseScreenProps) {
  const [q, setQ] = useState('')
  const [users, setUsers] = useState<PublicUserCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => {
      setLoading(true)
      setError(null)
      void searchPublicUsers(q)
        .then((res) => setUsers(res.users))
        .catch((err) => setError((err as Error).message))
        .finally(() => setLoading(false))
    }, q.trim() ? 220 : 0)
    return () => window.clearTimeout(t)
  }, [q])

  return (
    <div className="min-h-0 flex-1">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-3 py-4 sm:px-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="border border-cinema-line px-2 py-1 text-xs text-cinema-gold"
          >
            ← Voltar
          </button>
          <h1 className="font-display text-2xl text-white sm:text-3xl">
            PERFIS
          </h1>
          <span className="w-14" />
        </div>

        <p className="text-center text-xs text-cinema-muted">
          Veja foto, bio e conquistas de outros jogadores
        </p>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar username…"
          className="guess-input !min-h-0 w-full py-2.5 text-sm"
        />

        {loading ? (
          <p className="text-center text-sm text-cinema-muted">Buscando…</p>
        ) : error ? (
          <p className="text-center text-sm text-cinema-red">{error}</p>
        ) : users.length === 0 ? (
          <p className="text-center text-sm text-cinema-muted">
            Ninguém encontrado
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {users.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => onOpenProfile(u.username)}
                  className="rank-row-click flex w-full items-center gap-3 border border-cinema-line/70 bg-black/30 px-2.5 py-2 text-left"
                >
                  <img
                    src={avatarSrc(u)}
                    alt=""
                    className="rank-row-avatar h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">
                      @{u.username}
                    </span>
                    {u.bio ? (
                      <span className="block truncate text-[11px] text-cinema-muted">
                        {u.bio}
                      </span>
                    ) : null}
                  </span>
                  <span className="rank-row-hint" aria-hidden>
                    ver perfil
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
