import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, ReactNode } from 'react'
import type { AdminMeData, BookingDto, BusinessPayableDto, CancellationRequestDto, DealAnalyticsSummary, DealDto, DealReportDto, RefundDto, SafeAdminUser } from '@delve/contracts'
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
    <Shell wide>
      <AdminHome
        admin={admin!}
        sessionExpiresAt={sessionExpiresAt}
        onLogout={() => void handleLogout()}
        onLogoutAll={() => void handleLogoutAll()}
      />
    </Shell>
  )
}

function Shell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          'radial-gradient(1200px 600px at 10% -10%, rgba(140,82,255,0.18), transparent), radial-gradient(900px 500px at 100% 0%, rgba(255,250,242,0.06), transparent), var(--bg)',
      }}
    >
      <div className={wide ? 'w-full max-w-5xl' : 'w-full max-w-md'}>{children}</div>
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
        Deal moderation uses the V2 admin cookie API.
      </p>
      <AdminDealsPanel />
      <AdminBookingsPanel />
      <AdminSettlementsPanel />
      <AdminRefundsPanel />
    </main>
  )
}

function AdminDealsPanel() {
  const [tab, setTab] = useState<'queue' | 'published' | 'reports' | 'featured' | 'analytics'>('queue')
  const [deals, setDeals] = useState<DealDto[]>([])
  const [reports, setReports] = useState<DealReportDto[]>([])
  const [analytics, setAnalytics] = useState<DealAnalyticsSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    setError(null)
    try {
      if (tab === 'reports') {
        const res = await adminFetch('/admin/deal-reports?status=OPEN')
        const body = (await res.json()) as { success: boolean; data?: DealReportDto[] }
        if (!res.ok || !body.success) throw new Error('Could not load reports')
        setReports(body.data || [])
        return
      }
      if (tab === 'analytics') {
        const res = await adminFetch('/admin/deal-analytics')
        const body = (await res.json()) as { success: boolean; data?: DealAnalyticsSummary }
        if (!res.ok || !body.success || !body.data) throw new Error('Could not load analytics')
        setAnalytics(body.data)
        return
      }
      const status = tab === 'queue' ? 'PENDING_REVIEW' : tab === 'featured' ? undefined : 'PUBLISHED'
      const qs = status ? `?status=${status}` : ''
      const res = await adminFetch(`/admin/deals${qs}`)
      const body = (await res.json()) as { success: boolean; data?: DealDto[] }
      if (!res.ok || !body.success) throw new Error('Could not load deals')
      const rows = body.data || []
      setDeals(tab === 'featured' ? rows.filter(d => d.featured) : rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed')
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function moderate(id: string, action: 'approve' | 'reject' | 'archive') {
    setBusy(true)
    try {
      const res = await adminFetch(`/admin/deals/${encodeURIComponent(id)}/moderate`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error('Action failed')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  async function feature(id: string, featured: boolean) {
    setBusy(true)
    try {
      const res = await adminFetch(`/admin/deals/${encodeURIComponent(id)}/featured`, {
        method: 'PATCH',
        body: JSON.stringify({ featured, featuredRank: featured ? 0 : null }),
      })
      if (!res.ok) throw new Error('Could not update featured')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update featured')
    } finally {
      setBusy(false)
    }
  }

  async function resolveReport(id: string, status: 'DISMISSED' | 'ACTIONED') {
    setBusy(true)
    try {
      const res = await adminFetch(`/admin/deal-reports/${encodeURIComponent(id)}`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Could not resolve report')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resolve report')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl p-4 mt-4" style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}>
      <h2 className="text-sm font-semibold m-0 mb-3">Deals</h2>
      <div className="flex flex-wrap gap-2 mb-3">
        {([
          ['queue', 'Review queue'],
          ['published', 'Published'],
          ['reports', 'Reports'],
          ['featured', 'Featured'],
          ['analytics', 'Analytics'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="admin-btn-secondary"
            onClick={() => setTab(id)}
            style={{ opacity: tab === id ? 1 : 0.7, minHeight: 36 }}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm m-0 mb-2" style={{ color: '#ffb4b4' }}>{error}</p> : null}
      {tab === 'analytics' && analytics ? (
        <p className="text-sm m-0" style={{ color: 'var(--muted)' }}>
          Impressions {analytics.impressions} · Clicks {analytics.clicks} · Claims {analytics.claims} · Redemptions {analytics.redemptions} · Saves {analytics.saves} · Journey adds {analytics.journeyAdds}
        </p>
      ) : null}
      {tab === 'reports' ? (
        <ul className="list-none m-0 p-0 flex flex-col gap-2">
          {reports.map(r => (
            <li key={r.id} className="rounded-lg p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-sm font-semibold m-0">{r.deal?.title || r.dealId}</p>
              <p className="text-xs m-0 mt-1" style={{ color: 'var(--muted)' }}>{r.reason} · {r.details || 'No details'}</p>
              <div className="flex gap-2 mt-2">
                <button type="button" className="admin-btn-secondary" disabled={busy} onClick={() => void resolveReport(r.id, 'DISMISSED')}>Dismiss</button>
                <button type="button" className="admin-btn" disabled={busy} onClick={() => void resolveReport(r.id, 'ACTIONED')}>Actioned</button>
              </div>
            </li>
          ))}
          {reports.length === 0 ? <p className="text-sm m-0" style={{ color: 'var(--muted)' }}>No open reports.</p> : null}
        </ul>
      ) : tab !== 'analytics' ? (
        <ul className="list-none m-0 p-0 flex flex-col gap-2">
          {deals.map(d => (
            <li key={d.id} className="rounded-lg p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-sm font-semibold m-0">{d.title}</p>
              <p className="text-xs m-0 mt-1" style={{ color: 'var(--muted)' }}>
                {d.status} · {d.business.name} · {d.discountSummary}
                {d.listing ? ` · Listing: ${d.listing.title}` : ''}
              </p>
              {d.pricing ? (
                <p className="text-xs m-0 mt-1" style={{ color: 'var(--muted)' }}>
                  Listing/base {d.pricing.currency} {d.pricing.originalAmount} · Advertised {d.pricing.currency} {d.pricing.dealAmount} · Save {d.pricing.currency} {d.pricing.savingAmount} ({d.pricing.discountPercentage}%)
                </p>
              ) : (
                <p className="text-xs m-0 mt-1" style={{ color: 'var(--muted)' }}>
                  No authoritative monetary price yet.
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {tab === 'queue' ? (
                  <>
                    <button type="button" className="admin-btn" disabled={busy} onClick={() => void moderate(d.id, 'approve')}>Approve</button>
                    <button type="button" className="admin-btn-secondary" disabled={busy} onClick={() => void moderate(d.id, 'reject')}>Reject</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="admin-btn-secondary" disabled={busy} onClick={() => void feature(d.id, !d.featured)}>
                      {d.featured ? 'Unfeature' : 'Feature'}
                    </button>
                    <button type="button" className="admin-btn-secondary" disabled={busy} onClick={() => void moderate(d.id, 'archive')}>Archive</button>
                  </>
                )}
              </div>
            </li>
          ))}
          {deals.length === 0 ? <p className="text-sm m-0" style={{ color: 'var(--muted)' }}>Nothing here.</p> : null}
        </ul>
      ) : null}
    </section>
  )
}

function AdminBookingsPanel() {
  const [rows, setRows] = useState<BookingDto[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await adminFetch('/admin/bookings')
        const body = (await res.json()) as { success: boolean; data?: BookingDto[] }
        if (!res.ok || !body.success) throw new Error('Could not load bookings')
        if (!cancelled) setRows(body.data || [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load bookings')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold m-0 mb-2">Bookings</h2>
      <p className="text-xs m-0 mb-3" style={{ color: 'var(--muted)' }}>
        Inspect-only list of reservations. Traveler payment and business settlement are separate.
      </p>
      {error && <p className="text-sm" style={{ color: 'crimson' }}>{error}</p>}
      <ul className="list-none m-0 p-0 space-y-2">
        {rows.map(b => (
          <li key={b.id} className="rounded-xl p-3" style={{ border: '1px solid var(--border)' }}>
            <p className="text-xs font-mono m-0">{b.bookingReference}</p>
            <p className="text-sm font-semibold m-0">{b.listing.title} · {b.status}</p>
            <p className="text-xs m-0">
              {b.business.name} · {b.traveler?.displayName || 'traveler'} · {b.pricing.currency} {b.pricing.finalAmount}
            </p>
          </li>
        ))}
        {rows.length === 0 && !error ? <p className="text-sm m-0" style={{ color: 'var(--muted)' }}>No bookings.</p> : null}
      </ul>
    </section>
  )
}

function moneyLabel(currency: string, amount: string) {
  return `${currency} ${amount}`
}

function AdminSettlementsPanel() {
  const tabs = ['ELIGIBLE', 'PENDING', 'PROCESSING', 'TRANSFERRED', 'REVERSED', 'BLOCKED'] as const
  const [tab, setTab] = useState<(typeof tabs)[number]>('ELIGIBLE')
  const [rows, setRows] = useState<BusinessPayableDto[]>([])
  const [selected, setSelected] = useState<BusinessPayableDto | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function loadList() {
    const res = await adminFetch(`/admin/settlements?status=${encodeURIComponent(tab)}`)
    const body = (await res.json()) as { success: boolean; data?: BusinessPayableDto[]; error?: { message?: string } }
    if (!res.ok || !body.success) throw new Error(body.error?.message || 'Could not load settlements')
    setRows(body.data || [])
  }

  async function loadDetail(id: string) {
    const res = await adminFetch(`/admin/settlements/${encodeURIComponent(id)}`)
    const body = (await res.json()) as { success: boolean; data?: BusinessPayableDto; error?: { message?: string } }
    if (!res.ok || !body.success || !body.data) throw new Error(body.error?.message || 'Could not load settlement')
    setSelected(body.data)
  }

  useEffect(() => {
    let cancelled = false
    setError(null)
    void loadList()
      .then(() => {
        if (cancelled) return
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load settlements')
      })
    return () => {
      cancelled = true
    }
  }, [tab])

  async function release() {
    if (!selected || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await adminFetch(`/admin/settlements/${encodeURIComponent(selected.id)}/release`, {
        method: 'POST',
        body: '{}',
      })
      const body = (await res.json()) as { success: boolean; data?: BusinessPayableDto; error?: { message?: string } }
      if (!res.ok || !body.success) throw new Error(body.error?.message || 'Release failed')
      setConfirm(false)
      if (body.data) setSelected(body.data)
      await loadList()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Release failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold m-0 mb-1">Payments → Settlements</h2>
      <p className="text-xs m-0 mb-3" style={{ color: 'var(--muted)' }}>
        Traveler payment is already collected. Settlement is a Stripe Transfer to the connected account — not a bank
        payout.
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {tabs.map(id => (
          <button
            key={id}
            type="button"
            className="admin-btn-secondary"
            onClick={() => {
              setSelected(null)
              setConfirm(false)
              setTab(id)
            }}
            style={{ opacity: tab === id ? 1 : 0.7, minHeight: 36 }}
          >
            {id.charAt(0) + id.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm m-0 mb-2" style={{ color: '#ffb4b4' }}>{error}</p> : null}
      <ul className="list-none m-0 p-0 space-y-2">
        {rows.map(row => (
          <li key={row.id}>
            <button
              type="button"
              className="w-full text-left rounded-xl p-3"
              style={{
                border: selected?.id === row.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: 'var(--surface)',
              }}
              onClick={() => {
                setConfirm(false)
                void loadDetail(row.id).catch(err => setError(err instanceof Error ? err.message : 'Could not load'))
              }}
            >
              <p className="text-xs font-mono m-0">{row.booking.bookingReference}</p>
              <p className="text-sm font-semibold m-0">{row.business.name} · {row.status}</p>
              <p className="text-xs m-0" style={{ color: 'var(--muted)' }}>
                Traveler {moneyLabel(row.currency, row.grossAmount)} · Commission{' '}
                {moneyLabel(row.currency, row.platformCommissionAmount)} · Business{' '}
                {moneyLabel(row.currency, row.businessNetAmount)}
              </p>
              <p className="text-xs m-0" style={{ color: 'var(--muted)' }}>
                Booking {row.booking.status} · Payment {row.payment.status} · {row.eligibility.reason}
              </p>
            </button>
          </li>
        ))}
        {rows.length === 0 && !error ? <p className="text-sm m-0" style={{ color: 'var(--muted)' }}>No settlements in this section.</p> : null}
      </ul>
      {selected ? (
        <div className="rounded-xl p-4 mt-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <h3 className="text-sm font-bold m-0 mb-2">Settlement detail</h3>
          <p className="text-xs m-0">Business: {selected.business.name}</p>
          <p className="text-xs m-0">Connect: {selected.business.stripeAccountStatus} · payouts {selected.business.payoutsEnabled ? 'on' : 'off'}</p>
          <p className="text-xs m-0">Booking: {selected.booking.bookingReference} · {selected.booking.status}</p>
          <p className="text-xs m-0">Payment: {selected.payment.status} · {moneyLabel(selected.currency, selected.payment.amount)}</p>
          <p className="text-xs m-0">Gross {moneyLabel(selected.currency, selected.grossAmount)}</p>
          <p className="text-xs m-0">Delve commission {moneyLabel(selected.currency, selected.platformCommissionAmount)}</p>
          <p className="text-xs m-0">Business net {moneyLabel(selected.currency, selected.businessNetAmount)}</p>
          <p className="text-xs m-0">Stripe fee: {selected.stripeFeeAmount ? moneyLabel(selected.currency, selected.stripeFeeAmount) : 'not retrieved'}</p>
          <p className="text-xs m-0">Paid: {selected.payment.paidAt || '—'}</p>
          <p className="text-xs m-0">Completed: {selected.booking.completedAt || '—'}</p>
          <p className="text-xs m-0 mt-2">{selected.eligibility.reason}</p>
          {selected.attempts && selected.attempts.length > 0 ? (
            <ul className="text-xs m-2 p-0 list-none">
              {selected.attempts.map(a => (
                <li key={a.id}>
                  {a.outcome} · {a.stripeTransferId || a.failureCode || '—'} · {a.createdAt}
                </li>
              ))}
            </ul>
          ) : null}
          {selected.status === 'TRANSFERRED' || selected.stripeTransferId ? (
            <p className="text-xs m-0 mt-2">
              TRANSFERRED {moneyLabel(selected.currency, selected.businessNetAmount)}
              {selected.transferredAt ? ` · ${selected.transferredAt}` : ''}
            </p>
          ) : null}
          {selected.reversal ? (
            <p className="text-xs m-0 mt-1">
              REVERSED {moneyLabel(selected.reversal.currency, selected.reversal.amount)} · {selected.reversal.status}
              {selected.reversal.succeededAt ? ` · ${selected.reversal.succeededAt}` : ''}
              {selected.reversal.failureMessage ? ` · ${selected.reversal.failureMessage}` : ''}
            </p>
          ) : null}
          {selected.eligibility.code === 'REFUND_IN_PROGRESS' ? (
            <p className="text-xs m-0 mt-2" style={{ color: '#ffb4b4' }}>
              SETTLEMENT BLOCKED — Traveler refund/cancellation in progress.
            </p>
          ) : null}
          {selected.status === 'ELIGIBLE' && selected.eligibility.eligible && selected.eligibility.code !== 'REFUND_IN_PROGRESS' ? (
            confirm ? (
              <div className="mt-3">
                <p className="text-sm font-semibold m-0 mb-2">
                  Release {moneyLabel(selected.currency, selected.businessNetAmount)} to {selected.business.name}?
                </p>
                <p className="text-xs m-0">Traveler paid: {moneyLabel(selected.currency, selected.grossAmount)}</p>
                <p className="text-xs m-0">Delve commission: {moneyLabel(selected.currency, selected.platformCommissionAmount)}</p>
                <p className="text-xs m-0">Business settlement: {moneyLabel(selected.currency, selected.businessNetAmount)}</p>
                <p className="text-xs m-0">Business: {selected.business.name}</p>
                <p className="text-xs m-0 mb-3">Booking: {selected.booking.bookingReference}</p>
                <div className="flex gap-2">
                  <button type="button" className="admin-btn-secondary" disabled={busy} onClick={() => setConfirm(false)}>
                    Cancel
                  </button>
                  <button type="button" className="admin-btn" disabled={busy} onClick={() => void release()}>
                    {busy ? 'Releasing…' : 'Release Settlement'}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="admin-btn mt-3" onClick={() => setConfirm(true)}>
                Release Settlement
              </button>
            )
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function AdminRefundsPanel() {
  const refundTabs = ['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED'] as const
  const [tab, setTab] = useState<(typeof refundTabs)[number]>('PENDING')
  const [mode, setMode] = useState<'refunds' | 'requests'>('requests')
  const [refunds, setRefunds] = useState<RefundDto[]>([])
  const [requests, setRequests] = useState<CancellationRequestDto[]>([])
  const [selected, setSelected] = useState<RefundDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmReverse, setConfirmReverse] = useState(false)

  async function load() {
    if (mode === 'requests') {
      const res = await adminFetch('/admin/cancellation-requests?status=PENDING')
      const body = (await res.json()) as { success: boolean; data?: CancellationRequestDto[] }
      if (!res.ok || !body.success) throw new Error('Could not load cancellation requests')
      setRequests(body.data || [])
      return
    }
    const res = await adminFetch(`/admin/refunds?status=${encodeURIComponent(tab)}`)
    const body = (await res.json()) as { success: boolean; data?: RefundDto[] }
    if (!res.ok || !body.success) throw new Error('Could not load refunds')
    setRefunds(body.data || [])
  }

  useEffect(() => {
    let cancelled = false
    setError(null)
    void load().catch(err => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load')
    })
    return () => {
      cancelled = true
    }
  }, [tab, mode])

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold m-0 mb-1">Payments → Refunds</h2>
      <p className="text-xs m-0 mb-3" style={{ color: 'var(--muted)' }}>
        Paid cancellation is a review workflow. If settlement was already transferred, reverse the Stripe Transfer
        before refunding the traveler. A Transfer reversal is not a bank payout reversal.
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        <button type="button" className="admin-btn-secondary" onClick={() => setMode('requests')} style={{ opacity: mode === 'requests' ? 1 : 0.7 }}>
          Requests
        </button>
        {refundTabs.map(id => (
          <button
            key={id}
            type="button"
            className="admin-btn-secondary"
            onClick={() => {
              setMode('refunds')
              setTab(id)
              setSelected(null)
            }}
            style={{ opacity: mode === 'refunds' && tab === id ? 1 : 0.7 }}
          >
            {id.charAt(0) + id.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm m-0 mb-2" style={{ color: '#ffb4b4' }}>{error}</p> : null}
      {mode === 'requests' ? (
        <ul className="list-none m-0 p-0 space-y-2">
          {requests.map(r => (
            <li key={r.id} className="rounded-xl p-3" style={{ border: '1px solid var(--border)' }}>
              <p className="text-xs font-mono m-0">{r.bookingId}</p>
              <p className="text-sm m-0">{r.reason} · {r.requestedByType}</p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  className="admin-btn"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true)
                    void adminFetch(`/admin/cancellation-requests/${encodeURIComponent(r.id)}/approve`, {
                      method: 'POST',
                      body: '{}',
                    })
                      .then(async res => {
                        const body = (await res.json()) as { success: boolean; error?: { message?: string } }
                        if (!res.ok || !body.success) throw new Error(body.error?.message || 'Approve failed')
                        await load()
                      })
                      .catch(err => setError(err instanceof Error ? err.message : 'Approve failed'))
                      .finally(() => setBusy(false))
                  }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true)
                    void adminFetch(`/admin/cancellation-requests/${encodeURIComponent(r.id)}/reject`, {
                      method: 'POST',
                      body: '{}',
                    })
                      .then(async res => {
                        const body = (await res.json()) as { success: boolean; error?: { message?: string } }
                        if (!res.ok || !body.success) throw new Error(body.error?.message || 'Reject failed')
                        await load()
                      })
                      .catch(err => setError(err instanceof Error ? err.message : 'Reject failed'))
                      .finally(() => setBusy(false))
                  }}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
          {requests.length === 0 ? <p className="text-sm m-0" style={{ color: 'var(--muted)' }}>No pending cancellation requests.</p> : null}
        </ul>
      ) : (
        <ul className="list-none m-0 p-0 space-y-2">
          {refunds.map(row => (
            <li key={row.id}>
              <button
                type="button"
                className="w-full text-left rounded-xl p-3"
                style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
                onClick={() => setSelected(row)}
              >
                <p className="text-xs font-mono m-0">{row.booking?.bookingReference}</p>
                <p className="text-sm font-semibold m-0">{row.business?.name} · {row.status}</p>
                <p className="text-xs m-0">
                  Payment {row.payment?.amount} · Refund {row.currency} {row.amount} · {row.reason}
                </p>
                <p className="text-xs m-0">Settlement {row.payable?.status || 'none'}</p>
              </button>
            </li>
          ))}
          {refunds.length === 0 ? <p className="text-sm m-0" style={{ color: 'var(--muted)' }}>No refunds in this section.</p> : null}
        </ul>
      )}
      {selected ? (
        <div className="rounded-xl p-4 mt-4" style={{ border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-bold m-0 mb-2">Refund detail</h3>
          <p className="text-xs m-0 font-semibold mt-2">PAYMENT</p>
          <p className="text-xs m-0">
            {selected.payment?.status} {selected.payment?.amount} {selected.currency}
          </p>
          <p className="text-xs m-0 font-semibold mt-2">SETTLEMENT</p>
          <p className="text-xs m-0">
            {selected.payable?.status || 'none'}
            {selected.payable?.businessNetAmount
              ? ` ${selected.payable.businessNetAmount} ${selected.currency}`
              : ''}
          </p>
          <p className="text-xs m-0">Booking {selected.booking?.bookingReference} · {selected.booking?.status}</p>
          <p className="text-xs m-0">Traveler {selected.traveler?.displayName}</p>
          <p className="text-xs m-0">Business {selected.business?.name}</p>
          <p className="text-xs m-0 font-semibold mt-2">REVERSAL</p>
          <p className="text-xs m-0">
            {selected.reversal
              ? `${selected.reversal.status} ${selected.reversal.amount} ${selected.reversal.currency}`
              : selected.requiresSettlementReversal
                ? 'Required — not started'
                : 'Not required'}
          </p>
          {selected.reversal?.failureMessage ? (
            <p className="text-xs m-0" style={{ color: '#ffb4b4' }}>
              {selected.reversal.failureCode}: {selected.reversal.failureMessage}
            </p>
          ) : null}
          <p className="text-xs m-0 font-semibold mt-2">REFUND</p>
          <p className="text-xs m-0">
            {selected.status} {selected.amount} {selected.currency}
          </p>
          {selected.failureCode ? (
            <p className="text-xs m-0">
              {selected.failureCode}: {selected.failureMessage}
            </p>
          ) : null}
          {selected.reversal?.status === 'SUCCEEDED' && selected.status === 'FAILED' ? (
            <p className="text-xs m-0 mt-2" style={{ color: '#ffb4b4' }}>
              Business settlement recovered, but traveler refund failed.
            </p>
          ) : null}
          {selected.requiresSettlementReversal && selected.reversal?.status !== 'PROCESSING' ? (
            confirmReverse ? (
              <div className="mt-3">
                <p className="text-sm font-semibold m-0 mb-2">Settlement reversal required</p>
                <p className="text-xs m-0">Business: {selected.business?.name}</p>
                <p className="text-xs m-0">
                  Traveler originally paid: {selected.payment?.amount} {selected.currency}
                </p>
                <p className="text-xs m-0">
                  Transferred to Business Stripe account: {selected.payable?.businessNetAmount} {selected.currency}
                </p>
                <p className="text-xs m-0">
                  Delve commission: {selected.payable?.platformCommissionAmount} {selected.currency}
                </p>
                <p className="text-xs m-0">
                  Traveler refund: {selected.amount} {selected.currency}
                </p>
                <p className="text-xs m-0 mb-3">
                  Required first step: Reverse {selected.payable?.businessNetAmount} {selected.currency} Stripe Transfer
                </p>
                <div className="flex gap-2">
                  <button type="button" className="admin-btn-secondary" disabled={busy} onClick={() => setConfirmReverse(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="admin-btn"
                    disabled={busy}
                    onClick={() => {
                      setBusy(true)
                      void adminFetch(`/admin/refunds/${encodeURIComponent(selected.id)}/reverse-and-continue`, {
                        method: 'POST',
                        body: '{}',
                      })
                        .then(async res => {
                          const body = (await res.json()) as { success: boolean; data?: RefundDto; error?: { message?: string } }
                          if (!res.ok || !body.success) throw new Error(body.error?.message || 'Reversal failed')
                          if (body.data) setSelected(body.data)
                          setConfirmReverse(false)
                          await load()
                        })
                        .catch(err => setError(err instanceof Error ? err.message : 'Reversal failed'))
                        .finally(() => setBusy(false))
                    }}
                  >
                    Reverse Settlement
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="admin-btn mt-3" onClick={() => setConfirmReverse(true)}>
                Reverse Settlement & Continue Refund
              </button>
            )
          ) : null}
          {(selected.status === 'PENDING' || selected.status === 'FAILED') &&
          !selected.requiresSettlementReversal &&
          selected.payable?.status !== 'PROCESSING' &&
          selected.reversal?.status !== 'PROCESSING' ? (
            <button
              type="button"
              className="admin-btn mt-3"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                void adminFetch(`/admin/refunds/${encodeURIComponent(selected.id)}/issue`, { method: 'POST', body: '{}' })
                  .then(async res => {
                    const body = (await res.json()) as { success: boolean; data?: RefundDto; error?: { message?: string } }
                    if (!res.ok || !body.success) throw new Error(body.error?.message || 'Issue failed')
                    if (body.data) setSelected(body.data)
                    await load()
                  })
                  .catch(err => setError(err instanceof Error ? err.message : 'Issue failed'))
                  .finally(() => setBusy(false))
              }}
            >
              Issue Refund
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
