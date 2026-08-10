import { useEffect, useState } from 'react'
import { healthResponseSchema, type HealthResponse } from '@delve/contracts'

type LoadState = 'loading' | 'ready' | 'error'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v2'

function statusColor(ok: boolean | null) {
  if (ok === null) return 'var(--muted)'
  return ok ? 'var(--success)' : 'var(--error)'
}

export default function App() {
  const [backend, setBackend] = useState<LoadState>('loading')
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setBackend('loading')
      setError(null)
      try {
        const res = await fetch(`${API_BASE}/health`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json: unknown = await res.json()
        const parsed = healthResponseSchema.safeParse(json)
        if (!parsed.success) throw new Error('Unexpected health response shape')
        if (cancelled) return
        setHealth(parsed.data)
        setBackend('ready')
      } catch (e) {
        if (cancelled) return
        setHealth(null)
        setBackend('error')
        setError(e instanceof Error ? e.message : 'Failed to reach Backend V2')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const backendOk = backend === 'ready' ? true : backend === 'error' ? false : null
  // Database connectivity is reserved for Checkpoint 2 — report prepared/unknown.
  const databaseOk: boolean | null = null

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <main
        className="w-full max-w-lg rounded-2xl p-8"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-2" style={{ color: 'var(--primary)' }}>
          System status
        </p>
        <h1 className="text-3xl font-extrabold m-0 mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
          DELVE ADMIN
        </h1>
        <p className="text-sm m-0 mb-8" style={{ color: 'var(--muted)' }}>
          Checkpoint 1 foundation — operations screens arrive later.
        </p>

        <ul className="flex flex-col gap-3 list-none p-0 m-0">
          <StatusRow
            label="Backend status"
            detail={
              backend === 'loading'
                ? 'Checking /api/v2/health…'
                : backend === 'ready'
                  ? `${health?.service} · v${health?.version} · ${health?.status}`
                  : error ?? 'Unreachable'
            }
            ok={backendOk}
          />
          <StatusRow
            label="Database status"
            detail="Not connected this checkpoint (Prisma prepared; migration in Checkpoint 2)"
            ok={databaseOk}
          />
        </ul>
      </main>
    </div>
  )
}

function StatusRow({
  label,
  detail,
  ok,
}: {
  label: string
  detail: string
  ok: boolean | null
}) {
  return (
    <li
      className="rounded-xl px-4 py-3 flex items-start gap-3"
      style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}
    >
      <span
        className="mt-1 h-2.5 w-2.5 rounded-full shrink-0"
        style={{ background: statusColor(ok) }}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold m-0">{label}</p>
        <p className="text-xs m-0 mt-1 break-words" style={{ color: 'var(--muted)' }}>
          {detail}
        </p>
      </div>
    </li>
  )
}
