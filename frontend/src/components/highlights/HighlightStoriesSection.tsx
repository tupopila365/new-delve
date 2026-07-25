import { useMemo, useState } from 'react'
import { Layers, Play } from 'lucide-react'
import { StoryViewer } from '../StoryViewer'
import type { FoodVenueListing } from '../../utils/foodListing'
import { buildVenueStoryChannels } from '../food/stories/venueStoriesUtils'
import type { HighlightChannel } from './types'
import { HighlightRings } from './HighlightRings'
import { HighlightEmptyState } from './HighlightEmptyState'
import { highlightSlideToStorySlide } from './highlightStoriesUtils'
import '../food/stories/venue-stories.css'
import './stay-highlights.css'

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
  /**
   * `rings` — classic story circles.
   * `media` — stay-style tiles that preview photos and videos.
   */
  variant?: 'rings' | 'media'
}

function channelHasVideo(channel: HighlightChannel): boolean {
  return channel.coverKind === 'video' || channel.slides.some((s) => s.kind === 'video')
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
  variant = 'rings',
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

  const sectionClass =
    variant === 'media'
      ? `stay-highlights acc-detail__section${className ? ` ${className}` : ''}`
      : `fd-venue-stories acc-detail__section${className ? ` ${className}` : ''}`

  return (
    <>
      <section className={sectionClass} aria-labelledby="hl-stories-title">
        <div className={variant === 'media' ? 'stay-highlights__head' : 'fd-venue-stories__head ev-page__stories-head'}>
          <h2 id="hl-stories-title" className={variant === 'media' ? 'stay-highlights__title' : 'ev-page__stories-title'}>
            {title}
          </h2>
          {subtitle ? (
            <span className={variant === 'media' ? 'stay-highlights__sub' : 'ev-page__stories-sub'}>{subtitle}</span>
          ) : null}
        </div>

        {variant === 'media' ? (
          <div className="stay-highlights__strip" role="list">
            {channels.map((ch) => {
              const isVideoCover = ch.coverKind === 'video'
              const hasVideo = channelHasVideo(ch)
              const slideCount = ch.slides.length
              return (
                <button
                  key={ch.id}
                  type="button"
                  role="listitem"
                  className={`stay-highlights__tile${activeChannelId === ch.id ? ' stay-highlights__tile--active' : ''}`}
                  onClick={() => setActiveChannelId(ch.id)}
                  aria-label={`Open ${ch.label} highlight${hasVideo ? ' with video' : ''}`}
                  aria-pressed={activeChannelId === ch.id}
                >
                  <span className="stay-highlights__media">
                    {isVideoCover ? (
                      <video
                        src={`${ch.coverSrc}#t=0.1`}
                        muted
                        playsInline
                        preload="metadata"
                        className="stay-highlights__cover"
                        aria-hidden
                      />
                    ) : (
                      <img src={ch.coverSrc} alt="" loading="lazy" className="stay-highlights__cover" />
                    )}
                    <span className="stay-highlights__scrim" aria-hidden />
                    {hasVideo ? (
                      <span className="stay-highlights__play" aria-hidden>
                        <Play size={16} strokeWidth={2.5} fill="currentColor" />
                      </span>
                    ) : null}
                    {slideCount > 1 ? (
                      <span className="stay-highlights__count" aria-hidden>
                        <Layers size={12} strokeWidth={2.25} />
                        {slideCount}
                      </span>
                    ) : null}
                  </span>
                  <span className="stay-highlights__label">{ch.label}</span>
                </button>
              )
            })}
          </div>
        ) : (
          <HighlightRings
            rings={channels.map((ch) => ({
              id: ch.id,
              label: ch.label,
              coverSrc: ch.coverSrc,
              coverKind: ch.coverKind,
            }))}
            activeId={activeChannelId}
            onSelect={setActiveChannelId}
          />
        )}

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
