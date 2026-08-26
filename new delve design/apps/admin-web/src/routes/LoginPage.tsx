import { useId, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { adminLoginBodySchema } from '@delve/contracts'
import { useAdminAuth } from '../auth/AdminAuthContext'
import { AuthShell } from '../components/admin/AuthShell'
import { Brand } from '../components/admin/Brand'
import { StatusCard } from '../components/admin/StatusCard'

export default function LoginPage() {
  const { boot, sessionMessage, login, restoreSession, bootError, clearForbidden } = useAdminAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/dashboard'

  if (boot === 'loading') {
    return (
      <AuthShell>
        <StatusCard title="Checking administrator access" detail="Confirming your session with Backend V2…" />
      </AuthShell>
    )
  }

  if (boot === 'error') {
    return (
      <AuthShell>
        <StatusCard
          title="Administrator console unavailable"
          detail={bootError || 'Backend V2 could not be reached.'}
          actionLabel="Retry"
          onAction={() => void restoreSession()}
        />
      </AuthShell>
    )
  }

  if (boot === 'forbidden') {
    return (
      <AuthShell>
        <StatusCard
          title="Access denied"
          detail="This account is signed in but is not authorized for administrator access."
          actionLabel="Back to sign in"
          onAction={clearForbidden}
        />
      </AuthShell>
    )
  }

  if (boot === 'authenticated') {
    return <Navigate to={from} replace />
  }

  return (
    <AuthShell>
      <SignInPanel notice={sessionMessage} login={login} />
    </AuthShell>
  )
}

function SignInPanel({
  notice,
  login,
}: {
  notice: string | null
  login: (identifier: string, password: string) => Promise<void>
}) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const formId = useId()
  const errorId = `${formId}-error`

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    setError(null)
    const parsed = adminLoginBodySchema.safeParse({ identifier, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Check your sign-in details.')
      return
    }
    setSubmitting(true)
    try {
      await login(parsed.data.identifier, parsed.data.password)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="rounded-2xl p-6 sm:p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <Brand />
      <h1 className="text-2xl font-extrabold m-0 mt-6 mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
        Administrator access
      </h1>
      <p className="text-sm m-0 mb-5" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
        Restricted Delve operations sign-in. Authorized staff only.
      </p>

      {notice ? (
        <p className="text-sm m-0 mb-4 rounded-xl px-3 py-2" style={{ background: 'var(--elevated)', color: 'var(--fg)' }} role="status">
          {notice}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {error ? (
          <p id={errorId} role="alert" className="text-sm m-0 rounded-xl px-3 py-2" style={{ background: 'rgba(200,59,59,0.15)', color: '#ffb4b4' }}>
            {error}
          </p>
        ) : null}

        <label className="flex flex-col gap-1.5 text-sm">
          <span>Email or username</span>
          <input
            className="admin-input"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            required
          />
        </label>

        <AdminPasswordField
          value={password}
          onChange={setPassword}
          disabled={submitting}
          describedBy={error ? errorId : undefined}
          invalid={Boolean(error)}
        />

        <button type="submit" className="admin-btn" style={{ minHeight: 44 }} disabled={submitting || !identifier || !password} aria-busy={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-xs m-0 mt-5" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
        Access is restricted. If you are authorized and cannot sign in, contact{' '}
        <a href="mailto:delveworldwide@gmail.com" style={{ color: 'var(--fg)' }}>
          delveworldwide@gmail.com
        </a>
        .
      </p>
    </main>
  )
}

function AdminPasswordField({
  value,
  onChange,
  disabled,
  describedBy,
  invalid,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  describedBy?: string
  invalid?: boolean
}) {
  const [revealed, setRevealed] = useState(false)
  const [caps, setCaps] = useState(false)
  const capsId = useId()

  function syncCaps(event: KeyboardEvent<HTMLInputElement>) {
    if (typeof event.getModifierState === 'function') {
      setCaps(event.getModifierState('CapsLock'))
    }
  }

  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span>Password</span>
      <div className="relative">
        <input
          className="admin-input pr-14"
          name="password"
          type={revealed ? 'text' : 'password'}
          autoComplete="current-password"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={syncCaps}
          onKeyUp={syncCaps}
          onBlur={() => setCaps(false)}
          disabled={disabled}
          aria-invalid={invalid}
          aria-describedby={[describedBy, caps ? capsId : null].filter(Boolean).join(' ') || undefined}
          required
        />
        <button
          type="button"
          className="absolute right-1 top-1/2 -translate-y-1/2 admin-icon-btn"
          aria-label={revealed ? 'Hide password' : 'Show password'}
          aria-pressed={revealed}
          onClick={() => setRevealed(v => !v)}
          disabled={disabled}
        >
          {revealed ? 'Hide' : 'Show'}
        </button>
      </div>
      <span id={capsId} className="text-xs" style={{ color: 'var(--warning)', minHeight: '1rem' }} role="status" aria-live="polite">
        {caps ? 'Caps Lock is on' : '\u00a0'}
      </span>
    </label>
  )
}
