import { HighlightStoriesSection } from '../../highlights/HighlightStoriesSection'
import type { FoodVenueListing } from '../../../utils/foodListing'
import type { VenueStoryChannel } from './types'

type Props = {
  title?: string
  subtitle?: string
  className?: string
  ctaLabel?: string
  channels?: VenueStoryChannel[]
  venue?: FoodVenueListing
  venueId?: string
  listingName?: string
  explorePath?: string
}

export function VenueStoriesSection({
  title = 'From the kitchen',
  ctaLabel = 'View venue',
  ...props
}: Props) {
  return <HighlightStoriesSection title={title} ctaLabel={ctaLabel} {...props} />
}
