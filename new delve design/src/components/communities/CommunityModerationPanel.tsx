import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Loader2, Shield } from 'lucide-react'
import type { CommunityReportDto, CommunityThreadSummary } from '@delve/contracts'
import {
  approveCommunityThread,
  listCommunityReports,
  listCommunityThreads,
  removeCommunityThread,
  resolveCommunityReport,
} from '../../api/communityClient'

export default function CommunityModerationPanel({
  communityId,
  onRefresh,
}: {
  communityId: string
  onRefresh?: () => void
}) {
  const [reports, setReports] = useState<CommunityReportDto[]>([])
  const [pending, setPending] = useState<CommunityThreadSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [r, threads] = await Promise.all([
        listCommunityReports(communityId),
        listCommunityThreads({ communityId }),
      ])
      setReports(r)
      setPending(threads.filter(t => t.status === 'PENDING'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load moderation data')
    } finally {
      setLoading(false)
    }
  }, [communityId])

  useEffect(() => {
    void load()
  }, [load])

  async function act(key: string, fn: () => Promise<unknown>) {
    setBusy(key)
    try {
      await fn()
      await load()
      onRefresh?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Shield size={18} style={{ color: 'var(--primary)' }} />
        <h3 className="text-sm font-bold m-0" style={{ color: 'var(--fg)' }}>Moderation</h3>
      </div>
      {error && (
        <p className="text-sm flex items-center gap-2 m-0" style={{ color: '#E11D48' }}>
          <AlertCircle size={14} /> {error}
        </p>
      )}

      <section>
        <h4 className="text-xs font-bold uppercase m-0 mb-2" style={{ color: 'var(--fg-muted)' }}>Pending posts</h4>
        {pending.length === 0 ? (
          <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>No posts awaiting approval.</p>
        ) : (
          <div className="space-y-2">
            {pending.map(post => (
              <div key={post.id} className="p-3 rounded-xl" style={{ border: '1px solid var(--border)' }}>
                <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>{post.title}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy === post.id}
                    onClick={() => void act(post.id, () => approveCommunityThread(post.id))}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-60"
                    style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy === `rm-${post.id}`}
                    onClick={() => void act(`rm-${post.id}`, () => removeCommunityThread(post.id))}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-60"
                    style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h4 className="text-xs font-bold uppercase m-0 mb-2" style={{ color: 'var(--fg-muted)' }}>Open reports</h4>
        {reports.length === 0 ? (
          <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>No open reports.</p>
        ) : (
          <div className="space-y-2">
            {reports.map(report => (
              <div key={report.id} className="p-3 rounded-xl" style={{ border: '1px solid var(--border)' }}>
                <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>{report.reason}</p>
                <p className="text-xs m-0 mb-2" style={{ color: 'var(--fg-muted)' }}>
                  {report.targetType} · {report.reporter.displayName}
                </p>
                <button
                  type="button"
                  disabled={busy === report.id}
                  onClick={() => void act(report.id, () => resolveCommunityReport(communityId, report.id))}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-60"
                  style={{ background: 'var(--surface-subtle)', color: 'var(--fg)', border: '1px solid var(--border)' }}
                >
                  Resolve
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
