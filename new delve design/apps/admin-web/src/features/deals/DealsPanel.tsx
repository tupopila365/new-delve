import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { DealAnalyticsSummary, DealDto, DealReportDto } from '@delve/contracts'
import { adminFetch } from '../../api/adminClient'

export default function DealsPanel() {
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
                {d.status} · <Link to={`/businesses/${d.business.id}`}>{d.business.name}</Link> · {d.discountSummary}
                {d.listing ? <> · Listing: <Link to={`/listings/${d.listing.id}`}>{d.listing.title}</Link></> : ''}
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
