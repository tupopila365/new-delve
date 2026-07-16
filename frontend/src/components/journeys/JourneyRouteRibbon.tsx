import { MapPin } from 'lucide-react'
import type { TripStop } from '../../data/mockTrips'
import { nightsBetween } from '../../utils/journeyListing'
import './journey-route-ribbon.css'

type Props = {
  stops: TripStop[]
  className?: string
}

/** Compact, coordinate-free "route ribbon" — connected stops that read as a
 *  journey path, not a map. Horizontally scrollable on small screens. */
export function JourneyRouteRibbon({ stops, className = '' }: Props) {
  if (stops.length === 0) return null

  return (
    <div className={`jn-ribbon ${className}`.trim()}>
      <ol className="jn-ribbon__track" aria-label="Route overview">
        {stops.map((stop, i) => {
          const nights = nightsBetween(stop.arrived_on, stop.left_on)
          return (
            <li key={stop.id} className="jn-ribbon__item">
              <span className="jn-ribbon__node" aria-hidden>
                <MapPin size={13} strokeWidth={2.5} />
              </span>
              <span className="jn-ribbon__place">{stop.place_name}</span>
              {nights > 0 ? (
                <span className="jn-ribbon__nights">
                  {nights} {nights === 1 ? 'night' : 'nights'}
                </span>
              ) : (
                <span className="jn-ribbon__nights">Stop {i + 1}</span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
