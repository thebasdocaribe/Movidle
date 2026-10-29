import { useEffect, useState } from 'react'
import { fetchRank, type RankEntry } from '../api'
import type { AuthUser, ProgressMap } from '../auth'
import { multiplierForStreak } from '../scoring'

type HubScreenProps = {
  user: AuthUser | null
  progress: ProgressMap
  onPlayDaily: () => void
  onPlayClassic: () => void
  onPlayDuel: () => void
  onOpenAuth: () => void
  onLogout: () => void
}

type RankTab = 'daily' | 'classic'

export function HubScreen({
  user,
  progress,
  onPlayDaily,
  onPlayClassic,
  onPlayDuel,
  onOpenAuth,
  onLogout,
}: HubScreenProps) {
  const [rankTab, setRankTab] = useState<RankTab>('daily')
  const [entries, setEntries] = useState<RankEntry[]>([])
  const [rankLoading, setRankLoading] = useState(false)

  useEffect(() => {
    setRankLoading(true)
    fetchRank(rankTab)
      .then((res) => setEntries(res.entries))
      .catch(() => setEntries([]))
      .finally(() => setRankLoading(false))
  }, [rankTab, progress])

  return (
    <div className="hub-stage min-h-svh">
      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-6xl flex-col px-4 py-5 sm:px-6 sm:py-7">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4 sm:mb-8">
          <div>
            <p className="mb-1 text-[11px] font-bold tracking-[0.35em] text-cinema-gold uppercase">
              Sessão aberta
            </p>
            <h1 className="font-display text-5xl leading-none text-white drop-shadow-[0_4px_0_#7a0c20] sm:text-6xl">
              CINEBLITZ
            </h1>
            <p className="mt-1 font-display text-lg tracking-wide text-cinema-red">
              ADIVINHE O FILME EM SEGUNDOS
            </p>
            {user ? (
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-cinema-muted">
                <span className="text-cinema-gold">
                  @{user.username}
                </span>
                <span>
                  Daily +{progress.daily.totalScore} · ×
                  {multiplierForStreak(progress.daily.firstTryStreak)
                    .toFixed(2)
                    .replace(/\.00$/, '')}
                </span>
                <span>
                  Infinito +{progress.classic.totalScore} · ×
                  {multiplierForStreak(progress.classic.firstTryStreak)
                    .toFixed(2)
                    .replace(/\.00$/, '')}
                </span>
              </div>
            ) : (
              <p className="mt-3 text-xs text-cinema-muted">
                Entre pra salvar pontos e aparecer no rank
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {user ? (
              <button
                type="button"
                onClick={onLogout}
                className="border border-cinema-line px-3 py-1.5 text-xs font-bold uppercase text-cinema-muted hover:text-white"
              >
                Sair
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="mode-btn mode-btn-primary mode-btn-inline px-4 py-2 font-display text-xl"
              >
                ENTRAR
              </button>
            )}
          </div>
        </header>

        <div className="grid flex-1 gap-4 lg:grid-cols-[1.55fr_1fr] lg:gap-5">
          <section className="panel-frame p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-cinema-line pb-2">
              <h2 className="font-display text-3xl text-cinema-gold">JOGAR</h2>
            </div>
            <div className="flex flex-col gap-3">
              <ModeButton
                title="DESAFIO DIÁRIO"
                tag="Diário"
                tagTone="ok"
                progress="▶"
                icon="▶"
                primary
                onClick={onPlayDaily}
              />
              <ModeButton
                title="INFINITO"
                tag="Livre"
                tagTone="ok"
                progress="∞"
                icon="∞"
                onClick={onPlayClassic}
              />
            </div>
          </section>

          <section className="panel-frame p-3 sm:p-4">
            <h2 className="font-display mb-3 border-b border-cinema-line pb-2 text-3xl text-cinema-gold">
              MULTIPLAYER
            </h2>
            <ModeButton
              title="DESAFIE UM AMIGO"
              tag="1v1"
              tagTone="ok"
              progress="⚔"
              icon="👥"
              onClick={onPlayDuel}
            />
          </section>
        </div>

        <section className="rank-poster panel-frame mt-6 overflow-hidden p-0">
          <div className="border-b-2 border-cinema-gold/60 bg-gradient-to-r from-[#3a1018] via-[#1a0a12] to-[#3a1018] px-4 py-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold tracking-[0.35em] text-cinema-gold uppercase">
                  Cartaz do ranking
                </p>
                <h2 className="font-display text-3xl text-white sm:text-4xl">
                  HALL DA FAMA
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRankTab('daily')}
                  className={`border px-3 py-1 text-xs font-bold tracking-wide uppercase ${
                    rankTab === 'daily'
                      ? 'border-cinema-red bg-cinema-red text-white'
                      : 'border-cinema-line text-cinema-muted'
                  }`}
                >
                  Diário
                </button>
                <button
                  type="button"
                  onClick={() => setRankTab('classic')}
                  className={`border px-3 py-1 text-xs font-bold tracking-wide uppercase ${
                    rankTab === 'classic'
                      ? 'border-cinema-red bg-cinema-red text-white'
                      : 'border-cinema-line text-cinema-muted'
                  }`}
                >
                  Infinito
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto px-3 py-3">
            {rankLoading ? (
              <p className="py-6 text-center text-sm text-cinema-muted">
                Carregando rank…
              </p>
            ) : entries.length === 0 ? (
              <p className="py-8 text-center text-sm text-cinema-muted">
                Rank vazio. Crie uma conta, jogue e some pontos.
              </p>
            ) : (
              <ol className="flex flex-col gap-1">
                {entries.map((row) => {
                  const isYou = user?.username === row.username
                  return (
                    <li
                      key={row.username}
                      className={`flex items-center gap-3 border px-3 py-2 ${
                        isYou
                          ? 'border-cinema-gold bg-cinema-gold/10'
                          : 'border-cinema-line/70 bg-black/30'
                      }`}
                    >
                      <span className="font-display w-8 text-xl text-cinema-red">
                        #{row.rank}
                      </span>
                      <span
                        className={`flex-1 text-sm font-semibold ${
                          isYou ? 'text-cinema-gold' : 'text-white'
                        }`}
                      >
                        {row.name}
                        {isYou ? ' (você)' : ''}
                      </span>
                      <span className="text-[10px] text-cinema-muted">
                        ×
                        {multiplierForStreak(row.streak)
                          .toFixed(2)
                          .replace(/\.00$/, '')}
                      </span>
                      <span className="font-display text-xl text-cinema-cyan">
                        {row.score}
                      </span>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function ModeButton({
  title,
  tag,
  tagTone,
  progress,
  icon,
  primary = false,
  locked = false,
  onClick,
}: {
  title: string
  tag: string
  tagTone: 'ok' | 'warn' | 'lock'
  progress: string
  icon: string
  primary?: boolean
  locked?: boolean
  onClick?: () => void
}) {
  const ribbonClass =
    tagTone === 'ok'
      ? 'ribbon'
      : tagTone === 'warn'
        ? 'ribbon ribbon-warn'
        : 'ribbon ribbon-lock'

  return (
    <button
      type="button"
      disabled={locked}
      onClick={onClick}
      className={`mode-btn ${primary ? 'mode-btn-primary' : ''} px-3 pt-7 pb-3 disabled:opacity-45`}
    >
      <span className={ribbonClass}>{tag}</span>
      <span className="absolute top-2 right-3 text-xs font-bold text-white/70">
        {progress}
      </span>
      <span className="flex items-center gap-3">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center border-2 text-xl ${
            primary
              ? 'border-white/40 bg-black/20'
              : 'border-cinema-line bg-black/30 text-cinema-gold'
          }`}
        >
          {icon}
        </span>
        <span className="font-display text-2xl leading-none tracking-wide sm:text-3xl">
          {title}
        </span>
      </span>
    </button>
  )
}
