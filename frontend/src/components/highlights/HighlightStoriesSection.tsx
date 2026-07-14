import { useMemo, useState } from 'react'
import { StoryViewer } from '../StoryViewer'
import type { FoodVenueListing } from '../../utils/foodListing'
import { buildVenueStoryChannels } from '../food/stories/venueStoriesUtils'
import type { HighlightChannel } from './types'
import { HighlightRings } from './HighlightRings'
import { highlightSlideToStorySlide } from './highlightStoriesUtils'
import '../food/stories/venue-stories.css'

type Props = {
  title?: string
  subtitle?: string
  className?: string
  ctaLabel?: string
  /** Pre-built owner + custom channels. */
  channels?: HighlightChannel[]
  /** Food venue — auto-builds when `channels` omitted (legacy). */
  venue?: FoodVenueListing
  venueId?: string
  listingName?: string
  explorePath?: string
  /** Owner sees add CTA when no channels. */
  isOwner?: boolean
  onAddHighlight?: () => void
  /** Owner can open full manage sheet (rename / delete rings / edit slides). */
  onManageHighlights?: () => void
}

export function HighlightStoriesSection({
  venue,
  venueId,
  listingName,
  explorePath,
  title = 'Highlights',
  subtitle = 'Tap a highlight to watch',
  className,
  channels: channelsProp,
  ctaLabel = 'View listing',
  isOwner = false,
  onAddHighlight,
  onManageHighlights,
}: Props) {
  const name = listingName ?? venue?.name ?? ''
  const path = explorePath ?? (venueId ? `/food/${venueId}` : '/')
  const channels = useMemo(
    () => channelsProp ?? (venue ? buildVenueStoryChannels(venue, { venuePath: path }) : []),
    [channelsProp, venue, path],
  )
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const activeChannel = channels.find((c) => c.id === activeChannelId) ?? null

  if (channels.length === 0) {
    if (!isOwner || (!onAddHighlight && !onManageHighlights)) return null
    return (
      <section
        className={`fd-venue-stories acc-detail__section hl-stories--empty${className ? ` ${className}` : ''}`}
        aria-labelledby="hl-stories-empty-title"
      >
        <HighlightEmptyState
          onAdd={onManageHighlights ?? onAddHighlight!}
          buttonLabel={onManageHighlights ? 'Create highlights' : 'Add highlight'}
          copy="Add highlight rings travellers can tap through — create, rename, and edit them anytime."
        />
      </section>
    )
  }

  return (
    <>
      <section
        className={`fd-venue-stories acc-detail__section${className ? ` ${className}` : ''}`}
        aria-labelledby="hl-stories-title"
      >
        <div className="fd-venue-stories__head ev-page__stories-head">
          <h2 id="hl-stories-title" className="ev-page__stories-title">
            {title}
          </h2>
          <span className="ev-page__stories-sub">{subtitle}</span>
        </div>
        <HighlightRings
          rings={channels.map((ch) => ({
            id: ch.id,
            label: ch.label,
            coverSrc: ch.coverSrc,
          }))}
          activeId={activeChannelId}
          onSelect={setActiveChannelId}
        />
        {isOwner && (onAddHighlight || onManageHighlights) ? (
          <div className="hl-stories__owner-actions">
            {onAddHighlight ? (
              <button type="button" className="hl-stories__add-btn" onClick={onAddHighlight}>
                Add highlight
              </button>
            ) : null}
            {onManageHighlights ? (
              <button type="button" className="hl-stories__add-btn hl-stories__manage-btn" onClick={onManageHighlights}>
                Manage highlights
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      <StoryViewer
        open={!!activeChannel}
        onClose={() => setActiveChannelId(null)}
        channelLabel={activeChannel ? `${name} · ${activeChannel.label}` : name}
        explorePath={path}
        slides={(activeChannel?.slides ?? []).map(highlightSlideToStorySlide)}
        ctaLabel={ctaLabel}
      />
    </>
  )
}

import { HighlightEmptyState } from './HighlightEmptyState'
