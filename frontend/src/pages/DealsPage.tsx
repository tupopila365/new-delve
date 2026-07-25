import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Percent, Search, Wallet, X } from 'lucide-react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useExploreDestination } from '../hooks/useExploreDestination'
import { DiscoveryDealCard } from '../components/deals/DiscoveryDealCard'
import { RatesKnowHowStrip } from '../components/deals/RatesKnowHowStrip'
import {
  buildDealsDiscoveryPath,
  type DealsDiscoveryResponse,
} from '../components/deals/discoveryTypes'
import {
  profileCanPersonalizeDeals,
  resolveMayQualifyParam,
} from '../components/deals/personalizeDeals'
import { EmptyState, ListSkeleton } from '../components/ui'
import '../components/deals/deals.css'

const CATEGORY_FILTERS = [
  { id: '', label: 'All' },
  { id: 'stays', label: 'Stays' },
  { id: 'food', label: 'Food' },
  { id: 'guides', label: 'Guides' },
  { id: 'transport', label: 'Transport' },
  { id: 'events', label: 'Events' },
  { id: 'shop', label: 'Shop' },
  { id: 'activities', label: 'Activities' },
] as const

const ELIGIBILITY_FILTERS = [
  { id: '', label: 'Anyone' },
  { id: 'everyone', label: 'Everyone' },
  { id: 'sadc', label: 'SADC residents' },
  { id: 'student', label: 'Students' },
  { id: 'local', label: 'Locals' },
  { id: 'custom', label: 'Custom' },
] as const

const KIND_FILTERS = [
  { id: '', label: 'All kinds' },
  { id: 'sale', label: 'Sale' },
  { id: 'discount', label: 'Discount' },
  { id: 'eligibility', label: 'Resident rate' },
  { id: 'package', label: 'Package' },
] as const

