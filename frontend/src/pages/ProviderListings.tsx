import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useOutletContext } from 'react-router-dom'
import type { ProviderOutletContext } from '../components/ProviderLayout'
import { ProviderListingRow } from '../components/provider'
import {
  ProviderUiChips,
  ProviderUiEmpty,
  ProviderUiHeader,
  ProviderUiPage,
  ProviderUiStats,
} from '../components/provider/ui'
import { getListingStats, getProviderListings, type ListingCategory } from '../data/providerData'
import { categoryModuleLinks, listingTypeChips, listingsPageSubtitle } from '../utils/providerCategories'

const STATUS_FILTERS = [
  { id: 'All statuses', label: 'All statuses' },
  { id: 'Published', label: 'Published' },
  { id: 'Draft', label: 'Draft' },
  { id: 'Needs update', label: 'Needs update' },
  { id: 'Pending review', label: 'Pending review' },
  { id: 'Suspended', label: 'Suspended' },
]

export function ProviderListings() {
  const { activeBusiness } = useOutletContext<ProviderOutletContext>()
  const owner = activeBusiness?.owner_username
  const businessTypes = activeBusiness?.business_types ?? []
  const typeChips = useMemo(() => listingTypeChips(businessTypes), [businessTypes])
  const moduleLinks = useMemo(() => categoryModuleLinks(businessTypes), [businessTypes])
  const addListingTo = moduleLinks[0]?.to ?? '/provider/stays'

  const allListings = useMemo(() => getProviderListings(owner), [owner])
  const stats = getListingStats(allListings)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All statuses')

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
    <ProviderUiPage>
      <ProviderUiHeader
        title="Listings"
        subtitle={listingsPageSubtitle(activeBusiness?.business_name ?? 'your business', businessTypes)}
        actions={
          <>
            <Link to={addListingTo} className="prov-ui__btn prov-ui__btn--primary">
              Add listing
            </Link>
            {activeBusiness ? (
              <Link to={`/business/${activeBusiness.id}`} className="prov-ui__btn prov-ui__btn--ghost">
                Public profile
              </Link>
            ) : null}
          </>
        }
      />

      <ProviderUiStats
        columns={4}
        stats={[
          { value: stats.total, label: 'Total listings', accent: stats.total > 0 },
          { value: stats.published, label: 'Published' },
          { value: stats.needsUpdate, label: 'Needs update', accent: stats.needsUpdate > 0 },
          { value: stats.drafts, label: 'Drafts' },
        ]}
      />

      <input
        type="search"
        className="prov-ui__search"
        placeholder="Search listings…"
        aria-label="Search listings"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {typeChips.length > 1 ? (
        <ProviderUiChips chips={typeChips} active={typeFilter} onChange={setTypeFilter} ariaLabel="Filter by type" />
      ) : null}

      <ProviderUiChips
        chips={STATUS_FILTERS}
        active={statusFilter}
        onChange={setStatusFilter}
        ariaLabel="Filter by status"
      />

      {allListings.length === 0 ? (
        <ProviderUiEmpty
          title="No listings yet"
          message="Create your first listing so travellers can discover and book you."
          action={{ label: 'Add listing', to: addListingTo }}
        />
      ) : listings.length === 0 ? (
        <ProviderUiEmpty title="No listings match your filters" message="Try a different category, status, or search term." />
      ) : (
        <div className="prov-ui__list">
          {listings.map((l) => (
            <ProviderListingRow key={l.id} listing={l} />
          ))}
        </div>
      )}

      {moduleLinks.length > 0 ? (
        <section>
          <h2 className="prov-ui__section-title">Your categories</h2>
          <div className="prov-ui__shortcuts">
            {moduleLinks.map((m) => (
              <Link key={m.to} to={m.to} className="prov-ui__shortcut">
                <span aria-hidden>{m.emoji}</span>
                <span>{m.label}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </ProviderUiPage>
  )
}
