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
  isOwner?: boolean
  onAddHighlight?: () => void
  onManageHighlights?: () => void
}

export function VenueStoriesSection({
  title = 'From the kitchen',
  subtitle = 'Menu, space & venue highlights',
  ctaLabel = 'View venue',
  ...props
}: Props) {
  return <HighlightStoriesSection title={title} subtitle={subtitle} ctaLabel={ctaLabel} {...props} />
}