export function DealsPage() {
  const { profile } = useAuth()
  const { region: exploreRegion, exploring } = useExploreDestination()
  const [params, setParams] = useSearchParams()
  const [qInput, setQInput] = useState(params.get('q') || '')

  const category = params.get('category') || ''
  const eligibility = params.get('eligibility') || ''
  const kind = params.get('kind') || ''
  const q = params.get('q') || ''
  const canPersonalize = profileCanPersonalizeDeals(profile)
  const mayOnly = resolveMayQualifyParam(params.get('may_qualify'), canPersonalize)
  const region = exploring ? exploreRegion || '' : params.get('region') || ''

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = new URLSearchParams(params)
      if (qInput.trim()) next.set('q', qInput.trim())
      else next.delete('q')
      if (next.toString() !== params.toString()) setParams(next, { replace: true })
    }, 300)
    return () => window.clearTimeout(t)
  }, [qInput, params, setParams])

  function patchParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  function toggleMayQualify() {
    patchParam('may_qualify', mayOnly ? '0' : '1')
  }

  const path = useMemo(
    () =>
      buildDealsDiscoveryPath({
        q,
        category: category || undefined,
        eligibility: eligibility || undefined,
        kind: kind || undefined,
        region: region || undefined,
        may_qualify: mayOnly,
        limit: 40,
      }),
    [q, category, eligibility, kind, region, mayOnly],
  )

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['deals-discovery', path, profile?.username],
    queryFn: () => apiFetch<DealsDiscoveryResponse>(path, { auth: Boolean(profile) }),
  })

  const deals = data?.results ?? []
  const needsProfileHint = Boolean(profile) && !canPersonalize
  const personalEmpty = !isLoading && !isError && deals.length === 0 && mayOnly

  return (
    <div className="page deals-page">
      <header className="deals-page__head">
        <p className="deals-page__eyebrow">
          <Percent size={14} strokeWidth={2.25} aria-hidden /> Open rates
        </p>
        <h1 className="deals-page__title">Rates for people like you</h1>
        <p className="deals-page__lead">
          Resident, student, and local rates — plus open sales. Travel should feel attainable, not
          exclusive. Open a deal for who it’s for and how to unlock it.
        </p>
        <div className="deals-page__search">
          <Search size={18} strokeWidth={2.25} aria-hidden />
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Search deals, businesses, cities…"
            aria-label="Search deals"
          />
          {qInput ? (
            <button type="button" className="deals-page__clear" onClick={() => setQInput('')} aria-label="Clear">
              <X size={16} />
            </button>
          ) : null}
        </div>
      </header>

      <div className="deals-page__trip-links">
        <Link to="/journeys?mode=budget" className="deals-page__trip-link">
          <Wallet size={14} strokeWidth={2.25} aria-hidden />
          Affordable trips
        </Link>
        <Link to="/journeys?mode=weekend" className="deals-page__trip-link">
          Weekend under budget
        </Link>
      </div>

      <RatesKnowHowStrip className="deals-page-knowhow" />

      {needsProfileHint ? (
        <p className="deals-page__hint" role="status">
          Add your country or birth year in{' '}
          <Link to="/settings">Settings</Link> to highlight rates that may fit you.
        </p>
      ) : null}

      <div className="deals-page__filters" role="toolbar" aria-label="Deal filters">
        <div className="deals-page__chips">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.id || 'all-cat'}
              type="button"
              className={`deals-page__chip${category === f.id ? ' is-on' : ''}`}
              onClick={() => patchParam('category', f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="deals-page__chips">
          {ELIGIBILITY_FILTERS.map((f) => (
            <button
              key={f.id || 'all-elig'}
              type="button"
              className={`deals-page__chip${eligibility === f.id ? ' is-on' : ''}`}
              onClick={() => patchParam('eligibility', f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="deals-page__chips">
          {KIND_FILTERS.map((f) => (
            <button
              key={f.id || 'all-kind'}
              type="button"
              className={`deals-page__chip${kind === f.id ? ' is-on' : ''}`}
              onClick={() => patchParam('kind', f.id)}
            >
              {f.label}
            </button>
          ))}
          {profile ? (
            <button
              type="button"
              className={`deals-page__chip${mayOnly ? ' is-on' : ''}`}
              onClick={toggleMayQualify}
            >
              I may qualify
            </button>
          ) : null}
        </div>
      </div>

      {isLoading ? <ListSkeleton count={6} /> : null}
      {isError ? (
        <EmptyState
          title="Couldn’t load rates"
          description="Check your connection and try again."
          action={
            <button type="button" className="btn btn-primary" onClick={() => void refetch()}>
              Retry
            </button>
          }
        />
      ) : null}
      {!isLoading && !isError && deals.length === 0 ? (
        <EmptyState
          title={personalEmpty ? 'No matches for your profile yet' : 'No rates match'}
          description={
            personalEmpty
              ? needsProfileHint
                ? 'Add your country or birth year in Settings, or browse every open rate.'
                : 'Try turning off “I may qualify”, or see what travel partners offer.'
              : 'Try another filter, or browse partners for more open rates.'
          }
          action={
            <div className="deals-page__empty-actions">
              {personalEmpty ? (
                <button type="button" className="btn btn-primary" onClick={() => patchParam('may_qualify', '0')}>
                  Show all rates
                </button>
              ) : null}
              {needsProfileHint ? (
                <Link to="/settings" className={personalEmpty ? 'btn btn-secondary' : 'btn btn-primary'}>
                  Update profile
                </Link>
              ) : (
                <Link to="/partners" className={personalEmpty ? 'btn btn-secondary' : 'btn btn-primary'}>
                  Travel partners
                </Link>
              )}
            </div>
          }
        />
      ) : null}

      {!isLoading && deals.length > 0 ? (
        <div className="deals-page__grid">
          {deals.map((deal) => (
            <DiscoveryDealCard key={String(deal.id)} deal={deal} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
