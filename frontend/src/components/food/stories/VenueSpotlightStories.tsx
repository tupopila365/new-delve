import { useMemo, useState } from 'react'
import { StoryViewer } from '../../StoryViewer'
import type { FoodVenueListing } from '../../../utils/foodListing'
import { foodCoverSrc } from '../../../utils/foodDisplay'
import { VenueStoryRings } from './VenueStoryRings'
import { buildVenueSpotlightChannel, venueSlideToStorySlide } from './venueStoriesUtils'
import './venue-stories.css'

type SpotlightVenue = {
  id: number
  name: string
  description?: string
  cuisine: string
  cover_image: string | null
  owner_username?: string
  tagline?: string | null
  popular_dish?: string | null
  photos?: FoodVenueListing['photos']
  delvers_moments?: FoodVenueListing['delvers_moments']
  venue_stories?: FoodVenueListing['venue_stories']
}

type Props = {
  venues: SpotlightVenue[]
  title?: string
  subtitle?: string
  className?: string
}

export function VenueSpotlightStories({
  venues,
  title = 'Meet the kitchens',
  subtitle = 'Tap to open',
  className,
}: Props) {
  const spotlights = useMemo(
    () =>
      venues
        .map((v) => ({
          venue: v,
          channel: buildVenueSpotlightChannel(
            { ...v, owner_username: v.owner_username ?? 'food-host' } as FoodVenueListing,
            { venuePath: `/food/${v.id}` },
          ),
        }))
        .filter((entry): entry is { venue: SpotlightVenue; channel: NonNullable<typeof entry.channel> } => !!entry.channel),
    [venues],
  )

  const [activeVenueId, setActiveVenueId] = useState<number | null>(null)
  const active = spotlights.find((s) => s.venue.id === activeVenueId) ?? null

  if (spotlights.length === 0) return null

  return (
    <>
      <section
        className={`ev-page__story-rings fd-venue-stories--spotlight${className ? ` ${className}` : ''}`}
        aria-labelledby="fd-spotlight-stories-title"
      >
        <div className="ev-page__stories-head">
          <h2 id="fd-spotlight-stories-title" className="ev-page__stories-title">
            {title}
          </h2>
          <span className="ev-page__stories-sub">{subtitle}</span>
        </div>
        <VenueStoryRings
          rings={spotlights.map(({ venue, channel }) => ({
            id: String(venue.id),
            label: venue.name,
            coverSrc: channel.coverSrc || foodCoverSrc(venue.cover_image, venue.cuisine),
            cuisine: venue.cuisine,
          }))}
          activeId={activeVenueId != null ? String(activeVenueId) : null}
          onSelect={(id) => setActiveVenueId(Number(id))}
        />
      </section>

      <StoryViewer
        open={!!active}
        onClose={() => setActiveVenueId(null)}
        channelLabel={active?.venue.name ?? ''}
        explorePath={active ? `/food/${active.venue.id}` : '/food'}
        slides={(active?.channel.slides ?? []).map(venueSlideToStorySlide)}
        ctaLabel="View place"
      />
    </>
  )
}
