import { Link } from 'react-router-dom'
import { mediaUrl } from '../../api/client'
import type { ReviewItem } from '../GuestReviewCard'

export type TourPackage = {
  id: string
  title: string
  hours: number
  price: string
  /** Optional cover image URL (path or absolute), from API `photo` or `image`. */
  photo?: string | null
  /** Optional longer copy for the package detail page. */
  description?: string
  /** Extra images for the package detail gallery (URLs/paths). */
  photos?: string[]
  /** Reviews tied to this package (same shape as guide `guest_reviews`). */
  reviews?: ReviewItem[]
}

type Props = {
  packages: TourPackage[]
  selectedId: string | null
  onSelect: (pkg: TourPackage | null) => void
  currency?: string
  /** When false, packages are shown as browse-only cards (no booking selection). */
  selectable?: boolean
  /** When set, each package links to `/guides/:id/packages/:slug` for full detail. */
  guideId?: number
  title?: string
  intro?: string
  hideHeading?: boolean
}

export function GuideTourPackages({
  packages,
  selectedId,
  onSelect,
  currency = '$',
  selectable = true,
  guideId,
  title = 'Experiences you can book',
  intro,
  hideHeading = false,
}: Props) {
  if (!packages.length) return null

  const introText =
    intro ??
    (selectable
      ? 'Choose a set itinerary, or build your own with hourly pricing in the booking card.'
      : 'Sample itineraries this guide offers — sign in to select one when you book.')

  return (
    <div className="gd-detail__packages" role="group" aria-label="Tour packages">
      {!hideHeading ? (
        <>
          <h2 className="gd-detail__section-title">{title}</h2>
          <p className="gd-detail__packages-intro">{introText}</p>
        </>
      ) : null}
      <ul className="gd-detail__package-list">
        {packages.map((p) => {
          const active = selectable && selectedId === p.id
          const imgUrl = p.photo ? mediaUrl(p.photo) || p.photo : ''
          const body = (
            <>
              <div className="gd-detail__package-visual" aria-hidden={!imgUrl}>
                {imgUrl ? (
                  <img className="gd-detail__package-img" src={imgUrl} alt="" loading="lazy" />
                ) : (
                  <div className="gd-detail__package-img gd-detail__package-img--placeholder">
                    <span>{p.title.slice(0, 1)}</span>
                  </div>
                )}
              </div>
              <div className="gd-detail__package-body">
                <span className="gd-detail__package-title">{p.title}</span>
                <span className="gd-detail__package-meta">
                  {p.hours} {p.hours === 1 ? 'hr' : 'hrs'} · {currency}
                  {p.price}
                </span>
              </div>
            </>
          )
          const detailHref =
            guideId != null ? `/guides/${guideId}/packages/${encodeURIComponent(p.id)}` : null
          return (
            <li key={p.id} className="gd-detail__package-li">
              {selectable ? (
                <button
                  type="button"
                  className={`gd-detail__package-btn${active ? ' gd-detail__package-btn--active' : ''}`}
                  aria-pressed={active}
                  onClick={() => onSelect(active ? null : p)}
                >
                  {body}
                </button>
              ) : (
                <div className="gd-detail__package-card">{body}</div>
              )}
              {detailHref ? (
                <Link to={detailHref} className="gd-detail__package-detail-link">
                  View details →
                </Link>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
