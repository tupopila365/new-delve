import { useEffect, useState } from 'react'
import type {
  FinancialRecoveryCaseDto,
  ReconciliationIssueDto,
  ReconciliationIssueListItem,
  ReconciliationSummaryDto,
  UnmatchedStripeEventDto,
} from '@delve/contracts'
import { adminFetch } from '../../api/adminClient'

export default function ReconciliationPanel() {
  const [summary, setSummary] = useState<ReconciliationSummaryDto | null>(null)
  const [issues, setIssues] = useState<ReconciliationIssueListItem[]>([])
  const [selected, setSelected] = useState<ReconciliationIssueDto | null>(null)
  const [unmatched, setUnmatched] = useState<UnmatchedStripeEventDto[]>([])
  const [recovery, setRecovery] = useState<FinancialRecoveryCaseDto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [severity, setSeverity] = useState('all')

  async function load() {
    const [sumRes, issueRes, unmatchedRes, recoveryRes] = await Promise.all([
      adminFetch('/admin/reconciliation/summary'),
      adminFetch(`/admin/reconciliation/issues?status=OPEN${severity !== 'all' ? `&severity=${encodeURIComponent(severity)}` : ''}`),
      adminFetch('/admin/reconciliation/unmatched?status=OPEN'),
      adminFetch('/admin/reconciliation/recovery-cases?status=OPEN'),
    ])
    const sumBody = (await sumRes.json()) as { success: boolean; data?: ReconciliationSummaryDto }
    const issueBody = (await issueRes.json()) as { success: boolean; data?: ReconciliationIssueListItem[] }
    const unmatchedBody = (await unmatchedRes.json()) as { success: boolean; data?: UnmatchedStripeEventDto[] }
    const recoveryBody = (await recoveryRes.json()) as { success: boolean; data?: FinancialRecoveryCaseDto[] }
    if (!sumRes.ok || !sumBody.success) throw new Error('Could not load reconciliation summary')
    setSummary(sumBody.data || null)
    setIssues(issueBody.data || [])
    setUnmatched(unmatchedBody.data || [])
    setRecovery(recoveryBody.data || [])
  }

  useEffect(() => {
    let cancelled = false
    void load().catch(err => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load reconciliation')
    })
    return () => {
      cancelled = true
    }
  }, [severity])

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold m-0 mb-1">Payments → Reconciliation</h2>
      <p className="text-xs m-0 mb-3" style={{ color: 'var(--muted)' }}>
        Compares Delve records with Stripe. Does not create payments, transfers, refunds, or reversals. Stripe fees
        are shown only when Stripe reports them.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {[
          { label: 'Open issues', value: summary?.openIssues ?? '—' },
          { label: 'Critical', value: summary?.criticalIssues ?? '—' },
          { label: 'Unmatched events', value: summary?.unmatchedEvents ?? '—' },
          { label: 'Recovery cases', value: summary?.openRecoveryCases ?? '—' },
        ].map(card => (
          <div key={card.label} className="rounded-xl p-3" style={{ border: '1px solid var(--border)' }}>
            <p className="text-xs m-0" style={{ color: 'var(--muted)' }}>{card.label}</p>
            <p className="text-lg font-bold m-0">{card.value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs m-0 mb-3" style={{ color: 'var(--muted)' }}>
        Last run: {summary?.lastRun ? `${summary.lastRun.status} · ${summary.lastRun.createdAt}` : 'none'}
      </p>
      <button
        type="button"
        className="admin-btn mb-3"
        disabled={busy}
        onClick={() => {
          setBusy(true)
          void adminFetch('/admin/reconciliation/run', { method: 'POST', body: JSON.stringify({ scope: 'STALE' }) })
            .then(async res => {
              if (!res.ok) throw new Error('Reconciliation run failed')
              await load()
            })
            .catch(err => setError(err instanceof Error ? err.message : 'Run failed'))
            .finally(() => setBusy(false))
        }}
      >
        {busy ? 'Running…' : 'Run reconciliation'}
      </button>
      {error ? <p className="text-sm m-0 mb-2" style={{ color: '#ffb4b4' }}>{error}</p> : null}
      <div className="flex gap-2 mb-2">
        {['all', 'CRITICAL', 'WARNING', 'INFO'].map(id => (
          <button key={id} type="button" className="admin-btn-secondary" onClick={() => setSeverity(id)} style={{ opacity: severity === id ? 1 : 0.7 }}>
            {id}
          </button>
        ))}
      </div>
      <ul className="list-none m-0 p-0 space-y-2">
        {issues.map(row => (
          <li key={row.id} className="rounded-xl p-3" style={{ border: '1px solid var(--border)' }}>
            <p className="text-xs font-mono m-0">{row.bookingReference || row.bookingId || '—'}</p>
            <p className="text-sm m-0">{row.severity} · {row.type} · {row.code}</p>
            <p className="text-xs m-0">{row.summary}</p>
            <button
              type="button"
              className="admin-btn-secondary mt-2"
              onClick={() => {
                void adminFetch(`/admin/reconciliation/issues/${encodeURIComponent(row.id)}`)
                  .then(async res => {
                    const body = (await res.json()) as { success: boolean; data?: ReconciliationIssueDto }
                    if (body.data) setSelected(body.data)
                  })
                  .catch(err => setError(err instanceof Error ? err.message : 'Load failed'))
              }}
            >
              Review
            </button>
          </li>
        ))}
      </ul>
      {selected ? (
        <div className="rounded-xl p-4 mt-3" style={{ border: '1px solid var(--border)' }}>
          <p className="text-sm font-bold m-0">{selected.code}</p>
          <p className="text-xs m-0">Delve: {selected.localState || '—'}</p>
          <p className="text-xs m-0">Stripe: {selected.stripeState || '—'}</p>
          <p className="text-xs m-0 mt-2">{selected.recommendedAction}</p>
          <p className="text-xs m-0 mt-2" style={{ color: 'var(--muted)' }}>
            Domain-specific remediation only. There is no generic sync button.
          </p>
        </div>
      ) : null}
      <h3 className="text-sm font-bold m-0 mt-5 mb-2">Unmatched Stripe events</h3>
      <ul className="list-none m-0 p-0 space-y-2">
        {unmatched.map(row => (
          <li key={row.id} className="rounded-xl p-3" style={{ border: '1px solid var(--border)' }}>
            <p className="text-xs font-mono m-0">{row.providerEventId}</p>
            <p className="text-xs m-0">{row.eventType} · {row.stripeObjectId || '—'}</p>
            <p className="text-xs m-0">{row.note}</p>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => {
                  void adminFetch(`/admin/reconciliation/unmatched/${encodeURIComponent(row.id)}/retry-match`, {
                    method: 'POST',
                    body: '{}',
                  }).then(() => load())
                }}
              >
                Retry match
              </button>
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => {
                  void adminFetch(`/admin/reconciliation/unmatched/${encodeURIComponent(row.id)}/mark-reviewed`, {
                    method: 'POST',
                    body: '{}',
                  }).then(() => load())
                }}
              >
                Mark reviewed
              </button>
            </div>
          </li>
        ))}
      </ul>
      <h3 className="text-sm font-bold m-0 mt-5 mb-2">Manual recovery cases</h3>
      <p className="text-xs m-0 mb-2" style={{ color: 'var(--muted)' }}>
        These track unresolved platform exposure. They are not a legal debt claim and do not debit a business bank
        account.
      </p>
      <ul className="list-none m-0 p-0 space-y-2">
        {recovery.map(row => (
          <li key={row.id} className="rounded-xl p-3" style={{ border: '1px solid var(--border)' }}>
            <p className="text-xs font-mono m-0">{row.bookingReference || row.bookingId || '—'}</p>
            <p className="text-sm m-0">{row.type} · {row.currency} {row.amount}</p>
            <p className="text-xs m-0">{row.reason}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
