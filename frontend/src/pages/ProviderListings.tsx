import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useOutletContext } from 'react-router-dom'
import type { ProviderOutletContext } from '../components/ProviderLayout'
import { ProviderListingRow, ProviderPageHeader, ProviderQuickActions, ProviderStatGrid } from '../components/provider'
import { EmptyState } from '../components/ui'
import { getListingStats, getProviderListings, type ListingCategory } from '../data/providerData'

const TYPE_FILTERS = ['All', 'Stay', 'Guide', 'Transport', 'Food', 'Event'] as const
const STATUS_FILTERS = ['All statuses', 'Published', 'Draft', 'Needs update', 'Pending review', 'Suspended'] as const

export function ProviderListings() {
  const { activeBusiness } = useOutletContext<ProviderOutletContext>()
  const owner = activeBusiness?.owner_username

  const allListings = useMemo(() => getProviderListings(owner), [owner])
  const stats = getListingStats(allListings)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>('All')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All statuses')

  const listings = useMemo(() => {
    let rows = allListings
    if (typeFilter !== 'All') {
      rows = rows.filter((l) => l.category === (typeFilter as ListingCategory))
    }
    if (statusFilter !== 'All statuses') {
      const key = statusFilter.toLowerCase().replace(/\s+/g, '_')
      rows = rows.filter((l) => l.status === key)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q),
      )
    }
    return rows
  }, [allListings, typeFilter, statusFilter, search])

  return (
    <div className="prov-page">
      <ProviderPageHeader
        title="Listings"
        subtitle={`All listings for ${activeBusiness?.business_name ?? 'your business'} across stays, guides, transport, food, and events.`}
        action={
          <>
            <Link to="/provider/stays" className="btn btn-primary">
              Add listing
            </Link>
            {activeBusiness ? (
              <Link to={`/business/${activeBusiness.id}`} className="btn btn-ghost">
                Public profile
              </Link>
            ) : null}
          </>
        }
      />

      <ProviderStatGrid
        stats={[
          { value: stats.total, label: 'Total listings', accent: stats.total > 0 },
          { value: stats.published, label: 'Published' },
          { value: stats.needsUpdate, label: 'Needs update', accent: stats.needsUpdate > 0 },
          { value: stats.drafts, label: 'Drafts' },
        ]}
      />

      <div className="prov-toolbar" role="search">
        <input
          type="search"
          className="prov-toolbar__search"
          placeholder="Search listings…"
          aria-label="Search listings"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="prov-toolbar__chips prov-toolbar__chips--scroll" role="group" aria-label="Filter by type">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`prov-chip${typeFilter === f ? ' prov-chip--active' : ''}`}
              onClick={() => setTypeFilter(f)}
            >
              {f === 'Food' ? 'Food & drink' : f}
            </button>
          ))}
        </div>
        <div className="prov-toolbar__chips prov-toolbar__chips--scroll" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              className={`prov-chip prov-chip--sub${statusFilter === s ? ' prov-chip--active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {allListings.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No listings yet"
          sub="Create your first stay, food venue, guide experience, transport listing, or event."
          cta={{ label: 'Add listing', to: '/provider/stays' }}
        />
      ) : listings.length === 0 ? (
        <EmptyState
          compact
          icon="🔍"
          title="No listings match your filters"
          sub="Try a different category, status, or search term."
        />
      ) : (
        <div className="prov-listing-list">
          {listings.map((l) => (
            <ProviderListingRow key={l.id} listing={l} />
          ))}
        </div>
      )}

      <section className="prov-overview-card">
        <h2>Category modules</h2>
        <ProviderQuickActions
          actions={[
            { label: 'Stays', to: '/provider/stays', emoji: '🏨' },
            { label: 'Guides', to: '/provider/guides', emoji: '🧭' },
            { label: 'Transport', to: '/provider/transport', emoji: '🚗' },
            { label: 'Food & drink', to: '/provider/food', emoji: '🍽' },
            { label: 'Create event', to: '/events/new', emoji: '🎟' },
          ]}
        />
      </section>
    </div>
  )
}
