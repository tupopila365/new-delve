import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2, MapPin, Search, ShieldCheck, Star, X } from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import { BUSINESS_TYPE_LABELS, type BusinessType } from '../data/businessProfiles'
import type { PublicBusiness } from '../hooks/useBusinessAccess'
import { EmptyState, ListSkeleton } from '../components/ui'
import '../components/business/travel-partners.css'

const TOP_AREAS = ['Windhoek', 'Swakopmund', 'Walvis Bay', 'Ongwediva', 'Lüderitz'] as const

const SERVICE_FILTERS: { id: string; label: string; types: string[] }[] = [
  { id: 'stays', label: 'Stays', types: ['accommodation'] },
  { id: 'food', label: 'Food', types: ['food_drink'] },
  { id: 'guides', label: 'Guides', types: ['guide'] },
  { id: 'transport', label: 'Transport', types: ['transport'] },
  { id: 'events', label: 'Events', types: ['event_organiser'] },
]

function serviceLabels(types: string[]): string {
  return types
    .filter((t) => t !== 'multi_provider')
    .map((t) => BUSINESS_TYPE_LABELS[t as BusinessType] ?? t)
    .slice(0, 3)
    .join(' · ')
}

function isTravelPartner(b: PublicBusiness): boolean {
  return (
    Boolean(b.showcase_as_partner) ||
    Boolean(b.how_we_help?.trim()) ||
    Boolean(b.community_impact?.trim()) ||
    (b.travel_offers?.length ?? 0) > 0
  )
}

function ratingLabel(b: PublicBusiness): string | null {
  const avg = b.stats?.rating_avg
  const count = b.stats?.rating_count ?? 0
  const n = avg != null && avg !== '' ? Number(avg) : NaN
  if (!Number.isFinite(n) || n <= 0 || count <= 0) return null
  return n.toFixed(1)
}

