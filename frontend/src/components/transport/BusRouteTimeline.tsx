import { MapPin } from 'lucide-react'
import { ListingSection } from '../listing'
import type { RouteStop } from '../../utils/transportListing'

type Props = {
  stops: RouteStop[]
  className?: string
}

export function BusRouteTimeline({ stops, className = '' }: Props) {
  return (
    <ListingSection title="Route summary" className={`tp-route-section ${className}`.trim()}>
      <div className="tp-route-timeline">
        {stops.map((stop, i) => (
          <div key={`${stop.place}-${i}`} className="tp-route-stop">
            <div className="tp-route-stop__rail">
              <span className="tp-route-stop__dot" aria-hidden />
              {i < stops.length - 1 ? <span className="tp-route-stop__line" aria-hidden /> : null}
            </div>
            <div className="tp-route-stop__body">
              <p className="tp-route-stop__place">
                <MapPin size={14} strokeWidth={2.25} aria-hidden />
                {stop.place}
              </p>
              <p className="tp-route-stop__label">
                {stop.label}
                {stop.time ? ` · ${stop.time}` : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ListingSection>
  )
}
