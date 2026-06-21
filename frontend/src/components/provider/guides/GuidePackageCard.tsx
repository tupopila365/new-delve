import { Link } from 'react-router-dom'
import { Map } from 'lucide-react'
import type { TourPackage } from '../../guide/types'
import { packageCompleteness } from './guideProfileTypes'

type Props = {
  pkg: TourPackage
  guideId: number
  canEdit?: boolean
  onEdit: () => void
}

export function GuidePackageCard({ pkg, guideId, canEdit, onEdit }: Props) {
  const { percent, missing } = packageCompleteness(pkg)
  const reviewCount = pkg.reviews?.length ?? 0
  const avgRating =
    reviewCount > 0
      ? (pkg.reviews!.reduce((s, r) => s + r.rating, 0) / reviewCount).toFixed(1)
      : null

  return (
    <article className="prov-ui__card guide-card">
      <div className="guide-card__thumb">
        {pkg.photo ? (
          <img src={pkg.photo} alt="" />
        ) : (
          <span className="guide-card__thumb-fallback" aria-hidden>
            <Map size={22} strokeWidth={2} />
          </span>
        )}
        {percent < 100 ? <span className="guide-card__badge guide-card__badge--draft">{percent}% complete</span> : null}
      </div>

      <div className="guide-card__body">
        <div className="guide-card__head">
          <h3 className="guide-card__title">{pkg.title}</h3>
          <span className="guide-card__status guide-card__status--live">Live</span>
        </div>

        <p className="guide-card__meta">
          {pkg.hours}h · N${pkg.price} per person
          {(pkg.photos?.length ?? 0) > 0 ? ` · ${pkg.photos!.length} gallery photo${pkg.photos!.length === 1 ? '' : 's'}` : ''}
        </p>

        {pkg.description ? <p className="guide-card__desc">{pkg.description}</p> : null}

        {avgRating ? (
          <p className="guide-card__rating">
            {avgRating} rating · {reviewCount} review{reviewCount === 1 ? '' : 's'}
          </p>
        ) : null}

        {missing.length > 0 ? (
          <p className="guide-card__missing">
            Still needed: {missing.slice(0, 3).join(', ')}
            {missing.length > 3 ? ` +${missing.length - 3} more` : ''}
          </p>
        ) : null}
      </div>

      <div className="guide-card__actions">
        <Link to={`/guides/${guideId}/packages/${pkg.id}`} className="prov-ui__btn prov-ui__btn--ghost">
          View public
        </Link>
        {canEdit ? (
          <button type="button" className="prov-ui__btn prov-ui__btn--primary" onClick={onEdit}>
            Edit package
          </button>
        ) : null}
      </div>
    </article>
  )
}
