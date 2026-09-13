import { Navigation, Clock, MapPin, ArrowRight } from 'lucide-react'
import EntityCard from './EntityCard'
import EntityCardMedia, { type MediaSource } from './EntityCardMedia'
import TravelerAvatar from './TravelerAvatar'
import SaveButton from './SaveButton'

export interface JourneyCreator {
  name: string
  avatarUrl?: string
  handle?: string
}

export interface JourneyCardProps {
  id: string
  title: string
  duration: string
  distance?: string
  stops: string[]
  creator: JourneyCreator
  media: MediaSource
  historicalCost?: string
  isSaved?: boolean
  onSave?: (id: string) => void
  onClick?: () => void
  className?: string
}

export default function JourneyCard({
  id,
  title,
  duration,
  distance,
  stops = [],
  creator,
  media,
  historicalCost,
  isSaved = false,
  onSave,
  onClick,
  className = '',
}: JourneyCardProps) {
  const handleSave = () => {
    onSave?.(id)
  }

  // Display up to 3 stops directly
  const visibleStops = stops.slice(0, 3)
  const extraStopsCount = Math.max(0, stops.length - 3)

  return (
    <EntityCard onClick={onClick} className={className} ariaLabel={`Journey: ${title}`}>
      {/* Multimedia Header with Duration/Distance Badges & Save Button */}
      <EntityCardMedia
        media={media}
        aspectRatio="wide"
        alt={title}
        overlayTopLeft={
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md inline-flex items-center gap-1"
              style={{ background: 'rgba(0,0,0,0.65)', color: '#fff' }}
            >
              <Clock size={11} />
              <span>{duration}</span>
            </span>
            {distance && (
              <span
                className="text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md inline-flex items-center gap-1"
                style={{ background: 'rgba(0,0,0,0.65)', color: '#fff' }}
              >
                <Navigation size={11} />
                <span>{distance}</span>
              </span>
            )}
          </div>
        }
        overlayTopRight={
          onSave ? (
            <SaveButton
              isSaved={isSaved}
              onClick={handleSave}
              size="sm"
              variant="filled"
              ariaLabel={`Save journey ${title}`}
            />
          ) : undefined
        }
      />

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Creator Profile Row */}
          <div className="flex items-center gap-2 mb-2">
            <TravelerAvatar
              src={creator.avatarUrl}
              alt={creator.name}
              fallbackInitials={creator.name}
              size="sm"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold m-0 truncate" style={{ color: 'var(--fg)' }}>
                {creator.name}
              </p>
              {creator.handle && (
                <p className="text-[10px] m-0 truncate" style={{ color: 'var(--fg-muted)' }}>
                  @{creator.handle.replace(/^@/, '')}
                </p>
              )}
            </div>
          </div>

          {/* Title */}
          <h3
            className="text-base font-bold m-0 mb-2.5 line-clamp-1"
            style={{ fontFamily: 'Syne, var(--font-display, sans-serif)', color: 'var(--fg)' }}
          >
            {title}
          </h3>

          {/* Route Stops Rail (e.g. Windhoek → Sossusvlei → Swakopmund) */}
          {visibleStops.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
              <MapPin size={12} className="text-[var(--primary)] shrink-0" />
              {visibleStops.map((stop, i) => (
                <span key={stop} className="inline-flex items-center gap-1">
                  <span className="font-medium truncate max-w-[100px]">{stop}</span>
                  {i < visibleStops.length - 1 && (
                    <ArrowRight size={10} className="text-[var(--fg-muted)] shrink-0" />
                  )}
                </span>
              ))}
              {extraStopsCount > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[var(--surface-subtle)] text-[var(--fg-muted)]">
                  +{extraStopsCount} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Historical Traveler Cost Banner */}
        {historicalCost && (
          <div className="pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--border)' }}>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider m-0 truncate" style={{ color: 'var(--fg-muted)' }}>
                Historical trip cost
              </p>
              <p className="text-xs sm:text-sm font-bold m-0 tabular-nums truncate" style={{ color: 'var(--fg)' }}>
                {historicalCost}
              </p>
            </div>
            <span
              className="text-[11px] font-semibold shrink-0 inline-flex items-center gap-1"
              style={{ color: 'var(--primary)' }}
            >
              <span>Explore</span>
              <ArrowRight size={12} />
            </span>
          </div>
        )}
      </div>
    </EntityCard>
  )
}