export function TravelPartners() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const [service, setService] = useState('')

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['travel-partners'],
    queryFn: () => apiFetch<PublicBusiness[]>('/api/accounts/businesses/?partners=1', { auth: false }),
  })

  const partners = useMemo(() => {
    let rows = data.filter(isTravelPartner)
    if (city) {
      const c = city.toLowerCase()
      rows = rows.filter((b) => b.city?.toLowerCase() === c || b.region?.toLowerCase().includes(c))
    }
    if (service) {
      const types = SERVICE_FILTERS.find((f) => f.id === service)?.types ?? []
      rows = rows.filter((b) => b.business_types.some((t) => types.includes(t)))
    }
    if (search) {
      const needle = search.toLowerCase()
      rows = rows.filter((b) => {
        const hay = [
          b.business_name,
          b.tagline,
          b.city,
          b.region,
          b.how_we_help,
          ...(b.travel_offers ?? []).map((o) => `${o.title} ${o.price_label ?? ''}`),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(needle)
      })
    }
    return rows
  }, [data, city, service, search])

  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setCity('')
    setService('')
  }

  const hasFilters = Boolean(search || city || service)

  return (
    <div className="pt-market">
      <header className="pt-market__hero">
        <p className="pt-market__kicker">Travel partners</p>
        <h1 className="pt-market__title">Find organizations that open up travel</h1>
        <p className="pt-market__sub">
          Operators with resident rates, student packages, and clear services — so a trip feels attainable.
        </p>

        <div className="pt-market__find">
          <label className="pt-market__search">
            <Search size={18} strokeWidth={2.25} aria-hidden />
            <input
              type="search"
              placeholder="Search partners, places, or deals…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search travel partners"
            />
            {searchInput ? (
              <button
                type="button"
                className="pt-market__search-clear"
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
              >
                <X size={14} strokeWidth={2.5} aria-hidden />
              </button>
            ) : null}
          </label>

          <div className="pt-market__find-row">
            <select
              className="pt-market__select"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              aria-label="City"
            >
              <option value="">All cities</option>
              {TOP_AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>

            <select
              className="pt-market__select"
              value={service}
              onChange={(e) => setService(e.target.value)}
              aria-label="Service type"
            >
              <option value="">All services</option>
              {SERVICE_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="pt-market__chips" role="toolbar" aria-label="Service filters">
        <button
          type="button"
          className={`pt-market__chip${!service ? ' is-active' : ''}`}
          onClick={() => setService('')}
        >
          All
        </button>
        {SERVICE_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`pt-market__chip${service === f.id ? ' is-active' : ''}`}
            onClick={() => setService(service === f.id ? '' : f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!isLoading && !isError ? (
        <div className="pt-market__results-bar">
          <p className="pt-market__results-count">
            <strong>{partners.length}</strong>{' '}
            {partners.length === 1 ? 'partner' : 'partners'}
            {search ? ` for “${search}”` : ''}
          </p>
          {hasFilters ? (
            <button type="button" className="pt-market__clear" onClick={clearFilters}>
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}

      {isLoading ? <ListSkeleton count={4} variant="card" /> : null}

      {isError ? (
        <EmptyState
          iconElement={<Building2 size={28} strokeWidth={2} aria-hidden />}
          title="Couldn’t load partners"
          sub="Check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
        />
      ) : null}

      {!isLoading && !isError && partners.length === 0 ? (
        <EmptyState
          iconElement={<Building2 size={28} strokeWidth={2} aria-hidden />}
          title={hasFilters ? 'No matching partners' : 'No travel partners yet'}
          sub={
            hasFilters
              ? 'Try a different city, service, or search.'
              : 'Organizations appear here when they publish accessible offers and hub stories.'
          }
          cta={hasFilters ? { label: 'Clear filters', onClick: clearFilters } : undefined}
        />
      ) : null}

      {!isLoading && partners.length > 0 ? (
        <ul className="pt-market__grid">
          {partners.map((b) => {
            const cover = b.cover_image ? mediaUrl(b.cover_image) || b.cover_image : null
            const logo = b.logo ? mediaUrl(b.logo) || b.logo : null
            const location = [b.city, b.region].filter(Boolean).join(', ')
            const services = serviceLabels(b.business_types)
            const offerCount = b.travel_offers?.length ?? 0
            const topOffer = b.travel_offers?.[0]
            const rating = ratingLabel(b)
            const listings = b.stats?.listings_count ?? 0

            return (
              <li key={b.id}>
                <Link to={`/business/${b.id}`} className="pt-card">
                  <div className="pt-card__media">
                    {cover ? (
                      <img src={cover} alt="" className="pt-card__cover" loading="lazy" />
                    ) : (
                      <div className="pt-card__cover pt-card__cover--ph" aria-hidden>
                        <Building2 size={28} strokeWidth={1.75} />
                      </div>
                    )}
                    {logo ? <img src={logo} alt="" className="pt-card__logo" /> : null}
                    {b.verification_status === 'verified' ? (
                      <span className="pt-card__pill">
                        <ShieldCheck size={11} strokeWidth={2.5} aria-hidden />
                        Verified
                      </span>
                    ) : null}
                  </div>

                  <div className="pt-card__body">
                    <h2 className="pt-card__title">{b.business_name}</h2>
                    {b.tagline?.trim() ? <p className="pt-card__tagline">{b.tagline.trim()}</p> : null}

                    <div className="pt-card__meta">
                      {location ? (
                        <span>
                          <MapPin size={13} strokeWidth={2.25} aria-hidden />
                          {location}
                        </span>
                      ) : null}
                      {rating ? (
                        <span>
                          <Star size={13} strokeWidth={2.25} aria-hidden />
                          {rating}
                          {b.stats?.rating_count ? ` · ${b.stats.rating_count}` : ''}
                        </span>
                      ) : null}
                    </div>

                    {services ? <p className="pt-card__services">{services}</p> : null}

                    {topOffer ? (
                      <p className="pt-card__offer">
                        {topOffer.price_label ? `${topOffer.price_label} · ` : ''}
                        {topOffer.title}
                        {offerCount > 1 ? ` · +${offerCount - 1} more` : ''}
                      </p>
                    ) : null}

                    {listings > 0 ? (
                      <p className="pt-card__listings">
                        {listings} listing{listings === 1 ? '' : 's'}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
