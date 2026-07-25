import { Link } from 'react-router-dom'
import { mediaUrl } from '../../api/client'
import { HOME_DEFAULT_IMAGES, type HomeImageCategory } from '../../data/homeDefaults'
import type { DiscoveryDeal } from './discoveryTypes'
import './deals.css'

type Props = {
  deal: DiscoveryDeal
  className?: string
}

function coverForDeal(deal: DiscoveryDeal): string {
  const raw = mediaUrl(deal.cover_image)
  if (raw) return raw
  const cat = (deal.categories?.[0] || deal.vertical || '').toLowerCase()
  const map: Record<string, HomeImageCategory> = {
    stays: 'stay',
    stay: 'stay',
    accommodation: 'stay',
    food: 'food',
    guides: 'guide',
    guide: 'guide',
    transport: 'transport',
    events: 'event',
    event: 'event',
    activities: 'journey',
    shop: 'delvers',
  }
  return HOME_DEFAULT_IMAGES[map[cat] || 'stay']
}

export function DiscoveryDealCard({ deal, className }: Props) {
  const cover = coverForDeal(deal)
  const place = [deal.business_city, deal.business_region].filter(Boolean).join(', ')
  const qualify =
    deal.may_qualify === true
      ? 'yes'
      : deal.may_qualify === false
        ? 'no'
        : deal.qualify_hint
          ? 'maybe'
          : null
  const who =
    deal.eligibility_display?.split('·')[0]?.trim() ||
    (deal.source === 'listing_sale' ? 'Everyone' : '')
  const isPackage = deal.offer_kind === 'package' || deal.badge_kind === 'package'
  const price = (deal.price_label || '').trim()
  const showTripPrice = Boolean(price) && (isPackage || deal.source === 'listing_sale')

  return (
    <Link to={deal.href || '/deals'} className={`discovery-deal${className ? ` ${className}` : ''}`}>
      <div className="discovery-deal__media" style={{ backgroundImage: `url(${cover})` }}>
        <span className={`deal-badge deal-badge--${deal.badge_kind || 'discount'}`}>{deal.badge}</span>
        {qualify === 'yes' ? <span className="discovery-deal__qualify">May qualify</span> : null}
      </div>
      <div className="discovery-deal__body">
        <strong className="discovery-deal__title">{deal.title}</strong>
        {deal.business_name ? <span className="discovery-deal__biz">{deal.business_name}</span> : null}
        {place ? <span className="discovery-deal__place">{place}</span> : null}
        {who ? <span className="discovery-deal__who">{who}</span> : null}
        {showTripPrice ? (
          <span className={`discovery-deal__price${isPackage ? ' discovery-deal__price--package' : ''}`}>
            {isPackage ? <span className="discovery-deal__price-label">Trip price </span> : null}
            {price}
          </span>
        ) : null}
      </div>
    </Link>
  )
}
