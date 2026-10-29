import { useEffect, useState, type FormEvent } from 'react'
import {
  checkUsername,
  forgotPassword,
  loginAccount,
  registerAccount,
  resendVerification,
  resetPassword,
} from '../api'
import type { AuthUser, ProgressMap } from '../auth'
import { setToken } from '../auth'

type AuthMode = 'register' | 'login' | 'forgot' | 'reset'

type AuthModalProps = {
  onClose: () => void
  onSuccess: (user: AuthUser, progress: ProgressMap) => void
  initialMode?: AuthMode
  resetToken?: string | null
}

function passwordChecks(pw: string) {
  return {
    minLength: pw.length >= 6,
    upper: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  }
}

function passwordLooksStrong(pw: string) {
  const c = passwordChecks(pw)
  return c.minLength && c.upper && c.number && c.special
}

function isValidEmailFormat(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function ReqLine({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li
      className={`flex items-center gap-2 text-[11px] leading-snug ${
        ok ? 'text-cinema-cyan' : 'text-cinema-red'
      }`}
    >
      <span className="w-3 shrink-0 font-bold">{ok ? '✓' : '✗'}</span>
      <span>{label}</span>
    </li>
  )
}

function PasswordHints({ password }: { password: string }) {
  const checks = passwordChecks(password)
  const strong = passwordLooksStrong(password)
  if (!password) {
    return (
      <p className="text-[11px] leading-snug text-cinema-muted">
        Digite a senha: mín. 6, maiúscula, número e especial.
      </p>
    )
  }
  return (
    <div className="space-y-1.5">
      <p
        className={`text-xs font-bold uppercase tracking-wide ${
          strong ? 'text-cinema-cyan' : 'text-cinema-red'
        }`}
      >
        {strong ? 'Senha forte' : 'Senha fraca'}
      </p>
      <ul className="space-y-0.5">
        <ReqLine
          ok={checks.minLength}
          label={
            checks.minLength
              ? 'Mínimo de 6 caracteres'
              : `Faltam ${Math.max(0, 6 - password.length)} caractere(s) (mín. 6)`
          }
        />
        <ReqLine
          ok={checks.upper}
          label={
            checks.upper
              ? 'Tem letra maiúscula'
              : 'Falta letra maiúscula (A–Z)'
          }
        />
        <ReqLine
          ok={checks.number}
          label={
            checks.number ? 'Tem número' : 'Falta número (0–9)'
          }
        />
        <ReqLine
          ok={checks.special}
          label={
            checks.special
              ? 'Tem caractere especial'
              : 'Falta caractere especial (! @ # $ …)'
          }
        />
      </ul>
    </div>
  )
}

export function AuthModal({
  onClose,
  onSuccess,
  initialMode = 'register',
  resetToken = null,
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(
    resetToken ? 'reset' : initialMode,
  )
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [token] = useState(resetToken || '')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [canResend, setCanResend] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'ok' | 'taken' | 'invalid' | 'error'
  >('idle')

  const strong = passwordLooksStrong(password)
  const passwordsMatch =
    password.length > 0 && password === passwordConfirm
  const emailOk = isValidEmailFormat(email)
  const needsStrongPassword = mode === 'register' || mode === 'reset'
  const usernameFormatOk =
    username.trim().length >= 3 &&
    username.trim().length <= 32 &&
    /^[a-zA-Z0-9_]+$/.test(username.trim())
  // Libera CRIAR se o formato estiver ok (mesmo se a API de check falhar)
  const registerReady =
    strong &&
    passwordsMatch &&
    emailOk &&
    usernameFormatOk &&
    usernameStatus !== 'taken' &&
    usernameStatus !== 'invalid' &&
    usernameStatus !== 'checking'

  useEffect(() => {
    if (mode !== 'register') return
    const value = username.trim()
    if (value.length < 3) {
      setUsernameStatus(value.length === 0 ? 'idle' : 'invalid')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameStatus('invalid')
      return
    }
    setUsernameStatus('checking')
    const handle = window.setTimeout(() => {
      checkUsername(value)
        .then((res) => {
          setUsernameStatus(res.available ? 'ok' : 'taken')
        })
        .catch(() => setUsernameStatus('error'))
    }, 350)
    return () => window.clearTimeout(handle)
  }, [username, mode])

  function switchMode(next: AuthMode) {
    setMode(next)
    setError(null)
    setInfo(null)
    setPassword('')
    setPasswordConfirm('')
    setCanResend(false)
  }

  function showVerificationResult(res: { message?: string }) {
    setInfo(res.message || 'Verifique seu e-mail pra continuar.')
    setCanResend(true)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    setCanResend(false)
    try {
      if (mode === 'forgot') {
        const res = await forgotPassword(email)
        setInfo(res.message)
        return
      }

      if (needsStrongPassword && !strong) {
        setError('Complete os requisitos da senha')
        return
      }

      if (mode === 'register') {
        if (!emailOk) {
          setError('Informe um e-mail com formato válido')
          return
        }
        if (!passwordsMatch) {
          setError('As senhas não coincidem')
          return
        }
        const res = await registerAccount({
          username,
          email,
          password,
          passwordConfirm,
        })
        if (res.token && res.user) {
          setToken(res.token)
          onSuccess(res.user, res.progress)
          onClose()
          return
        }
        showVerificationResult(
          res.message
            ? res
            : { message: 'Conta criada. Faça login.' },
        )
        return
      }

      if (mode === 'reset') {
        if (!passwordsMatch) {
          setError('As senhas não coincidem')
          return
        }
        await resetPassword({ token, password })
        setMode('login')
        setPassword('')
        setPasswordConfirm('')
        setError(null)
        setInfo('Senha atualizada. Faça login.')
        return
      }

      const res = await loginAccount({ login, password })
      setToken(res.token)
      onSuccess(res.user, res.progress)
      onClose()
    } catch (err) {
      const msg = (err as Error).message
      setError(msg)
      if (msg.includes('Confirme seu e-mail')) {
        setCanResend(true)
        if (login.includes('@')) setEmail(login)
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleResend() {
    const target = email || (login.includes('@') ? login : '')
    if (!isValidEmailFormat(target)) {
      setError('Informe o e-mail da conta pra reenviar')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await resendVerification(target)
      showVerificationResult(res)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const title =
    mode === 'register'
      ? 'CRIAR CONTA'
      : mode === 'login'
        ? 'ENTRAR'
        : mode === 'forgot'
          ? 'RECUPERAR'
          : 'NOVA SENHA'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="panel-frame w-full max-w-md p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-3xl text-cinema-gold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-cinema-muted hover:text-white"
          >
            ✕
          </button>
        </div>

        {mode === 'register' || mode === 'login' ? (
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 border px-2 py-1 text-xs font-bold uppercase ${
                mode === 'register'
                  ? 'border-cinema-red bg-cinema-red text-white'
                  : 'border-cinema-line text-cinema-muted'
              }`}
            >
              Registrar
            </button>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 border px-2 py-1 text-xs font-bold uppercase ${
                mode === 'login'
                  ? 'border-cinema-red bg-cinema-red text-white'
                  : 'border-cinema-line text-cinema-muted'
              }`}
            >
              Login
            </button>
          </div>
        ) : null}

        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === 'register' ? (
            <>
              <div className="space-y-1">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="usuário"
                  className="guess-input"
                  autoComplete="username"
                  required
                />
                {usernameStatus === 'idle' ? (
                  <p className="text-[11px] text-cinema-muted">
                    3–32 caracteres; letras, números e _
                  </p>
                ) : usernameStatus === 'checking' ? (
                  <p className="text-[11px] text-cinema-muted">
                    Verificando disponibilidade…
                  </p>
                ) : usernameStatus === 'ok' ? (
                  <p className="text-[11px] text-cinema-cyan">
                    Nome de usuário disponível
                  </p>
                ) : usernameStatus === 'taken' ? (
                  <p className="text-[11px] text-cinema-red">
                    Esse nome de usuário já está em uso
                  </p>
                ) : usernameStatus === 'error' ? (
                  <p className="text-[11px] text-cinema-red">
                    Servidor/banco não respondeu — confira DATABASE_URL no
                    Render
                  </p>
                ) : (
                  <p className="text-[11px] text-cinema-red">
                    Usuário inválido (mín. 3; só letras, números e _)
                  </p>
                )}

              </div>
              <div className="space-y-1">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e-mail"
                  className="guess-input"
                  autoComplete="email"
                  required
                />
                {email.length === 0 ? (
                  <p className="text-[11px] text-cinema-muted">
                    Vamos enviar um link pra confirmar que o e-mail é seu.
                  </p>
                ) : emailOk ? (
                  <p className="text-[11px] text-cinema-cyan">
                    Formato de e-mail válido — ainda precisa confirmar no
                    inbox.
                  </p>
                ) : (
                  <p className="text-[11px] text-cinema-red">
                    E-mail inválido (use algo como nome@dominio.com).
                  </p>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="senha"
                className="guess-input"
                autoComplete="new-password"
                required
              />
              <PasswordHints password={password} />
              <div className="space-y-1">
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="repetir senha"
                  className="guess-input"
                  autoComplete="new-password"
                  required
                />
                {passwordConfirm.length > 0 ? (
                  <p
                    className={`text-[11px] ${
                      passwordsMatch ? 'text-cinema-cyan' : 'text-cinema-red'
                    }`}
                  >
                    {passwordsMatch
                      ? 'As senhas coincidem'
                      : 'As senhas não coincidem'}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}

          {mode === 'login' ? (
            <>
              <input
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="usuário ou e-mail"
                className="guess-input"
                autoComplete="username"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="senha"
                className="guess-input"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="self-start text-[11px] text-cinema-muted underline hover:text-cinema-gold"
              >
                Esqueci a senha
              </button>
            </>
          ) : null}

          {mode === 'forgot' ? (
            <>
              <p className="text-[11px] leading-snug text-cinema-muted">
                Enviamos um link pro e-mail cadastrado (válido por 1h).
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e-mail da conta"
                className="guess-input"
                autoComplete="email"
                required
              />
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="self-start text-[11px] text-cinema-muted underline hover:text-cinema-gold"
              >
                Voltar ao login
              </button>
            </>
          ) : null}

          {mode === 'reset' ? (
            <>
              <p className="text-[11px] leading-snug text-cinema-muted">
                Defina a nova senha da conta.
              </p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="nova senha"
                className="guess-input"
                autoComplete="new-password"
                required
              />
              <PasswordHints password={password} />
              <div className="space-y-1">
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="repetir nova senha"
                  className="guess-input"
                  autoComplete="new-password"
                  required
                />
                {passwordConfirm.length > 0 ? (
                  <p
                    className={`text-[11px] ${
                      passwordsMatch ? 'text-cinema-cyan' : 'text-cinema-red'
                    }`}
                  >
                    {passwordsMatch
                      ? 'As senhas coincidem'
                      : 'As senhas não coincidem'}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}

          {error ? (
            <p className="text-sm text-cinema-red">{error}</p>
          ) : null}
          {info ? (
            <p className="text-sm text-cinema-cyan">{info}</p>
          ) : null}
          {canResend ? (
            <button
              type="button"
              disabled={busy}
              onClick={handleResend}
              className="self-start text-[11px] text-cinema-gold underline disabled:opacity-50"
            >
              Reenviar confirmação
            </button>
          ) : null}

          <button
            type="submit"
            disabled={
              busy ||
              (mode === 'register' && !registerReady) ||
              (mode === 'reset' && (!strong || !passwordsMatch))
            }
            className="mode-btn mode-btn-primary mode-btn-inline px-4 py-3 font-display text-2xl disabled:opacity-50"
          >
            {busy
              ? '...'
              : mode === 'register'
                ? 'CRIAR'
                : mode === 'login'
                  ? 'ENTRAR'
                  : mode === 'forgot'
                    ? 'ENVIAR LINK'
                    : 'SALVAR SENHA'}
          </button>
        </form>
      </div>
    </div>
  )
}
