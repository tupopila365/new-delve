import { useEffect, useMemo, useState } from 'react'
import type { MockTrip } from '../../data/mockTrips'
import type { HighlightChannel } from '../highlights/types'
import { HighlightRings } from '../highlights/HighlightRings'
import { HighlightEmptyState } from '../highlights/HighlightEmptyState'
import { DelversStoryViewer } from '../social/DelversStoryViewer'
import {
  journeyChannelsToStoryTargets,
  journeyToStoryTarget,
} from '../../utils/journeyDelversStories'
import '../food/stories/venue-stories.css'

type SectionProps = {
  trip: MockTrip
  channels: HighlightChannel[]
  explorePath: string
  title?: string
  subtitle?: string
  ctaLabel?: string
  className?: string
  isOwner?: boolean
  onAddHighlight?: () => void
  onManageHighlights?: () => void
}

/** Journey detail rings + DelversStoryViewer (same chrome as Delvers highlights). */
export function JourneyDelversHighlightsSection({
  trip,
  channels,
  explorePath,
  title = 'Along the way',
  subtitle = 'Tap a highlight to watch',
  ctaLabel = 'View journey',
  className,
  isOwner = false,
  onAddHighlight,
  onManageHighlights,
}: SectionProps) {
  const targets = useMemo(() => journeyChannelsToStoryTargets(trip, channels), [trip, channels])
  const [ringIndex, setRingIndex] = useState<number | null>(null)
  const [slideIndex, setSlideIndex] = useState(0)
  const active = ringIndex != null ? targets[ringIndex] ?? null : null

  if (channels.length === 0) {
    if (!isOwner || (!onAddHighlight && !onManageHighlights)) return null
    return (
      <section
        className={`fd-venue-stories acc-detail__section hl-stories--empty${className ? ` ${className}` : ''}`}
        aria-labelledby="jn-hl-empty-title"
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
        aria-labelledby="jn-hl-title"
      >
        <div className="fd-venue-stories__head ev-page__stories-head">
          <h2 id="jn-hl-title" className="ev-page__stories-title">
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
          activeId={ringIndex != null ? channels[ringIndex]?.id ?? null : null}
          onSelect={(id) => {
            const next = channels.findIndex((ch) => ch.id === id)
            if (next < 0) return
            setRingIndex(next)
            setSlideIndex(0)
          }}
        />
        {isOwner && (onAddHighlight || onManageHighlights) ? (
          <div className="hl-stories__owner-actions">
            {onAddHighlight ? (
              <button type="button" className="hl-stories__add-btn" onClick={onAddHighlight}>
                Add highlight
              </button>
            ) : null}
            {onManageHighlights ? (
              <button
                type="button"
                className="hl-stories__add-btn hl-stories__manage-btn"
                onClick={onManageHighlights}
              >
                Manage highlights
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      {active && ringIndex != null ? (
        <DelversStoryViewer
          target={active}
          index={slideIndex}
          onIndex={setSlideIndex}
          onClose={() => {
            setRingIndex(null)
            setSlideIndex(0)
          }}
          onRingComplete={() => {
            if (ringIndex >= targets.length - 1) {
              setRingIndex(null)
              setSlideIndex(0)
              return
            }
            setRingIndex(ringIndex + 1)
            setSlideIndex(0)
          }}
          canLeaveToPrevRing={ringIndex > 0}
          onLeaveToPrevRing={() => {
            setRingIndex(Math.max(0, ringIndex - 1))
            setSlideIndex(0)
          }}
          canSwipeToNextRing={ringIndex < targets.length - 1}
          onSwipeToNextRing={() => {
            setRingIndex(Math.min(targets.length - 1, ringIndex + 1))
            setSlideIndex(0)
          }}
          interactions="view-only"
          explorePath={explorePath}
          ctaLabel={ctaLabel}
        />
      ) : null}
    </>
  )
}

type ListProps = {
  trips: MockTrip[]
  activeIndex: number | null
  onActiveIndex: (index: number | null) => void
}

/** Journeys list — open Delvers-style viewer across recent journey rings. */
export function JourneyListDelversViewer({ trips, activeIndex, onActiveIndex }: ListProps) {
  const targets = useMemo(() => trips.map(journeyToStoryTarget), [trips])
  const [slideIndex, setSlideIndex] = useState(0)
  const active = activeIndex != null ? targets[activeIndex] ?? null : null
  const trip = activeIndex != null ? trips[activeIndex] ?? null : null

  useEffect(() => {
    setSlideIndex(0)
  }, [activeIndex])

  if (!active || activeIndex == null || !trip) return null

  return (
    <DelversStoryViewer
      target={active}
      index={slideIndex}
      onIndex={setSlideIndex}
      onClose={() => {
        onActiveIndex(null)
        setSlideIndex(0)
      }}
      onRingComplete={() => {
        if (activeIndex >= targets.length - 1) {
          onActiveIndex(null)
          setSlideIndex(0)
          return
        }
        onActiveIndex(activeIndex + 1)
        setSlideIndex(0)
      }}
      canLeaveToPrevRing={activeIndex > 0}
      onLeaveToPrevRing={() => {
        onActiveIndex(Math.max(0, activeIndex - 1))
        setSlideIndex(0)
      }}
      canSwipeToNextRing={activeIndex < targets.length - 1}
      onSwipeToNextRing={() => {
        onActiveIndex(Math.min(targets.length - 1, activeIndex + 1))
        setSlideIndex(0)
      }}
      interactions="view-only"
      explorePath={`/journeys/${trip.id}`}
      ctaLabel="View journey"
    />
  )
}
