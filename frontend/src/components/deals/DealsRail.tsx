import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Percent } from 'lucide-react'
import { apiFetch } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { ListSkeleton } from '../ui'
import { DiscoveryDealCard } from './DiscoveryDealCard'
import {
  buildDealsDiscoveryPath,
  type DealsDiscoveryResponse,
} from './discoveryTypes'
import { dealsSeeAllPath, profileCanPersonalizeDeals } from './personalizeDeals'
import './deals.css'

type Props = {
  region?: string
  limit?: number
  seeAllTo?: string
  className?: string
  /** Override rail title (Explore / Home). */
  title?: string
  sub?: string
}

/** Horizontal deals rail for Home / Explore. */
export function DealsRail({
  region,
  limit = 10,
  seeAllTo,
  className,
  title = 'Open rates',
  sub = 'Rates for people who live here — and people starting out. Tap for who it’s for and how to unlock.',
}: Props) {
  const { profile } = useAuth()
  const personalize = profileCanPersonalizeDeals(profile)

  const { data, isLoading } = useQuery({
    queryKey: ['deals-rail', region, limit, profile?.username, personalize],
    queryFn: async () => {
      if (personalize) {
        const personal = await apiFetch<DealsDiscoveryResponse>(
          buildDealsDiscoveryPath({ region, limit, may_qualify: true }),
          { auth: true },
        )
        if (personal.results.length > 0) {
          return { ...personal, usedPersonal: true as const }
        }
      }
      const all = await apiFetch<DealsDiscoveryResponse>(
        buildDealsDiscoveryPath({ region, limit }),
        { auth: Boolean(profile) },
      )
      return { ...all, usedPersonal: false as const }
    },
  })

  const deals = data?.results ?? []
  const usedPersonal = Boolean(data && 'usedPersonal' in data && data.usedPersonal)
  const allHref = seeAllTo || dealsSeeAllPath(usedPersonal)

  if (!isLoading && deals.length === 0) return null

  return (
    <section className={`deals-rail${className ? ` ${className}` : ''}`} aria-labelledby="deals-rail-title">
      <div className="deals-rail__head">
        <div>
          <h2 id="deals-rail-title" className="deals-rail__title">
            <Percent size={18} strokeWidth={2.25} aria-hidden /> {title}
          </h2>
          <p className="deals-rail__sub">
            {usedPersonal
              ? 'Showing rates that may fit your profile. Open any card for how to unlock.'
              : sub}
          </p>
        </div>
        <Link to={allHref} className="deals-rail__all">
          See all
        </Link>
      </div>
      {isLoading ? (
        <ListSkeleton count={3} />
      ) : (
        <div className="deals-rail__scroll h-scroll">
          {deals.map((deal) => (
            <DiscoveryDealCard key={String(deal.id)} deal={deal} className="deals-rail__card" />
          ))}
        </div>
      )}
    </section>
  )
}
