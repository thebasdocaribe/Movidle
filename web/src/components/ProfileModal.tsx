import { useEffect, useState, type FormEvent } from 'react'
import {
  fetchAutocomplete,
  updateProfile,
  type AutocompleteItem,
  type FavoriteFilm,
} from '../api'
import type { AuthUser } from '../auth'

type ProfileModalProps = {
  user: AuthUser
  onClose: () => void
  onSaved: (user: AuthUser) => void
}

export function ProfileModal({ user, onClose, onSaved }: ProfileModalProps) {
  const [username, setUsername] = useState(user.username)
  const [bio, setBio] = useState(user.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '')
  const [favorites, setFavorites] = useState<FavoriteFilm[]>(
    user.favorites || [],
  )
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    if (search.trim().length < 2) {
      setSuggestions([])
      return
    }
    const t = window.setTimeout(() => {
      void fetchAutocomplete(search)
        .then((r) => setSuggestions(r.suggestions.slice(0, 6)))
        .catch(() => setSuggestions([]))
    }, 200)
    return () => window.clearTimeout(t)
  }, [search])

  function onFile(file: File | null) {
    if (!file) return
    if (file.size > 220_000) {
      setError('Foto máx. ~200KB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setAvatarUrl(String(reader.result || ''))
    }
    reader.readAsDataURL(file)
  }

  function addFavorite(item: AutocompleteItem) {
    if (favorites.length >= 5) {
      setError('Máximo 5 favoritos')
      return
    }
    const id = item.movieId || `${item.title}-${item.year || ''}`
    if (favorites.some((f) => f.movieId === id || f.title === item.title)) {
      setSearch('')
      setSuggestions([])
      return
    }
    setFavorites((prev) => [
      ...prev,
      {
        movieId: id,
        title: item.title,
        titlePt: item.titlePt || null,
        posterUrl: item.posterUrl || null,
      },
    ])
    setSearch('')
    setSuggestions([])
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const res = await updateProfile({
        username: username.trim(),
        displayName: username.trim(),
        bio,
        avatarUrl: avatarUrl || null,
        favorites,
      })
      onSaved(res.user)
      setInfo('Perfil salvo')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const avatar =
    avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=1a0a12&color=ffc44d&size=128`

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-3 sm:items-center"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="panel-frame max-h-[90svh] w-full max-w-lg overflow-y-auto p-4"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-3xl text-cinema-gold">PERFIL</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-cinema-muted hover:text-white"
          >
            Fechar
          </button>
        </div>

        <form onSubmit={save} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <img
              src={avatar}
              alt=""
              className="h-16 w-16 rounded-full border-2 border-cinema-gold object-cover"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <label className="text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
                Foto (opcional)
              </label>
              <input
                type="file"
                accept="image/*"
                className="text-xs text-cinema-muted"
                onChange={(e) => onFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-bold text-cinema-muted uppercase">
              Username
            </span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="guess-input !min-h-0 py-2"
              maxLength={32}
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-bold text-cinema-muted uppercase">Bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={500}
              className="guess-input !min-h-0 resize-y py-2 text-sm"
              placeholder="Uma linha sobre você…"
            />
          </label>

          <div>
            <p className="mb-1 text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
              Top 5 favoritos ({favorites.length}/5)
            </p>
            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
              {Array.from({ length: 5 }).map((_, i) => {
                const f = favorites[i]
                return (
                  <div
                    key={f?.movieId || `slot-${i}`}
                    className="relative h-24 w-[4.2rem] shrink-0 border border-cinema-line bg-black/50"
                  >
                    {f ? (
                      <>
                        {f.posterUrl ? (
                          <img
                            src={f.posterUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-end p-1 text-[9px] leading-tight font-semibold text-white">
                            {f.titlePt || f.title}
                          </div>
                        )}
                        <button
                          type="button"
                          className="absolute top-0 right-0 bg-cinema-red px-1 text-[10px] text-white"
                          onClick={() =>
                            setFavorites((prev) =>
                              prev.filter((_, idx) => idx !== i),
                            )
                          }
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <span className="flex h-full items-center justify-center text-cinema-muted">
                        +
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            {favorites.length < 5 ? (
              <div className="relative">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar filme…"
                  className="guess-input !min-h-0 w-full py-2 text-sm"
                />
                {suggestions.length > 0 ? (
                  <ul className="absolute right-0 left-0 z-10 mt-1 max-h-40 overflow-auto border border-cinema-gold bg-[#0a060c]">
                    {suggestions.map((s) => (
                      <li key={s.label}>
                        <button
                          type="button"
                          className="block w-full px-2 py-1.5 text-left text-sm hover:bg-cinema-red/70"
                          onClick={() => addFavorite(s)}
                        >
                          {s.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="text-sm text-cinema-red">{error}</p>
          ) : null}
          {info ? (
            <p className="text-sm text-cinema-cyan">{info}</p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="mode-btn mode-btn-primary mode-btn-inline px-4 py-2 font-display text-xl disabled:opacity-40"
          >
            SALVAR
          </button>
        </form>
      </div>
    </div>
  )
}
