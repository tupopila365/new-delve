import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, MapPin, Play, Route } from 'lucide-react'
import type { TripStop } from '../../data/mockTrips'
import { ListingSection } from '../listing'
import {
  collectRouteMedia,
  collectStopMedia,
  type JourneyStopMediaItem,
} from './journeyRouteMedia'
import { JourneyStopMediaLightbox } from './JourneyStopMediaLightbox'
import { fmtJourneyDateShort, nightsBetween } from '../../utils/journeyListing'
import './journey-route-stops.css'

const MAX_THUMBS = 4

type Props = {
  stops: TripStop[]
  tags?: string[]
  className?: string
}

function globalIndexForItem(routeMedia: JourneyStopMediaItem[], item: JourneyStopMediaItem) {
  return routeMedia.findIndex((m) => m.id === item.id && m.stopIndex === item.stopIndex)
}

export function JourneyRouteStops({ stops, tags = [], className = '' }: Props) {
  const routeMedia = useMemo(() => collectRouteMedia(stops), [stops])
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const openLightbox = (item: JourneyStopMediaItem) => {
    const idx = globalIndexForItem(routeMedia, item)
    if (idx >= 0) setLightboxIndex(idx)
  }

  return (
    <>
      <ListingSection title="Route and stops" className={`jn-route-section ${className}`.trim()}>
        {stops.length === 0 ? (
          <div className="jn-route__empty td-empty-panel">
            <Route size={28} strokeWidth={1.75} aria-hidden />
            <p>Stops and route details will appear here once the traveller adds them.</p>
          </div>
        ) : (
          <div className="jn-route">
            {stops.map((stop, stopIndex) => {
              const media = collectStopMedia(stop, stopIndex)
              const isLast = stopIndex === stops.length - 1
              const visibleMedia = media.slice(0, MAX_THUMBS)
              const extraCount = Math.max(0, media.length - MAX_THUMBS)

              return (
                <article key={stop.id} className="jn-route__stop">
                  <div className="jn-route__rail" aria-hidden>
                    <span
                      className={`jn-route__dot${stopIndex === 0 ? ' jn-route__dot--first' : ''}${isLast ? ' jn-route__dot--last' : ''}`}
                    />
                    {!isLast ? <span className="jn-route__line" /> : null}
                  </div>

                  <div className="jn-route__content">
                    <p className="jn-route__num">Stop {stopIndex + 1}</p>
                    <h3 className="jn-route__place">
                      <MapPin size={14} strokeWidth={2.25} aria-hidden />
                      {stop.place_name}
                      {stop.region ? <span className="jn-route__region">, {stop.region}</span> : null}
                    </h3>
                    <p className="jn-route__meta">
                      <Clock size={12} strokeWidth={2.25} aria-hidden />
                      <span>
                        {fmtJourneyDateShort(stop.arrived_on)} – {fmtJourneyDateShort(stop.left_on)}
                        {' · '}
                        {nightsBetween(stop.arrived_on, stop.left_on)} nights
                        {stop.cost ? ` · N$${stop.cost.toLocaleString()}` : ''}
                      </span>
                    </p>
                    {stop.notes?.trim() ? <p className="jn-route__notes">{stop.notes.trim()}</p> : null}
                    {stop.linked_listing ? (
                      <p className="jn-route__listing-link">
                        <Link to={stop.linked_listing.href}>View on DELVE · {stop.linked_listing.title}</Link>
                      </p>
                    ) : null}

                    {visibleMedia.length > 0 ? (
                      <div className="jn-route__thumbs" role="list" aria-label={`Photos from ${stop.place_name}`}>
                        {visibleMedia.map((item, thumbIndex) => {
                          const isMoreTile = extraCount > 0 && thumbIndex === visibleMedia.length - 1
                          return (
                            <button
                              key={`${item.stopIndex}-${item.id}`}
                              type="button"
                              role="listitem"
                              className={`jn-route__thumb jn-route__thumb--${item.kind}`}
                              onClick={() => openLightbox(item)}
                              aria-label={
                                item.kind === 'video'
                                  ? `Play video from ${stop.place_name}`
                                  : `View photo from ${stop.place_name}`
                              }
                            >
                              {item.kind === 'video' ? (
                                <>
                                  {item.poster ? (
                                    <img src={item.poster} alt="" loading="lazy" />
                                  ) : (
                                    <video src={item.src} muted playsInline preload="metadata" aria-hidden />
                                  )}
                                  <span className="jn-route__thumb-play" aria-hidden>
                                    <Play size={12} strokeWidth={2.5} fill="currentColor" />
                                  </span>
                                </>
                              ) : (
                                <img src={item.src} alt="" loading="lazy" />
                              )}
                              {isMoreTile ? <span className="jn-route__thumb-more">+{extraCount}</span> : null}
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {tags.length > 0 ? (
          <div className="jn-route__tags td-meta">
            {tags.map((t) => (
              <span key={t} className="td-pill td-pill--tag">
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </ListingSection>

      {lightboxIndex != null ? (
        <JourneyStopMediaLightbox
          items={routeMedia}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      ) : null}
    </>
  )
}
