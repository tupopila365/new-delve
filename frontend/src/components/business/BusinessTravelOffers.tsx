import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { mediaUrl } from '../../api/client'
import { DealClaimSheet, travelOfferToListingDeal, type ListingDeal } from '../deals'
import { offerCoverSrc, offerEligibilityIcon, offerKindIcon, type TravelOffer } from './travelOffers'

type Props = {
  offers: TravelOffer[]
  businessName: string
  businessId: number
}

export function BusinessTravelOffers({ offers, businessName, businessId }: Props) {
  const [active, setActive] = useState<ListingDeal | null>(null)
  if (!offers.length) return null

  return (
    <div className="biz-profile__offers">
      <p className="biz-profile__offers-intro">
        Open rates from {businessName} — resident, student, and packages that make a trip feel
        possible. Tap how to unlock, or open the full offer.
      </p>
      <ul className="biz-profile__offer-list">
        {offers.map((offer) => {
          const KindIcon = offerKindIcon(offer.offer_kind)
          const WhoIcon = offerEligibilityIcon(offer.eligibility)
          const who = offer.eligibility_display || offer.eligibility_label || offer.eligibility
          const cover = offerCoverSrc(offer)
          const coverSrc = cover ? mediaUrl(cover) || cover : null
          const deal = travelOfferToListingDeal(offer, businessId)
          return (
            <li key={offer.id}>
              <div className="biz-profile__offer">
                <Link
                  to={`/business/${businessId}/offers/${offer.id}`}
                  className="biz-profile__offer-top biz-profile__offer-top--link"
                >
                  {coverSrc ? (
                    <span className="biz-profile__offer-thumb">
                      <img src={coverSrc} alt="" loading="lazy" />
                    </span>
                  ) : (
                    <span className="biz-profile__offer-icon" aria-hidden>
                      <KindIcon size={16} strokeWidth={2.25} />
                    </span>
                  )}
                  <div className="biz-profile__offer-copy">
                    <strong className="biz-profile__offer-title">{offer.title}</strong>
                    {offer.summary?.trim() ? <p>{offer.summary.trim()}</p> : null}
                  </div>
                  {offer.price_label?.trim() ? (
                    <span className="biz-profile__offer-price">{offer.price_label.trim()}</span>
                  ) : null}
                </Link>
                <div className="biz-profile__offer-meta">
                  <span>
                    <WhoIcon size={12} strokeWidth={2.25} aria-hidden />
                    {who}
                  </span>
                  {(offer.categories?.length ?? 0) > 0 ? (
                    <span>{offer.categories!.join(' · ')}</span>
                  ) : null}
                  <button
                    type="button"
                    className="biz-profile__offer-claim"
                    onClick={() => setActive(deal)}
                  >
                    How to unlock
                  </button>
                  <Link to={`/business/${businessId}/offers/${offer.id}`} className="biz-profile__offer-more">
                    Details
                    <ChevronRight size={12} strokeWidth={2.5} aria-hidden />
                  </Link>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      <DealClaimSheet deal={active} onClose={() => setActive(null)} />
    </div>
  )
}
