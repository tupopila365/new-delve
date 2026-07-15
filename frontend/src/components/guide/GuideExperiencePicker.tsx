import { Link } from 'react-router-dom'
import { Clock, Images, Route } from 'lucide-react'
import { mediaUrl } from '../../api/client'
import { JourneySection } from '../journeys/JourneySection'
import type { TourPackage } from './types'
import './guide-experience-picker.css'

type Props = {
  packages: TourPackage[]
  guideId: string | number
  selectedId: string | null
  onSelect: (pkg: TourPackage | null) => void
  title?: string
  subtitle?: string
  currency?: string
  className?: string
}

export function GuideExperiencePicker({
  packages,
  guideId,
  selectedId,
  onSelect,
  title = 'Programs & experiences',
  subtitle = 'Pick a program to request a date — or open full details.',
  currency = '$',
  className = '',
}: Props) {
  if (packages.length === 0) return null

  return (
    <JourneySection title={title} className={`guide-xp ${className}`.trim()} flush>
      {subtitle ? <p className="guide-xp__sub">{subtitle}</p> : null}
      <div className="guide-xp__strip" role="list">
        {packages.map((pkg, index) => {
          const active = selectedId === pkg.id
          const cover = pkg.photo ? mediaUrl(pkg.photo) || pkg.photo : null
          const extraPhotos = pkg.photos?.length ?? 0
          const photoCount = (cover ? 1 : 0) + extraPhotos
          const detailHref = `/guides/${guideId}/packages/${encodeURIComponent(pkg.id)}`
          const featured = index === 0

          return (
            <article
              key={pkg.id}
              role="listitem"
              className={`guide-xp__card${active ? ' guide-xp__card--active' : ''}${featured ? ' guide-xp__card--featured' : ''}`}
            >
              <Link className="guide-xp__media" to={detailHref} aria-label={`View ${pkg.title}`}>
                {featured ? <span className="guide-xp__badge">Featured</span> : null}
                {photoCount > 1 ? (
                  <span className="guide-xp__count">
                    <Images size={11} strokeWidth={2.25} aria-hidden />
                    {photoCount}
                  </span>
                ) : null}
                {cover ? (
                  <img src={cover} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="guide-xp__media-empty" aria-hidden>
                    <Route size={28} strokeWidth={1.75} />
                  </span>
                )}
              </Link>

              <div className="guide-xp__body">
                <Link className="guide-xp__name" to={detailHref}>
                  {pkg.title}
                </Link>
                <p className="guide-xp__price">
                  <span className="guide-xp__price-value">
                    {currency}
                    {pkg.price}
                  </span>
                  <span className="guide-xp__price-unit">total</span>
                </p>
                <p className="guide-xp__meta">
                  <Clock size={12} strokeWidth={2.25} aria-hidden />
                  {pkg.hours} {pkg.hours === 1 ? 'hour' : 'hours'}
                </p>
                <div className="guide-xp__actions">
                  <button
                    type="button"
                    className={`guide-xp__select${active ? ' guide-xp__select--on' : ''}`}
                    aria-pressed={active}
                    onClick={() => onSelect(active ? null : pkg)}
                  >
                    {active ? 'Selected' : 'Select'}
                  </button>
                  <Link className="guide-xp__view" to={detailHref}>
                    View details
                  </Link>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </JourneySection>
  )
}
