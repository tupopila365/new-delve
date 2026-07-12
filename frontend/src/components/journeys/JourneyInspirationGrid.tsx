import type { SyntheticEvent } from 'react'
import { Link } from 'react-router-dom'
import { Map, Route } from 'lucide-react'
import type { MockTrip } from '../../data/mockTrips'
import { journeyCoverSrc, JOURNEY_DEFAULT_IMAGE } from '../../utils/journeyDisplay'
import './JourneyInspirationGrid.css'

type Props = {
  journeys: MockTrip[]
  title?: string
  className?: string
  maxItems?: number
}

function onCoverError(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.onerror = null
  event.currentTarget.src = JOURNEY_DEFAULT_IMAGE
}

export function JourneyInspirationGrid({
  journeys,
  title = 'More inspiration',
  className = '',
  maxItems = 4,
}: Props) {
  const items = journeys.slice(0, maxItems)

  if (items.length === 0) {
    return (
      <section className={`jn-inspiration jn-inspiration--empty ${className}`.trim()}>
        <Link to="/journeys" className="jn-inspiration__browse">
          <Route size={15} strokeWidth={2.25} aria-hidden />
          Browse journeys
        </Link>
      </section>
    )
  }

  return (
    <section className={`jn-inspiration ${className}`.trim()} aria-labelledby="jn-inspiration-title">
      <header className="jn-inspiration__head">
        <h2 id="jn-inspiration-title" className="jn-inspiration__title">
          {title}
        </h2>
      </header>

      <div className="jn-inspiration__grid">
        {items.map((journey) => {
          const cover = journeyCoverSrc(journey.cover_image)
          return (
            <Link
              key={journey.id}
              to={`/journeys/${journey.id}`}
              className="jn-inspiration__card"
              aria-label={`Open journey: ${journey.title}`}
            >
              <span className="jn-inspiration__media">
                {cover ? (
                  <img src={cover} alt="" onError={onCoverError} />
                ) : (
                  <span className="jn-inspiration__placeholder" aria-hidden>
                    <Map size={20} strokeWidth={2} />
                  </span>
                )}
              </span>
              <span className="jn-inspiration__name">{journey.title}</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
