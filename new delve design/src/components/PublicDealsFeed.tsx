import { useEffect, useState } from 'react'
import { Tag } from 'lucide-react'
import type { DealDto } from '@delve/contracts'
import { fetchPublicDeals } from '../api/dealClient'

function formatRange(startIso: string, endIso: string) {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${new Date(startIso).toLocaleDateString(undefined, opts)} – ${new Date(endIso).toLocaleDateString(undefined, opts)}`
}

/** Minimal traveler-facing active deals strip (no checkout). */
export default function PublicDealsFeed({
  onOpenBusiness,
}: {
  onOpenBusiness?: (slug: string) => void
}) {
  const [deals, setDeals] = useState<DealDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const rows = await fetchPublicDeals(12)
        if (!cancelled) {
          setDeals(rows)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load deals')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="px-3 sm:px-0 mb-5">
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Loading live deals…
        </p>
      </div>
    )
  }

  if (error || deals.length === 0) {
    return null
  }

  return (
    <section className="px-3 sm:px-0 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Tag size={16} style={{ color: 'var(--primary)' }} />
        <h2 className="font-display text-lg font-bold m-0" style={{ color: 'var(--fg)' }}>
          Live deals
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {deals.map(deal => (
          <article
            key={deal.id}
            className="rounded-2xl px-4 py-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs font-semibold m-0 mb-1" style={{ color: 'var(--primary)' }}>
              {deal.discountSummary}
            </p>
            <h3 className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--fg)' }}>
              {deal.title}
            </h3>
            <p className="text-xs m-0 mt-1 truncate" style={{ color: 'var(--fg-muted)' }}>
              {onOpenBusiness ? (
                <button
                  type="button"
                  onClick={() => onOpenBusiness(deal.business.slug)}
                  className="font-semibold p-0 m-0"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                  }}
                >
                  {deal.business.name}
                </button>
              ) : (
                deal.business.name
              )}
              {deal.listing ? ` · ${deal.listing.title}` : ''}
            </p>
            <p className="text-xs m-0 mt-2" style={{ color: 'var(--fg-muted)' }}>
              Valid {formatRange(deal.startDate, deal.endDate)}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
