import { useQuery } from '@tanstack/react-query'
import { apiFetch, asArray } from '../api/client'
import type { AccommodationListing } from '../utils/accommodationListing'
import { buildStayStoryChannels } from './accommodation/stayStoriesUtils'
import { ProviderStoriesRow, type ProviderStoryItem } from './ProviderStoriesRow'

/** Provider-controlled Host Highlights, sourced only from each property's curated media. */
export function HostHighlightsRow() {
  const { data: listings = [] } = useQuery({
    queryKey: ['accommodation-host-highlights'],
    queryFn: async () => {
      const rows = await apiFetch<AccommodationListing[]>(
        '/api/accommodation/listings/?ordering=-created_at',
        { auth: false },
      )
      return asArray<AccommodationListing>(rows)
    },
  })

  const items: ProviderStoryItem[] = listings
    .filter((listing) => (listing.listing_stories?.length ?? 0) > 0)
    .map((listing) => {
      const stayPath = `/accommodation/${listing.id}`
      const channels = buildStayStoryChannels(listing, {
        listingId: String(listing.id),
        stayPath,
      })
      const slides = channels.flatMap((channel) => channel.slides)
      const first = channels[0]
      return {
        id: String(listing.id),
        label: listing.title,
        channelLabel: `${listing.title} · Host Highlights`,
        explorePath: stayPath,
        coverSrc: first?.coverSrc ?? null,
        coverKind: first?.coverKind,
        fallbackInitial: listing.title,
        slides,
      }
    })
    .filter((item) => item.slides.length > 0)
    .slice(0, 12)

  if (items.length === 0) return null

  return (
    <ProviderStoriesRow
      items={items}
      ariaLabel="Host Highlights"
      title="Host Highlights"
      subtitle="Curated by each property — rooms, facilities, atmosphere and location."
      ctaLabel="View stay"
    />
  )
}
