import { useMemo, useState } from 'react'
import { StoryViewer } from '../../StoryViewer'
import type { FoodVenueListing } from '../../../utils/foodListing'
import type { VenueStoryChannel } from './types'
import { VenueStoryRings } from './VenueStoryRings'
import { buildVenueStoryChannels, venueSlideToStorySlide } from './venueStoriesUtils'
import './venue-stories.css'

type Props = {
  title?: string
  subtitle?: string
  className?: string
  ctaLabel?: string
  /** Pre-built channels — use for journeys or custom listings. */
  channels?: VenueStoryChannel[]
  /** Food venue — auto-builds channels when `channels` is omitted. */
  venue?: FoodVenueListing
  venueId?: string
  /** Listing label in the story viewer (required when not using `venue`). */
  listingName?: string
  explorePath?: string
}

export function VenueStoriesSection({
  venue,
  venueId,
  listingName,
  explorePath,
  title = 'From the kitchen',
  subtitle = 'Tap a highlight to watch',
  className,
  channels: channelsProp,
  ctaLabel = 'View venue',
}: Props) {
  const name = listingName ?? venue?.name ?? ''
  const path = explorePath ?? (venueId ? `/food/${venueId}` : '/')
  const channels = useMemo(
    () => channelsProp ?? (venue ? buildVenueStoryChannels(venue, { venuePath: path }) : []),
    [channelsProp, venue, path],
  )
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)

  const activeChannel = channels.find((c) => c.id === activeChannelId) ?? null

  if (channels.length === 0) return null

  return (
    <>
      <section
        className={`fd-venue-stories acc-detail__section${className ? ` ${className}` : ''}`}
        aria-labelledby="fd-venue-stories-title"
      >
        <div className="fd-venue-stories__head ev-page__stories-head">
          <h2 id="fd-venue-stories-title" className="ev-page__stories-title">
            {title}
          </h2>
          <span className="ev-page__stories-sub">{subtitle}</span>
        </div>
        <VenueStoryRings
          rings={channels.map((ch) => ({
            id: ch.id,
            label: ch.label,
            coverSrc: ch.coverSrc,
          }))}
          activeId={activeChannelId}
          onSelect={setActiveChannelId}
        />
      </section>

      <StoryViewer
        open={!!activeChannel}
        onClose={() => setActiveChannelId(null)}
        channelLabel={activeChannel ? `${name} · ${activeChannel.label}` : name}
        explorePath={path}
        slides={(activeChannel?.slides ?? []).map(venueSlideToStorySlide)}
        ctaLabel={ctaLabel}
      />
    </>
  )
}
