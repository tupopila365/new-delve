import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Building2, Clock, MapPin, ShieldCheck, Star } from 'lucide-react'
import { MiniRating } from '../MiniRating'
import { MessageProviderLink } from '../messages'
import './business-profile.css'

type Props = {
  name: string
  tagline?: string | null
  logo?: string | null
  verified: boolean
  serviceLabel?: string | null
  location?: string | null
  ratingAvg?: string | null
  ratingCount?: number | null
  responseHours?: number | null
  listingsCount?: number
  ownerUsername: string
  ownerProfileHref: string
}

export function BusinessProfileHero({
  name,
  tagline,
  logo,
  verified,
  serviceLabel,
  location,
  ratingAvg,
  ratingCount,
  responseHours,
  listingsCount = 0,
  ownerUsername,
  ownerProfileHref,
}: Props) {
  const stats: { id: string; icon: LucideIcon; label: string }[] = []

  if (ratingAvg) {
    stats.push({ id: 'rating', icon: Star, label: `${ratingAvg}${ratingCount ? ` (${ratingCount})` : ''}` })
  }
  if (location) {
    stats.push({ id: 'location', icon: MapPin, label: location })
  }
  if (responseHours) {
    stats.push({ id: 'response', icon: Clock, label: `~${responseHours}h reply` })
  }
  if (listingsCount > 0) {
    stats.push({ id: 'listings', icon: Building2, label: `${listingsCount} listing${listingsCount === 1 ? '' : 's'}` })
  }

  return (
    <section className="biz-profile__hero" aria-label="Provider overview">
      <div className="biz-profile__hero-top">
        {logo ? (
          <img src={logo} alt="" className="biz-profile__logo" />
        ) : (
          <div className="biz-profile__logo biz-profile__logo--ph" aria-hidden>
            <Building2 size={24} strokeWidth={2} />
          </div>
        )}
        <div className="biz-profile__hero-copy">
          <div className="biz-profile__badges">
            {verified ? (
              <span className="biz-profile__badge biz-profile__badge--verified">
                <ShieldCheck size={12} strokeWidth={2.5} aria-hidden />
                Verified
              </span>
            ) : null}
            {serviceLabel ? <span className="biz-profile__badge">{serviceLabel}</span> : null}
          </div>
          <h1 className="biz-profile__name">{name}</h1>
          {tagline ? <p className="biz-profile__tagline">{tagline}</p> : null}
        </div>
      </div>

      {stats.length > 0 ? (
        <ul className="biz-profile__stats">
          {stats.map((stat) => (
            <li key={stat.id}>
              <stat.icon size={14} strokeWidth={2.25} aria-hidden />
              {stat.id === 'rating' && ratingAvg ? (
                <MiniRating rating={ratingAvg} count={ratingCount} />
              ) : (
                <span>{stat.label}</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="biz-profile__hero-actions">
        <MessageProviderLink username={ownerUsername} variant="primary" size="block" />
        <Link to={ownerProfileHref} className="btn btn-ghost btn-block biz-profile__owner-link">
          View owner profile
        </Link>
      </div>
    </section>
  )
}
