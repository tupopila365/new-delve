import { useMemo, useState } from 'react'
import { CalendarDays, Camera, Play, Route } from 'lucide-react'
import type { TripStop } from '../../data/mockTrips'
import { JourneySection } from './JourneySection'
import {
  collectRouteMedia,
  mediaFromStopEntry,
  type JourneyStopMediaItem,
} from './journeyRouteMedia'
import { JourneyStopMediaLightbox } from './JourneyStopMediaLightbox'
import { dayRangeLabel, fmtJourneyDateShort } from '../../utils/journeyListing'
import './journey-route-stops.css'
import './journey-day-by-day.css'

type Props = {
  stops: TripStop[]
  className?: string
  isAuthor?: boolean
  onShareEntry?: (entryId: number) => void
}

function globalIndexForItem(routeMedia: JourneyStopMediaItem[], item: JourneyStopMediaItem) {
  return routeMedia.findIndex((m) => m.id === item.id && m.stopIndex === item.stopIndex)
}

export function JourneyDayByDay({ stops, className = '', isAuthor = false, onShareEntry }: Props) {
  const routeMedia = useMemo(() => collectRouteMedia(stops), [stops])
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const openLightbox = (item: JourneyStopMediaItem) => {
    const idx = globalIndexForItem(routeMedia, item)
    if (idx >= 0) setLightboxIndex(idx)
  }

  return (
    <>
      <JourneySection title="Day-by-day itinerary" className={`jn-diary-section ${className}`.trim()}>
        {stops.length === 0 ? (
          <div className="jn-diary__empty td-empty-panel">
            <Route size={28} strokeWidth={1.75} aria-hidden />
            <p>Day-by-day notes will appear here once the traveller adds them.</p>
          </div>
        ) : (
          <div className="jn-diary">
            {stops.map((stop, stopIndex) => {
              const isLast = stopIndex === stops.length - 1
              const hasEntries = stop.entries.length > 0

              return (
                <article key={stop.id} className="jn-diary__day">
                  <div className="jn-route__rail" aria-hidden>
                    <span
                      className={`jn-route__dot${stopIndex === 0 ? ' jn-route__dot--first' : ''}${isLast ? ' jn-route__dot--last' : ''}`}
                    />
                    {!isLast ? <span className="jn-route__line" /> : null}
                  </div>

                  <div className="jn-diary__content">
                    <header className="jn-diary__head">
                      <p className="jn-diary__chapter">
                        <CalendarDays size={12} strokeWidth={2.25} aria-hidden />
                        {dayRangeLabel(stop.arrived_on, stop.left_on)}
                      </p>
                      <h3 className="jn-diary__place">{stop.place_name}</h3>
                      <p className="jn-diary__dates">
                        {fmtJourneyDateShort(stop.arrived_on)} – {fmtJourneyDateShort(stop.left_on)}
                        {stop.cost ? (
                          <>
                            {' · '}
                            <span className="jn-diary__cost">N${stop.cost.toLocaleString()}</span>
                          </>
                        ) : null}
                      </p>
                    </header>

                    {hasEntries ? (
                      <div className="jn-diary__entries">
                        {stop.entries.map((entry) => {
                          const media = mediaFromStopEntry(stop, stopIndex, entry)
                          const note = entry.body?.trim()

                          if (!media && !note) return null

                          return (
                            <div key={entry.id} className="jn-diary__entry">
                              {media ? (
                                <button
                                  type="button"
                                  className={`jn-route__thumb jn-diary__thumb jn-route__thumb--${media.kind}`}
                                  onClick={() => openLightbox(media)}
                                  aria-label={
                                    media.kind === 'video'
                                      ? `Play video from ${stop.place_name}`
                                      : `View photo from ${stop.place_name}`
                                  }
                                >
                                  {media.kind === 'video' ? (
                                    <>
                                      {media.poster ? (
                                        <img src={media.poster} alt="" loading="lazy" />
                                      ) : (
                                        <video src={media.src} muted playsInline preload="metadata" aria-hidden />
                                      )}
                                      <span className="jn-route__thumb-play" aria-hidden>
                                        <Play size={12} strokeWidth={2.5} fill="currentColor" />
                                      </span>
                                    </>
                                  ) : (
                                    <img src={media.src} alt="" loading="lazy" />
                                  )}
                                </button>
                              ) : null}
                              {note ? <p className="jn-diary__note">{note}</p> : null}
                              {isAuthor && onShareEntry && (note || media) ? (
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm jn-diary__share"
                                  onClick={() => onShareEntry(entry.id)}
                                >
                                  <Camera size={14} strokeWidth={2.25} aria-hidden />
                                  Share on Delvers
                                </button>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="jn-diary__empty-day">No diary entries for this stop yet.</p>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </JourneySection>

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
