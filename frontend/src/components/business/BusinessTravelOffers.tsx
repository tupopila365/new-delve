import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { mediaUrl } from '../../api/client'
import { offerCoverSrc, offerEligibilityIcon, offerKindIcon, type TravelOffer } from './travelOffers'

type Props = {
  offers: TravelOffer[]
  businessName: string
  businessId: number
}

export function BusinessTravelOffers({ offers, businessName, businessId }: Props) {
  if (!offers.length) return null

  return (
    <div className="biz-profile__offers">
      <p className="biz-profile__offers-intro">
        Ways {businessName} makes travel more attainable — tap an offer for photos, eligibility, and
        how to sign up.
      </p>
      <ul className="biz-profile__offer-list">
        {offers.map((offer) => {
          const KindIcon = offerKindIcon(offer.offer_kind)
          const WhoIcon = offerEligibilityIcon(offer.eligibility)
          const who = offer.eligibility_display || offer.eligibility_label || offer.eligibility
          const cover = offerCoverSrc(offer)
          const coverSrc = cover ? mediaUrl(cover) || cover : null
          return (
            <li key={offer.id}>
              <Link
                to={`/business/${businessId}/offers/${offer.id}`}
                className="biz-profile__offer biz-profile__offer--link"
              >
                <div className="biz-profile__offer-top">
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
                </div>
                <div className="biz-profile__offer-meta">
                  <span>
                    <WhoIcon size={12} strokeWidth={2.25} aria-hidden />
                    {who}
                  </span>
                  {(offer.categories?.length ?? 0) > 0 ? (
                    <span>{offer.categories!.join(' · ')}</span>
                  ) : null}
                  <span className="biz-profile__offer-more">
                    Details
                    <ChevronRight size={12} strokeWidth={2.5} aria-hidden />
                  </span>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
