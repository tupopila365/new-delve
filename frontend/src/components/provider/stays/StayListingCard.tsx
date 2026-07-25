import { Link } from 'react-router-dom'
import { Hotel, Sparkles } from 'lucide-react'
import { mediaUrl } from '../../../api/client'
import { propertyTypeLabel } from '../../../utils/accommodationListing'
import { isVideoUrl } from '../../listing/photos/listingGalleryMedia'
import type { ProviderStayListing } from './stayListingTypes'
import { listingCompleteness } from './stayListingTypes'
import { useDisplayMoney } from '../../../hooks/useDisplayMoney'

export type StayBoostStatus = {
  label: string
  tone: 'live' | 'pending' | 'scheduled'
}

type Props = {
  stay: ProviderStayListing
  canEdit?: boolean
  onEdit: () => void
  onManageHighlights?: () => void
  boost?: StayBoostStatus | null
}

export function StayListingCard({ stay, canEdit, onEdit, onManageHighlights, boost }: Props) {
  const { format } = useDisplayMoney()
  const { percent, missing } = listingCompleteness(stay)
  const cover = stay.cover_image ? mediaUrl(stay.cover_image) || stay.cover_image : null
  const coverIsVideo = Boolean(stay.cover_image && isVideoUrl(stay.cover_image))
  const roomCount = Array.isArray(stay.room_types) ? stay.room_types.length : 0
  const photoCount = (stay.media_gallery?.length ?? 0) + (stay.cover_image ? 1 : 0)
  const highlightCount = stay.listing_stories?.length ?? 0
  const boostHref = `/provider/promotions?listing=accommodation:${stay.id}&placement=homepage_stays`

  return (
    <article className="prov-ui__card stay-card">
      <div className="stay-card__thumb">
        {cover ? (
          coverIsVideo ? (
            <video src={`${cover}#t=0.1`} muted playsInline preload="metadata" aria-hidden />
          ) : (
            <img src={cover} alt="" />
          )
        ) : (
          <span className="stay-card__thumb-fallback" aria-hidden>
            <Hotel size={22} strokeWidth={2} />
          </span>
        )}
        {!stay.is_active ? <span className="stay-card__badge stay-card__badge--hidden">Hidden</span> : null}
        {percent < 100 ? <span className="stay-card__badge stay-card__badge--draft">{percent}% complete</span> : null}
        {boost ? (
          <span className={`stay-card__badge stay-card__badge--boost stay-card__badge--boost-${boost.tone}`}>
            {boost.label}
          </span>
        ) : null}
      </div>

      <div className="stay-card__body">
        <div className="stay-card__head">
          <h3 className="stay-card__title">{stay.title}</h3>
          <span className={`stay-card__status${stay.is_active ? ' stay-card__status--live' : ''}`}>
            {stay.is_active ? 'Live' : 'Draft'}
          </span>
        </div>

        <p className="stay-card__type">{propertyTypeLabel(stay.property_type)}</p>
        <p className="stay-card__meta">
          {stay.city}, {stay.region} · {format(stay.price_per_night, { suffix: '/night' })} · {stay.max_guests} guests ·{' '}
          {stay.bedrooms} bed{stay.bedrooms === 1 ? '' : 's'}
          {roomCount > 0 ? ` · ${roomCount} room type${roomCount === 1 ? '' : 's'}` : ''}
          {photoCount > 0 ? ` · ${photoCount} photo${photoCount === 1 ? '' : 's'}` : ''}
        </p>

        <p className="stay-card__rating">
          {stay.rating_avg} rating · {stay.rating_count} review{stay.rating_count === 1 ? '' : 's'}
          {highlightCount > 0 ? ` · ${highlightCount} highlight${highlightCount === 1 ? '' : 's'}` : ''}
        </p>

        {missing.length > 0 ? (
          <p className="stay-card__missing">
            Still needed: {missing.slice(0, 3).join(', ')}
            {missing.length > 3 ? ` +${missing.length - 3} more` : ''}
          </p>
        ) : null}
      </div>

      <div className="stay-card__actions">
        {canEdit ? (
          <button type="button" className="prov-ui__btn prov-ui__btn--primary" onClick={onEdit}>
            Edit
          </button>
        ) : null}
        {canEdit ? (
          <Link to={boostHref} className="prov-ui__btn prov-ui__btn--ghost stay-card__boost-btn">
            <Sparkles size={14} strokeWidth={2.25} aria-hidden />
            {boost ? 'Manage boost' : 'Boost'}
          </Link>
        ) : null}
        {canEdit && onManageHighlights ? (
          <button type="button" className="prov-ui__btn prov-ui__btn--ghost" onClick={onManageHighlights}>
            Highlights
          </button>
        ) : null}
        <Link to={`/accommodation/${stay.id}`} className="prov-ui__btn prov-ui__btn--ghost">
          Preview
        </Link>
      </div>
    </article>
  )
}
