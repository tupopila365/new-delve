import { useEffect, useState } from 'react'
import { healthResponseSchema } from '@delve/contracts'

type ConnState = 'loading' | 'ready' | 'error' | 'idle'

/**
 * Compact Backend V2 connection indicator for Checkpoint 1.
 * Does not redesign product screens — only reports API reachability.
 */
export default function SystemStatusChip() {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined
  const [state, setState] = useState<ConnState>(base ? 'loading' : 'idle')
  const [label, setLabel] = useState('API not configured')

  useEffect(() => {
    if (!base) return
    const apiBase = base
    let cancelled = false
    async function ping() {
      setState('loading')
      try {
        const res = await fetch(`${apiBase.replace(/\/$/, '')}/health`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json: unknown = await res.json()
        const parsed = healthResponseSchema.safeParse(json)
        if (!parsed.success) throw new Error('Invalid health payload')
        if (cancelled) return
        setState('ready')
        setLabel(`API ${parsed.data.status}`)
      } catch {
        if (cancelled) return
        setState('error')
        setLabel('API unreachable')
      }
    }
    void ping()
    return () => {
      cancelled = true
    }
  }, [base])

  const color =
    state === 'ready' ? '#16845B' : state === 'error' ? '#C83B3B' : state === 'loading' ? '#B76808' : 'var(--fg-muted)'

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0"
      style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color }}
      role="status"
      aria-live="polite"
      title={base ? `VITE_API_BASE_URL=${base}` : 'Set VITE_API_BASE_URL to enable Backend V2 checks'}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} aria-hidden />
      {state === 'loading' ? 'Checking API…' : label}
    </div>
  )
}
