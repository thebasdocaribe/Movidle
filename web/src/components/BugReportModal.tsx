import { useState, type FormEvent } from 'react'
import { postBugReport } from '../api'

type BugReportModalProps = {
  onClose: () => void
}

export function BugReportModal({ onClose }: BugReportModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await postBugReport({ title, description, email })
      if (res.mailto) {
        window.location.href = res.mailto
      }
      setDone(res.message || 'Obrigado! Relatório enviado.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4">
      <div
        role="dialog"
        aria-labelledby="bug-title"
        className="panel-frame relative w-full max-w-md border-cinema-gold/50 bg-[#120a12] p-5"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center border border-cinema-red bg-cinema-red text-white"
          aria-label="Fechar"
        >
          ×
        </button>
        <h2 id="bug-title" className="font-display pr-10 text-3xl text-cinema-gold">
          Relatório de erro
        </h2>

        {done ? (
          <p className="mt-4 text-sm text-cinema-cyan">{done}</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              placeholder="Resumo do bug"
              className="guess-input"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={10}
              rows={5}
              placeholder="O que aconteceu? Em qual modo? Dá pra repetir?"
              className="guess-input min-h-[8rem] resize-y py-2"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Seu e-mail (opcional)"
              className="guess-input"
            />
            {error ? <p className="text-sm text-cinema-red">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="mode-btn mode-btn-primary mode-btn-inline px-4 py-2 font-display text-xl disabled:opacity-40"
            >
              {busy ? '...' : 'ENVIAR'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
