import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { ListingGalleryPageState } from '../components/listing/types'
import '../components/listing/listing-detail.css'

export function ListingGalleryPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state ?? {}) as ListingGalleryPageState
  const { title = 'Photos', images = [], backTo } = state

  const backHref = backTo ?? -1

  return (
    <div className="listing-page">
      <div className="listing-page__bar">
        {typeof backHref === 'string' ? (
          <Link className="listing-page__back" to={backHref} aria-label="Go back">
            <ArrowLeft size={18} strokeWidth={2.25} />
          </Link>
        ) : (
          <button
            type="button"
            className="listing-page__back"
            onClick={() => navigate(backHref)}
            aria-label="Go back"
          >
            <ArrowLeft size={18} strokeWidth={2.25} />
          </button>
        )}
        <h1 className="listing-page__title">{title}</h1>
      </div>

      {images.length > 0 ? (
        <div className="listing-page__grid">
          {images.map((item, index) => (
            <figure key={item.id ?? `${item.src}-${index}`}>
              <img src={item.src} alt={item.alt ?? ''} loading="lazy" decoding="async" />
              {item.caption ? <figcaption className="listing-page__caption">{item.caption}</figcaption> : null}
            </figure>
          ))}
        </div>
      ) : (
        <p className="listing-muted" role="status">
          No photos to show yet.
        </p>
      )}
    </div>
  )
}
