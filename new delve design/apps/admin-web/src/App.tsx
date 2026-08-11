import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, ReactNode } from 'react'
import type { AdminMeData, SafeAdminUser } from '@delve/contracts'
import { adminLoginBodySchema, adminMeDataSchema, adminLoginSuccessSchema } from '@delve/contracts'

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v2').replace(/\/$/, '')

type BootState = 'loading' | 'authenticated' | 'unauthenticated' | 'forbidden' | 'error'

type Cache = {
  user: SafeAdminUser | null
  sessionExpiresAt: string | null
  csrfToken: string | null
}

let memoryCache: Cache = { user: null, sessionExpiresAt: null, csrfToken: null }

function clearAdminCache() {
  memoryCache = { user: null, sessionExpiresAt: null, csrfToken: null }
}

function readCsrfFromDocumentCookie(): string | null {
  if (typeof document === 'undefined') return null
  const name = 'delve_admin_csrf='
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(name)) {
      try {
        return decodeURIComponent(trimmed.slice(name.length))
      } catch {
        return trimmed.slice(name.length)
      }
    }
  }
  return null
}

async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase()
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = memoryCache.csrfToken || readCsrfFromDocumentCookie()
    if (csrf) headers['X-CSRF-Token'] = csrf
  }
  return fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  })
}

export default function App() {
  const [boot, setBoot] = useState<BootState>('loading')
  const [admin, setAdmin] = useState<SafeAdminUser | null>(null)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null)
  const [bootError, setBootError] = useState<string | null>(null)
  const [sessionMessage, setSessionMessage] = useState<string | null>(null)
  const intendedRef = useRef<string | null>(null)

  async function restoreSession() {
    setBoot('loading')
    setBootError(null)
    try {
      const res = await adminFetch('/admin/auth/me')
      if (res.status === 401) {
        clearAdminCache()
        setAdmin(null)
        setBoot('unauthenticated')
        return
      }
      if (res.status === 403) {
        clearAdminCache()
        setAdmin(null)
        setBoot('forbidden')
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: unknown = await res.json()
      const parsed = adminMeDataSchema.safeParse((json as { data?: unknown }).data ?? json)
      if (!parsed.success) throw new Error('Unexpected administrator response')
      applyMe(parsed.data)
      setBoot('authenticated')
    } catch (e) {
      clearAdminCache()
      setAdmin(null)
      setBoot('error')
      setBootError(e instanceof Error ? e.message : 'Unable to reach Backend V2')
    }
  }

  function applyMe(data: AdminMeData & { csrfToken?: string }) {
    memoryCache = {
      user: data.user,
      sessionExpiresAt: data.session.expiresAt,
      csrfToken: data.csrfToken || memoryCache.csrfToken || readCsrfFromDocumentCookie(),
    }
    setAdmin(data.user)
    setSessionExpiresAt(data.session.expiresAt)
  }

  useEffect(() => {
    void restoreSession()
  }, [])

  async function handleLogin(identifier: string, password: string) {
    const res = await adminFetch('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    })
    if (res.status === 401 || res.status === 403) {
      throw new Error('Invalid email/username or password')
    }
    if (res.status === 429) {
      throw new Error('Too many sign-in attempts. Try again later.')
    }
    if (!res.ok) throw new Error('Sign-in failed. Try again.')
    const json: unknown = await res.json()
    const parsed = adminLoginSuccessSchema.safeParse((json as { data?: unknown }).data ?? json)
    if (!parsed.success) throw new Error('Unexpected sign-in response')
    applyMe({ ...parsed.data, permissions: [] })
    setSessionMessage(null)
    setBoot('authenticated')
  }

  async function handleLogout() {
    try {
      await adminFetch('/admin/auth/logout', { method: 'POST', body: '{}' })
    } catch {
      // Still clear local state if the session was already invalid.
    }
    clearAdminCache()
    setAdmin(null)
    setSessionExpiresAt(null)
    setSessionMessage('You have been signed out.')
    setBoot('unauthenticated')
  }

  async function handleLogoutAll() {
    try {
      await adminFetch('/admin/auth/logout-all', { method: 'POST', body: '{}' })
    } catch {
      // ignore network; still clear
    }
    clearAdminCache()
    setAdmin(null)
    setSessionExpiresAt(null)
    setSessionMessage('Signed out from every administrator session.')
    setBoot('unauthenticated')
  }

  if (boot === 'loading') {
    return (
      <Shell>
        <StatusCard title="Checking administrator access" detail="Confirming your session with Backend V2…" />
      </Shell>
    )
  }

  if (boot === 'error') {
    return (
      <Shell>
        <StatusCard
          title="Administrator console unavailable"
          detail={bootError || 'Backend V2 could not be reached.'}
          actionLabel="Retry"
          onAction={() => void restoreSession()}
        />
      </Shell>
    )
  }

  if (boot === 'forbidden') {
    return (
      <Shell>
        <StatusCard
          title="Access denied"
          detail="This account is signed in but is not authorized for administrator access."
          actionLabel="Back to sign in"
          onAction={() => {
            clearAdminCache()
            setBoot('unauthenticated')
          }}
        />
      </Shell>
    )
  }

  if (boot === 'unauthenticated') {
    return (
      <Shell>
        <SignInPanel
          notice={sessionMessage}
          onSignedIn={() => {
            intendedRef.current = null
          }}
          login={handleLogin}
        />
      </Shell>
    )
  }

  return (
    <Shell>
      <AdminHome
        admin={admin!}
        sessionExpiresAt={sessionExpiresAt}
        onLogout={() => void handleLogout()}
        onLogoutAll={() => void handleLogoutAll()}
      />
    </Shell>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          'radial-gradient(1200px 600px at 10% -10%, rgba(140,82,255,0.18), transparent), radial-gradient(900px 500px at 100% 0%, rgba(255,250,242,0.06), transparent), var(--bg)',
      }}
    >
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}

