import { Link } from 'react-router-dom'
import { BedDouble, CalendarDays, Check, ChevronDown, Circle, Hotel, Sparkles } from 'lucide-react'
import { mediaUrl } from '../../../api/client'
import { propertyTypeLabel } from '../../../utils/accommodationListing'
import { isVideoUrl } from '../../listing/photos/listingGalleryMedia'
import { ShareButton } from '../../share'
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
  boost?: StayBoostStatus | null
}

export function StayListingCard({ stay, canEdit, boost }: Props) {
  const { format } = useDisplayMoney()
  const { percent, missing } = listingCompleteness(stay)
  const cover = stay.cover_image ? mediaUrl(stay.cover_image) || stay.cover_image : null
  const coverIsVideo = Boolean(stay.cover_image && isVideoUrl(stay.cover_image))
  const roomCount = Array.isArray(stay.room_types) ? stay.room_types.length : 0
  const photoCount = (stay.media_gallery?.length ?? 0) + (stay.cover_image ? 1 : 0)
  const boostHref = `/provider/promotions?listing=accommodation:${stay.id}&placement=homepage_stays`
  const editHref = `/provider/stays/${stay.id}/edit`
  const roomsHref = `/provider/stays/${stay.id}/rooms`
  const resume = Boolean(canEdit && percent < 100)
  const publicationStatus = stay.publication_status ?? (stay.is_active ? 'live' : 'draft')
  const publicationLabel =
    stay.publication_status_label ??
    (publicationStatus === 'pending_verification'
      ? 'Pending verification'
      : publicationStatus.charAt(0).toUpperCase() + publicationStatus.slice(1))
  const readinessItems = [
    'Title',
    'Description',
    'Location',
    'Map pin',
    'Cover photo',
    'Nightly price',
    'Guest capacity',
    'Bedrooms',
    'Amenities',
    'Check-in / check-out',
    'Cancellation policy',
    'Room types',
    'Photo gallery',
    'FAQs',
  ]
  const missingSet = new Set(missing)

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
          <span className={`stay-card__status stay-card__status--${publicationStatus}`}>
            {publicationLabel}
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
          {typeof stay.views_count === 'number' ? ` · ${stay.views_count} view${stay.views_count === 1 ? '' : 's'}` : ''}
        </p>

        <details className="stay-card__readiness">
          <summary>
            <span>
              Preview checklist
              <small>
                {readinessItems.length - missing.length}/{readinessItems.length} ready
              </small>
            </span>
            <ChevronDown size={16} strokeWidth={2.25} aria-hidden />
          </summary>
          <ul>
            {readinessItems.map((item) => {
              const complete = !missingSet.has(item)
              return (
                <li key={item} className={complete ? 'is-complete' : 'is-missing'}>
                  {complete ? (
                    <Check size={14} strokeWidth={2.6} aria-hidden />
                  ) : (
                    <Circle size={12} strokeWidth={2} aria-hidden />
                  )}
                  {item}
                </li>
              )
            })}
          </ul>
          {missing.length > 0 ? (
            <Link to={editHref} className="stay-card__readiness-link">
              Complete {missing[0].toLowerCase()}
            </Link>
          ) : (
            <span className="stay-card__ready-note">Ready for public preview</span>
          )}
        </details>
      </div>

      <div className="stay-card__actions">
        {canEdit ? (
          <Link to={editHref} className={`prov-ui__btn ${resume ? 'prov-ui__btn--primary' : 'prov-ui__btn--primary'}`}>
            {resume ? 'Continue accommodation' : 'Edit accommodation'}
          </Link>
        ) : null}
        {canEdit ? (
          <Link to={roomsHref} className="prov-ui__btn prov-ui__btn--ghost">
            <BedDouble size={14} strokeWidth={2.25} aria-hidden />
            {roomCount > 0 ? `Rooms (${roomCount})` : 'Add rooms'}
          </Link>
        ) : null}
        {canEdit ? (
          <Link to={`/provider/stays/${stay.id}/calendar`} className="prov-ui__btn prov-ui__btn--ghost">
            <CalendarDays size={14} strokeWidth={2.25} aria-hidden />
            Calendar
          </Link>
        ) : null}
        {canEdit ? (
          <Link to={boostHref} className="prov-ui__btn prov-ui__btn--ghost stay-card__boost-btn">
            <Sparkles size={14} strokeWidth={2.25} aria-hidden />
            {boost ? 'Manage boost' : 'Boost'}
          </Link>
        ) : null}
        <Link to={`/accommodation/${stay.id}?preview=1`} className="prov-ui__btn prov-ui__btn--ghost">
          Preview
        </Link>
        <ShareButton
          className="prov-ui__btn prov-ui__btn--ghost"
          label="Share"
          ariaLabel="Share stay listing"
          iconSize={14}
          share={{
            path: `/accommodation/${stay.id}`,
            title: stay.title || 'DELVE stay',
            text: `Check out ${stay.title || 'this stay'} on DELVE`,
            previewImage: stay.cover_image,
            previewLabel: stay.city ? `Stay · ${stay.city}, ${stay.region}` : `Stay · ${stay.region}`,
          }}
        />
      </div>
    </article>
  )
}
