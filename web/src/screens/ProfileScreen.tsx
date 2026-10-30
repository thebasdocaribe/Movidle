import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  fetchPublicProfile,
  updateProfile,
  type Achievement,
  type PublicProfile,
} from '../api'
import type { AuthUser } from '../auth'

type ProfileScreenProps = {
  /** username a abrir; null = próprio (se logado) */
  username: string | null
  viewer: AuthUser | null
  onBack: () => void
  onSaved?: (user: AuthUser) => void
}

function avatarFallback(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a0a12&color=ffc44d&size=160&bold=true`
}

function CameraIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 8.5h2.2l1.1-2h8.4l1.1 2H19.5A1.5 1.5 0 0 1 21 10v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5V10a1.5 1.5 0 0 1 1.5-1.5z"
      />
      <circle cx="12" cy="13.5" r="3.2" />
    </svg>
  )
}

export function ProfileScreen({
  username,
  viewer,
  onBack,
  onSaved,
}: ProfileScreenProps) {
  const target = username || viewer?.username || null
  const isOwn = Boolean(
    viewer && target && viewer.username.toLowerCase() === target.toLowerCase(),
  )
  const fileRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  const [editUsername, setEditUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    if (!target) {
      setLoadError('Perfil não encontrado')
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    setEditing(false)
    void fetchPublicProfile(target)
      .then((res) => {
        setProfile(res.profile)
        setEditUsername(res.profile.username)
        setBio(res.profile.bio || '')
        setAvatarUrl(res.profile.avatarUrl || '')
      })
      .catch((err) => setLoadError((err as Error).message))
      .finally(() => setLoading(false))
  }, [target])

  function applyUser(u: AuthUser) {
    onSaved?.(u)
    setAvatarUrl(u.avatarUrl || '')
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            username: u.username,
            displayName: u.displayName,
            bio: u.bio || '',
            avatarUrl: u.avatarUrl || null,
          }
        : prev,
    )
  }

  async function persistAvatar(dataUrl: string) {
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const res = await updateProfile({ avatarUrl: dataUrl })
      applyUser(res.user)
      setInfo('Foto atualizada')
    } catch (err) {
      setError((err as Error).message)
      setAvatarUrl(profile?.avatarUrl || '')
    } finally {
      setBusy(false)
    }
  }

  function onFile(file: File | null) {
    if (!file || !isOwn) return
    if (!file.type.startsWith('image/')) {
      setError('Escolha uma imagem')
      return
    }
    if (file.size > 220_000) {
      setError('Foto máx. ~200KB — comprime um pouco e tenta de novo')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      if (!dataUrl) return
      setAvatarUrl(dataUrl)
      if (editing) return
      void persistAvatar(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!isOwn) return
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const res = await updateProfile({
        username: editUsername.trim(),
        displayName: editUsername.trim(),
        bio,
        avatarUrl: avatarUrl || null,
      })
      applyUser(res.user)
      setInfo('Perfil salvo')
      setEditing(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const avatar =
    avatarUrl ||
    profile?.avatarUrl ||
    avatarFallback(profile?.displayName || profile?.username || 'U')

  const achievements: Achievement[] = profile?.achievements || []
  const prog = profile?.progress

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
            PERFIL
          </h1>
          <span className="w-14" />
        </div>

        {loading ? (
          <p className="text-center text-cinema-muted">Carregando…</p>
        ) : loadError ? (
          <p className="text-center text-cinema-red">{loadError}</p>
        ) : profile ? (
          <>
            <div className="panel-frame flex flex-col items-center gap-3 p-5 text-center">
              {isOwn ? (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    tabIndex={-1}
                    onChange={(e) => {
                      onFile(e.target.files?.[0] || null)
                      e.target.value = ''
                    }}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => fileRef.current?.click()}
                    className="group relative h-28 w-28 shrink-0 rounded-full border-2 border-cinema-gold disabled:opacity-50"
                    title="Trocar foto"
                    aria-label="Trocar foto do perfil"
                  >
                    <img
                      src={avatar}
                      alt=""
                      className="h-full w-full rounded-full object-cover transition group-hover:brightness-75"
                    />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition group-hover:bg-black/35">
                      <span className="flex flex-col items-center gap-0.5 text-cinema-gold opacity-0 transition group-hover:opacity-100">
                        <CameraIcon />
                        <span className="text-[9px] font-bold tracking-wide uppercase">
                          {busy ? '…' : 'Trocar'}
                        </span>
                      </span>
                    </span>
                    <span className="absolute right-0 bottom-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#1a0a12] bg-cinema-gold text-[#1a0a12] shadow-md">
                      <CameraIcon className="h-3.5 w-3.5" />
                    </span>
                  </button>
                </>
              ) : (
                <img
                  src={avatar}
                  alt=""
                  className="h-28 w-28 rounded-full border-2 border-cinema-gold object-cover"
                />
              )}
              {error && !editing ? (
                <p className="text-sm text-cinema-red">{error}</p>
              ) : null}
              {info && !editing ? (
                <p className="text-sm text-cinema-cyan">{info}</p>
              ) : null}
              {editing ? (
                <form
                  onSubmit={save}
                  className="flex w-full flex-col gap-3 text-left"
                >
                  <p className="text-center text-[11px] text-cinema-muted">
                    Clique na foto acima pra trocar · máx. ~200KB
                  </p>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-bold text-cinema-muted uppercase">
                      Username
                    </span>
                    <input
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="guess-input !min-h-0 py-2"
                      maxLength={32}
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-bold text-cinema-muted uppercase">
                      Bio
                    </span>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      maxLength={500}
                      className="guess-input !min-h-0 resize-y py-2 text-sm"
                      placeholder="Uma linha sobre você…"
                    />
                  </label>
                  {error ? (
                    <p className="text-sm text-cinema-red">{error}</p>
                  ) : null}
                  {info ? (
                    <p className="text-sm text-cinema-cyan">{info}</p>
                  ) : null}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false)
                        setEditUsername(profile.username)
                        setBio(profile.bio || '')
                        setAvatarUrl(profile.avatarUrl || '')
                        setError(null)
                        setInfo(null)
                      }}
                      className="mode-btn mode-btn-inline flex-1 border-cinema-line px-3 py-2 text-sm text-cinema-muted"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={busy}
                      className="mode-btn mode-btn-primary mode-btn-inline flex-1 px-3 py-2 font-display text-xl disabled:opacity-40"
                    >
                      SALVAR
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div>
                    <p className="font-display text-3xl text-cinema-gold">
                      @{profile.username}
                    </p>
                    {profile.displayName &&
                    profile.displayName !== profile.username ? (
                      <p className="text-sm text-cinema-muted">
                        {profile.displayName}
                      </p>
                    ) : null}
                  </div>
                  {profile.bio ? (
                    <p className="max-w-sm text-sm leading-relaxed text-white/80">
                      {profile.bio}
                    </p>
                  ) : (
                    <p className="text-xs text-cinema-muted italic">
                      Sem bio ainda
                    </p>
                  )}
                  {prog ? (
                    <p className="text-[11px] text-cinema-muted">
                      Clássico +{prog.daily?.totalScore ?? 0}
                      <span className="mx-1.5 opacity-40">·</span>
                      Elenco +{prog.cast?.totalScore ?? 0}
                      <span className="mx-1.5 opacity-40">·</span>
                      Maratona +{prog.classic?.totalScore ?? 0}
                    </p>
                  ) : null}
                  {isOwn ? (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="mode-btn mode-btn-inline mt-1 border-cinema-gold px-4 py-2 text-sm text-cinema-gold"
                    >
                      Editar perfil
                    </button>
                  ) : null}
                </>
              )}
            </div>

            <section>
              <div className="mb-2 flex items-end justify-between gap-2">
                <h2 className="font-display text-2xl text-cinema-gold">
                  Conquistas
                </h2>
                <span className="text-[10px] font-bold tracking-wide text-cinema-muted uppercase">
                  Em breve
                </span>
              </div>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {achievements.map((a) => (
                  <li
                    key={a.id}
                    className={`border px-2.5 py-3 text-center ${
                      a.locked
                        ? 'border-cinema-line/50 bg-black/40 opacity-55'
                        : 'border-cinema-gold/60 bg-cinema-gold/10'
                    }`}
                    title={a.desc}
                  >
                    <div
                      className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center border text-xs font-bold tracking-wide ${
                        a.locked
                          ? 'border-cinema-line text-cinema-muted'
                          : 'border-cinema-gold text-cinema-gold'
                      }`}
                    >
                      {a.locked ? '?' : 'OK'}
                    </div>
                    <p className="text-[11px] font-bold tracking-wide text-white uppercase">
                      {a.title}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-cinema-muted">
                      {a.desc}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}