function StatusCard({
  title,
  detail,
  actionLabel,
  onAction,
}: {
  title: string
  detail: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <main className="rounded-2xl p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <Brand />
      <h1 className="text-2xl font-extrabold m-0 mt-6 mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
        {title}
      </h1>
      <p className="text-sm m-0" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
        {detail}
      </p>
      {actionLabel && onAction ? (
        <button type="button" className="admin-btn mt-6" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </main>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <img src="/DELVE.png" alt="" width={40} height={40} className="rounded-lg" />
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] uppercase m-0" style={{ color: 'var(--primary)' }}>
          Delve Worldwide
        </p>
        <p className="text-sm m-0" style={{ color: 'var(--muted)' }}>
          Operations console
        </p>
      </div>
    </div>
  )
}

function SignInPanel({
  notice,
  login,
  onSignedIn,
}: {
  notice: string | null
  login: (identifier: string, password: string) => Promise<void>
  onSignedIn: () => void
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
      onSignedIn()
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

        <button type="submit" className="admin-btn" disabled={submitting || !identifier || !password} aria-busy={submitting}>
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

function AdminHome({
  admin,
  sessionExpiresAt,
  onLogout,
  onLogoutAll,
}: {
  admin: SafeAdminUser
  sessionExpiresAt: string | null
  onLogout: () => void
  onLogoutAll: () => void
}) {
  const [confirmEverywhere, setConfirmEverywhere] = useState(false)
  const [busy, setBusy] = useState(false)

  return (
    <main className="rounded-2xl p-6 sm:p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-3">
        <Brand />
        <button type="button" className="admin-btn-secondary" onClick={onLogout} style={{ minHeight: 44 }}>
          Sign out
        </button>
      </div>

      <h1 className="text-2xl font-extrabold m-0 mt-6 mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
        Administrator home
      </h1>
      <p className="text-sm m-0 mb-6" style={{ color: 'var(--muted)' }}>
        Signed in as <strong style={{ color: 'var(--fg)' }}>{admin.displayName || admin.username}</strong> ({admin.email})
      </p>

      <section className="rounded-xl p-4 mb-4" style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}>
        <h2 className="text-sm font-semibold m-0 mb-2">Session</h2>
        <p className="text-sm m-0" style={{ color: 'var(--muted)' }}>
          Expires {sessionExpiresAt ? new Date(sessionExpiresAt).toLocaleString() : '—'}
        </p>
      </section>

      <section className="rounded-xl p-4" style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}>
        <h2 className="text-sm font-semibold m-0 mb-2">Security</h2>
        <p className="text-sm m-0 mb-3" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
          Sign out everywhere ends every active Delve administrator session for this account, including this one.
        </p>
        {!confirmEverywhere ? (
          <button type="button" className="admin-btn-secondary" onClick={() => setConfirmEverywhere(true)}>
            Sign out everywhere
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm m-0" role="status">
              Confirm: end every administrator session?
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                className="admin-btn"
                disabled={busy}
                onClick={() => {
                  if (busy) return
                  setBusy(true)
                  onLogoutAll()
                }}
              >
                {busy ? 'Signing out…' : 'Yes, sign out everywhere'}
              </button>
              <button type="button" className="admin-btn-secondary" disabled={busy} onClick={() => setConfirmEverywhere(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <p className="text-xs m-0 mt-6" style={{ color: 'var(--muted)' }}>
        Moderation and provider tools arrive in later checkpoints. Authentication is live.
      </p>
    </main>
  )
}
