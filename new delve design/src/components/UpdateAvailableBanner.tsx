import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

const POLL_MS = 60_000

type VersionPayload = {
  buildId?: string
}

function versionUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  const root = base.endsWith('/') ? base : `${base}/`
  return `${root}version.json`
}

/**
 * Polls no-cache version.json. When production ships a new build,
 * open tabs can offer a one-click refresh.
 */
export default function UpdateAvailableBanner() {
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    if (import.meta.env.DEV) return

    let cancelled = false
    const current = typeof __DELVE_BUILD_ID__ !== 'undefined' ? __DELVE_BUILD_ID__ : ''

    async function check() {
      try {
        const res = await fetch(versionUrl(), { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as VersionPayload
        if (!cancelled && data.buildId && current && data.buildId !== current) {
          setUpdateReady(true)
        }
      } catch {
        // Offline / transient — ignore
      }
    }

    void check()
    const id = window.setInterval(() => void check(), POLL_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') void check()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  if (!updateReady) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[200] flex justify-center p-3 pointer-events-none"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      role="status"
      aria-live="polite"
    >
      <div
        className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-3 shadow-lg"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--fg)',
        }}
      >
        <p className="min-w-0 flex-1 text-sm leading-5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          A new version is available
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-bold text-white"
          style={{ background: 'var(--primary)' }}
        >
          <RefreshCw size={15} aria-hidden />
          Refresh
        </button>
      </div>
    </div>
  )
}
