import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera } from 'lucide-react'
import type { ListingMomentsPageState } from '../components/listing/types'
import '../components/listing/listing-detail.css'

export function ListingMomentsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state ?? {}) as ListingMomentsPageState
  const { title = 'From Delvers', moments = [], backTo } = state

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

      {moments.length > 0 ? (
        <div className="listing-page__moments">
          {moments.map((moment) => (
            <article key={moment.id} className="listing-page__moment">
              <div className="listing-moments__thumb">
                {moment.image ? (
                  <img src={moment.image} alt="" loading="lazy" decoding="async" />
                ) : (
                  <div className="listing-moments__placeholder" aria-hidden>
                    <Camera size={22} strokeWidth={1.75} />
                  </div>
                )}
              </div>
              <p className="listing-moments__body">
                <strong>@{moment.author}</strong> {moment.body}
                {moment.taggedListing ? (
                  <span className="listing-moments__tag">@{moment.taggedListing}</span>
                ) : null}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="listing-muted" role="status">
          No moments yet.
        </p>
      )}
    </div>
  )
}
