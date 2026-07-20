import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Building2, Clock, HeartHandshake, MapPin, ShieldCheck, Star, UserRound } from 'lucide-react'
import { MiniRating } from '../MiniRating'
import { MessageProviderLink } from '../messages'
import { ReportButton } from '../report/ReportButton'
import { SellerTrustBadges } from '../marketplace/SellerTrustBadges'
import './business-profile.css'

type Props = {
  name: string
  tagline?: string | null
  logo?: string | null
  cover?: string | null
  verified: boolean
  serviceLabel?: string | null
  location?: string | null
  ratingAvg?: string | null
  ratingCount?: number | null
  responseHours?: number | null
  listingsCount?: number
  ownerUsername: string
  ownerProfileHref: string
  businessId: number
  travelPartner?: boolean
}

export function BusinessProfileHero({
  name,
  tagline,
  logo,
  cover,
  verified,
  serviceLabel,
  location,
  ratingAvg,
  ratingCount,
  responseHours,
  listingsCount = 0,
  ownerUsername,
  ownerProfileHref,
  businessId,
  travelPartner = false,
}: Props) {
  const meta: { id: string; icon: LucideIcon; label: string; isRating?: boolean }[] = []

  if (ratingAvg) {
    meta.push({ id: 'rating', icon: Star, label: `${ratingAvg}`, isRating: true })
  }
  if (location) {
    meta.push({ id: 'location', icon: MapPin, label: location })
  }
  if (responseHours) {
    meta.push({ id: 'response', icon: Clock, label: `Replies in ~${responseHours}h` })
  }
  if (listingsCount > 0) {
    meta.push({
      id: 'listings',
      icon: Building2,
      label: `${listingsCount} listing${listingsCount === 1 ? '' : 's'}`,
    })
  }

  return (
    <>
      {cover ? <img src={cover} alt="" className="biz-profile__cover" /> : null}

      <section
        className={`biz-profile__hero${cover ? ' biz-profile__hero--cover' : ''}`}
        aria-label="Provider overview"
      >
        <div className="biz-profile__hero-main">
          <div className="biz-profile__logo-wrap">
            {logo ? (
              <img src={logo} alt="" className="biz-profile__logo" />
            ) : (
              <div className="biz-profile__logo biz-profile__logo--ph" aria-hidden>
                <Building2 size={28} strokeWidth={2} />
              </div>
            )}
          </div>

          <div className="biz-profile__hero-identity">
            <div className="biz-profile__badges">
              {verified ? (
                <span className="biz-profile__badge biz-profile__badge--verified">
                  <ShieldCheck size={12} strokeWidth={2.5} aria-hidden />
                  Verified
                </span>
              ) : null}
              {travelPartner ? (
                <span className="biz-profile__badge biz-profile__badge--partner">
                  <HeartHandshake size={12} strokeWidth={2.5} aria-hidden />
                  Travel partner
                </span>
              ) : null}
              {serviceLabel ? <span className="biz-profile__badge">{serviceLabel}</span> : null}
            </div>

            <SellerTrustBadges businessId={businessId} compact omitIds={['verified']} />

            <h1 className="biz-profile__name">{name}</h1>
            {tagline ? <p className="biz-profile__tagline">{tagline}</p> : null}

            {meta.length > 0 ? (
              <ul className="biz-profile__meta">
                {meta.map((item) => (
                  <li key={item.id}>
                    <item.icon size={14} strokeWidth={2.25} aria-hidden />
                    {item.isRating && ratingAvg ? (
                      <MiniRating rating={ratingAvg} count={ratingCount} />
                    ) : (
                      <span>{item.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="biz-profile__hero-actions">
          <MessageProviderLink
            username={ownerUsername}
            businessId={businessId}
            variant="primary"
            size="block"
          />
          <div className="biz-profile__hero-secondary">
            <Link to={ownerProfileHref} className="biz-profile__owner-link">
              <UserRound size={15} strokeWidth={2.25} aria-hidden />
              Owner profile
            </Link>
            <ReportButton
              className="biz-profile__report"
              triggerLabel="Report business"
              target={{
                target_type: 'business',
                target_id: String(businessId),
                target_label: name,
              }}
            />
          </div>
        </div>
      </section>
    </>
  )
}
