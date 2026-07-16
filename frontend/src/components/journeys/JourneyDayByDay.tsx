import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'
import {
  BedDouble,
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Play,
  Route,
  Ticket,
  Utensils,
} from 'lucide-react'
import type { TripStop } from '../../data/mockTrips'
import { JourneySection } from './JourneySection'
import {
  collectRouteMedia,
  mediaListFromStopEntry,
  type JourneyStopMediaItem,
} from './journeyRouteMedia'
import { JourneyStopMediaLightbox } from './JourneyStopMediaLightbox'
import { dayRangeLabel, fmtJourneyDateShort, nightsBetween } from '../../utils/journeyListing'
import './journey-route-stops.css'
import './journey-day-by-day.css'

type Props = {
  stops: TripStop[]
  tags?: string[]
  className?: string
  isAuthor?: boolean
  onShareEntry?: (entryId: number) => void
}

function globalIndexForItem(routeMedia: JourneyStopMediaItem[], item: JourneyStopMediaItem) {
  return routeMedia.findIndex((m) => m.id === item.id && m.stopIndex === item.stopIndex)
}

const LISTING_TAG: Record<string, { verb: string; Icon: ComponentType<LucideProps> }> = {
  accommodation: { verb: 'Stayed at', Icon: BedDouble },
  food: { verb: 'Ate at', Icon: Utensils },
  event: { verb: 'Went to', Icon: Ticket },
}

/** Swipeable media for one diary moment — big photos, reel-style muted video. */
function EntryMediaCarousel({
  items,
  stopName,
  onOpen,
}: {
  items: JourneyStopMediaItem[]
  stopName: string
  onOpen: (item: JourneyStopMediaItem) => void
}) {
  const [idx, setIdx] = useState(0)
  const count = items.length
  const current = items[Math.min(idx, count - 1)]
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || current?.kind !== 'video') return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { threshold: 0.5 },
    )
    io.observe(video)
    return () => io.disconnect()
  }, [current?.src, current?.kind])

  if (!current) return null

  return (
    <div className="jn-diary__carousel">
      <button
        type="button"
        className={`jn-diary__media jn-diary__media--${current.kind}`}
        onClick={() => onOpen(current)}
        aria-label={current.kind === 'video' ? `Play video from ${stopName}` : `View photo from ${stopName}`}
      >
        {current.kind === 'video' ? (
          <>
            <video
              ref={videoRef}
              src={current.src}
              poster={current.poster ?? undefined}
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden
            />
            <span className="jn-diary__media-play" aria-hidden>
              <Play size={20} strokeWidth={2.5} fill="currentColor" />
            </span>
          </>
        ) : (
          <img src={current.src} alt={current.caption || stopName} loading="lazy" decoding="async" />
        )}
      </button>

      {count > 1 ? (
        <>
          <button
            type="button"
            className="jn-diary__car-nav jn-diary__car-nav--prev"
            onClick={() => setIdx((idx - 1 + count) % count)}
            aria-label="Previous photo"
          >
            <ChevronLeft size={20} strokeWidth={2.5} aria-hidden />
          </button>
          <button
            type="button"
            className="jn-diary__car-nav jn-diary__car-nav--next"
            onClick={() => setIdx((idx + 1) % count)}
            aria-label="Next photo"
          >
            <ChevronRight size={20} strokeWidth={2.5} aria-hidden />
          </button>
          <span className="jn-diary__car-count">
            {Math.min(idx, count - 1) + 1} / {count}
          </span>
          <div className="jn-diary__dots" aria-hidden>
            {items.map((item, i) => (
              <span
                key={item.id}
                className={`jn-diary__dot${i === Math.min(idx, count - 1) ? ' is-active' : ''}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

export function JourneyDayByDay({ stops, tags = [], className = '', isAuthor = false, onShareEntry }: Props) {
  const routeMedia = useMemo(() => collectRouteMedia(stops), [stops])
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const openLightbox = (item: JourneyStopMediaItem) => {
    const idx = globalIndexForItem(routeMedia, item)
    if (idx >= 0) setLightboxIndex(idx)
  }

  return (
    <>
      <JourneySection title="The diary" className={`jn-diary-section ${className}`.trim()}>
        {stops.length === 0 ? (
          <div className="jn-diary__empty td-empty-panel">
            <Route size={28} strokeWidth={1.75} aria-hidden />
            <p>Day-by-day notes will appear here once the traveller adds them.</p>
          </div>
        ) : (
          <div className="jn-diary">
            {stops.map((stop, stopIndex) => {
              const isLast = stopIndex === stops.length - 1
              const nights = nightsBetween(stop.arrived_on, stop.left_on)
              const entryRows = stop.entries
                .map((entry) => ({ entry, media: mediaListFromStopEntry(stop, stopIndex, entry) }))
                .filter(({ entry, media }) => media.length > 0 || entry.body?.trim())

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
                        Stop {stopIndex + 1} · {dayRangeLabel(stop.arrived_on, stop.left_on)}
                      </p>
                      <h3 className="jn-diary__place">
                        <MapPin size={16} strokeWidth={2.25} aria-hidden />
                        {stop.place_name}
                        {stop.region ? <span className="jn-diary__region">, {stop.region}</span> : null}
                      </h3>
                      <p className="jn-diary__dates">
                        <Clock size={12} strokeWidth={2.25} aria-hidden />
                        {fmtJourneyDateShort(stop.arrived_on)} – {fmtJourneyDateShort(stop.left_on)}
                        {nights > 0 ? ` · ${nights} ${nights === 1 ? 'night' : 'nights'}` : ''}
                        {stop.cost ? (
                          <>
                            {' · '}
                            <span className="jn-diary__cost">N${stop.cost.toLocaleString()}</span>
                          </>
                        ) : null}
                      </p>
                    </header>

                    {stop.notes?.trim() ? <p className="jn-diary__intro">{stop.notes.trim()}</p> : null}

                    {stop.linked_listing ? (
                      (() => {
                        const meta = LISTING_TAG[stop.linked_listing.kind] ?? {
                          verb: 'Visited',
                          Icon: MapPin,
                        }
                        const TagIcon = meta.Icon
                        return (
                          <Link to={stop.linked_listing.href} className="jn-diary__place-tag">
                            <TagIcon size={14} strokeWidth={2.25} aria-hidden />
                            <span className="jn-diary__place-tag-verb">{meta.verb}</span>
                            <span className="jn-diary__place-tag-name">{stop.linked_listing.title}</span>
                          </Link>
                        )
                      })()
                    ) : null}

                    {entryRows.length > 0 ? (
                      <div className="jn-diary__entries">
                        {entryRows.map(({ entry, media }) => {
                          const note = entry.body?.trim()
                          return (
                            <div key={entry.id} className="jn-diary__entry">
                              {media.length > 0 ? (
                                <EntryMediaCarousel
                                  items={media}
                                  stopName={stop.place_name}
                                  onOpen={openLightbox}
                                />
                              ) : null}
                              {note ? <p className="jn-diary__note">{note}</p> : null}
                              {isAuthor && onShareEntry ? (
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

        {tags.length > 0 ? (
          <div className="jn-diary__tags td-meta">
            {tags.map((t) => (
              <span key={t} className="td-pill td-pill--tag">
                {t}
              </span>
            ))}
          </div>
        ) : null}
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
