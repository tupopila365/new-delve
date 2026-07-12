import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'
import {
  Bike,
  Bookmark,
  Bus,
  CalendarDays,
  Car,
  Footprints,
  Heart,
  Info,
  MapPin,
  MessageCircle,
  Pencil,
  Plane,
  Route,
  Share2,
  Ship,
  Trash2,
  Users,
} from 'lucide-react'
import type { MockTrip } from '../../data/mockTrips'
import { apiFetch } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { postPermalinkPath } from '../../utils/postPermalink'
import { friendlyApiMessage } from '../../utils/friendlyError'
import { ReportButton } from '../report/ReportButton'
import {
  buildJourneyDetailRows,
  buildJourneyGallery,
  collectJourneyPhotos,
  formatJourneyCost,
  journeyHook,
  partyLabel,
  routeLabel,
} from '../../utils/journeyListing'
import { JourneyHero } from './JourneyHero'
import { JourneySection } from './JourneySection'
import { JourneyRouteStops } from './JourneyRouteStops'
import { JourneyDayByDay } from './JourneyDayByDay'
import { JourneyBudgetBreakdown } from './JourneyBudgetBreakdown'
import { buildJourneyStoryChannels } from './journeyStoriesUtils'
import { HighlightStoriesSection } from '../highlights/HighlightStoriesSection'
import { HighlightAddFlow } from '../highlights/HighlightAddFlow'
import { normalizeHighlightsForSave } from '../highlights/highlightFormUtils'
import type { HighlightChannelInput } from '../highlights/types'
import { journeyAccentBadge } from '../../utils/journeyDisplay'
import { JourneyInspirationGrid } from './JourneyInspirationGrid'
import { JourneyCommentsSection } from './JourneyCommentsSection'
import { messageProviderPath } from '../messages/messageProviderUtils'
import './journey-detail.css'

const TRANSPORT_ICONS: Record<string, ComponentType<LucideProps>> = {
  car: Car,
  bus: Bus,
  boat: Ship,
  flight: Plane,
  bike: Bike,
  walk: Footprints,
}

const TRANSPORT_LABELS: Record<string, string> = {
  car: 'Car',
  bus: 'Bus',
  boat: 'Boat',
  flight: 'Flight',
  bike: 'Bike',
  walk: 'On foot',
}

function transportMeta(mode: string) {
  const Icon = TRANSPORT_ICONS[mode] ?? Route
  const label = TRANSPORT_LABELS[mode] ?? mode
  return { Icon, label }
}

function travelledLabel(trip: MockTrip) {
  if (!trip.starts_on) return null
  const start = new Date(trip.starts_on)
  if (Number.isNaN(start.getTime())) return null
  return `Travelled ${start.toLocaleDateString('en-NA', { month: 'long', year: 'numeric' })}`
}

type Props = {
  trip: MockTrip
  journeyId: string
  saved: boolean
  onSave: () => void
  onShare: () => void
  liked: boolean
  likeCount: number
  onLike: () => void
  similarJourneys: MockTrip[]
}

export function JourneyDetailView({
  trip,
  journeyId,
  saved,
  onSave,
  onShare,
  liked,
  likeCount,
  onLike,
  similarJourneys,
}: Props) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const isAuthor = profile?.username === trip.author.username
  const [authorErr, setAuthorErr] = useState<string | null>(null)
  const [addHighlightOpen, setAddHighlightOpen] = useState(false)
  const [savingHighlight, setSavingHighlight] = useState(false)
  const commentsSectionRef = useRef<HTMLElement>(null)
  const commentComposerRef = useRef<HTMLInputElement>(null)

  const photoItems = collectJourneyPhotos(trip)
  const route = routeLabel(trip)
  const accent = journeyAccentBadge(trip)
  const hook = journeyHook(trip)
  const galleryImages = buildJourneyGallery(trip, photoItems)
  const storyRows = buildJourneyDetailRows(trip)
  const travelled = travelledLabel(trip)
  const authorInitial = (trip.author.display_name || trip.author.username || '?').charAt(0).toUpperCase()

  const practicalTips = trip.stops
    .map((s) => s.notes?.trim())
    .filter((n): n is string => !!n)
    .slice(0, 4)

  const storyChannels = useMemo(
    () => buildJourneyStoryChannels(trip, { journeyPath: `/journeys/${journeyId}` }),
    [trip, journeyId],
  )

  const transportFacts = trip.transport_modes.map((m) => {
    const { Icon, label } = transportMeta(m)
    return { id: m, label, Icon }
  })

  async function saveJourneyHighlight(channel: HighlightChannelInput) {
    setSavingHighlight(true)
    setAuthorErr(null)
    try {
      const next = normalizeHighlightsForSave([...(trip.journey_stories ?? []), channel])
      await apiFetch(`/api/journeys/${journeyId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ journey_stories: next }),
      })
      void qc.invalidateQueries({ queryKey: ['journey', journeyId] })
      void qc.invalidateQueries({ queryKey: ['journeys'] })
      setAddHighlightOpen(false)
    } catch (error) {
      setAuthorErr(friendlyApiMessage(error, 'Could not save this highlight.'))
    } finally {
      setSavingHighlight(false)
    }
  }

  async function deleteJourney() {
    if (!window.confirm('Delete this journey permanently? This cannot be undone.')) return
    setAuthorErr(null)
    try {
      await apiFetch(`/api/journeys/${journeyId}/`, { method: 'DELETE' })
      void qc.invalidateQueries({ queryKey: ['journeys'] })
      void qc.invalidateQueries({ queryKey: ['user-journeys'] })
      void qc.invalidateQueries({ queryKey: ['journey', journeyId] })
      navigate(`/u/${trip.author.username}`)
    } catch (error) {
      setAuthorErr(friendlyApiMessage(error, 'Could not delete this journey.'))
    }
  }

  async function shareEntryOnDelvers(entryId: number) {
    setAuthorErr(null)
    try {
      const post = await apiFetch<{ id: number }>(`/api/journeys/entries/${entryId}/share/`, {
        method: 'POST',
      })
      navigate(postPermalinkPath(post.id))
    } catch (error) {
      setAuthorErr(friendlyApiMessage(error, 'Could not share this moment on Delvers.'))
    }
  }

  function openComments() {
    commentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => commentComposerRef.current?.focus(), 450)
  }

  return (
    <>
      <JourneyHero
        images={galleryImages}
        backTo="/journeys"
        backLabel="Journeys"
        saved={saved}
        onSave={onSave}
        onShare={onShare}
      />

      {/* Who took this trip — signals "someone's journey", not a listing */}
      <div className="jd-head">
        <Link to={`/u/${trip.author.username}`} className="jd-author">
          {trip.author.avatar ? (
            <img className="jd-author__avatar" src={trip.author.avatar} alt="" />
          ) : (
            <span className="jd-author__avatar jd-author__avatar--fallback" aria-hidden>
              {authorInitial}
            </span>
          )}
          <span className="jd-author__copy">
            <span className="jd-author__name">{trip.author.display_name || trip.author.username}</span>
            <span className="jd-author__sub">
              @{trip.author.username}
              {travelled ? ` · ${travelled}` : ''}
            </span>
          </span>
        </Link>

        <div className="jd-head__actions">
          {isAuthor ? (
            <>
              <Link to={`/journeys/${journeyId}/edit`} className="jd-btn">
                <Pencil size={14} strokeWidth={2.25} aria-hidden />
                <span className="jd-btn--label">Edit</span>
              </Link>
              <button type="button" className="jd-btn jd-btn--danger jd-btn--icon" onClick={() => void deleteJourney()} aria-label="Delete journey">
                <Trash2 size={14} strokeWidth={2.25} aria-hidden />
              </button>
            </>
          ) : (
            <Link to={messageProviderPath(trip.author.username)} className="jd-btn jd-btn--primary">
              <MessageCircle size={14} strokeWidth={2.25} aria-hidden />
              <span className="jd-btn--label">Message</span>
            </Link>
          )}
          <ReportButton
            className="jd-btn jd-btn--icon"
            iconOnly
            triggerLabel="Report journey"
            target={{ target_type: 'journey', target_id: journeyId, target_label: trip.title }}
          />
        </div>
      </div>

      {/* Title, route, hook */}
      <div className="jd-titleblock">
        {accent ? <span className="jd-badge">{accent}</span> : null}
        <h1 className="jd-title">{trip.title}</h1>
        <p className="jd-route">
          <Route size={17} strokeWidth={2.25} aria-hidden />
          {route}
        </p>
        {hook ? <p className="jd-hook">{hook}</p> : null}
      </div>

      {/* Social engagement bar */}
      <div className="jd-engage">
        <button
          type="button"
          className={`jd-engage__btn${liked ? ' jd-engage__btn--liked' : ''}`}
          onClick={onLike}
          aria-pressed={liked}
        >
          <Heart size={18} strokeWidth={2.25} fill={liked ? 'currentColor' : 'none'} aria-hidden />
          {likeCount}
        </button>
        <button
          type="button"
          className={`jd-engage__btn${saved ? ' jd-engage__btn--saved' : ''}`}
          onClick={onSave}
          aria-pressed={saved}
        >
          <Bookmark size={18} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          {saved ? 'Saved' : trip.saves_count}
        </button>
        <button
          type="button"
          className="jd-engage__btn jd-engage__btn--comments"
          onClick={openComments}
          aria-label={`${trip.comments_count} comments — view and write comments`}
        >
          <MessageCircle size={18} strokeWidth={2.25} aria-hidden />
          {trip.comments_count}
        </button>
        <span className="jd-engage__spacer" />
        <button type="button" className="jd-engage__btn" onClick={onShare}>
          <Share2 size={17} strokeWidth={2.25} aria-hidden />
          Share
        </button>
      </div>

      {authorErr ? (
        <p className="jd-err" role="alert">
          {authorErr}
        </p>
      ) : null}

      {/* At-a-glance facts */}
      <ul className="jd-facts">
        <li className="jd-fact">
          <CalendarDays size={15} strokeWidth={2.25} aria-hidden />
          {trip.days} days
        </li>
        <li className="jd-fact">
          <MapPin size={15} strokeWidth={2.25} aria-hidden />
          {trip.stops.length} {trip.stops.length === 1 ? 'stop' : 'stops'}
        </li>
        <li className="jd-fact">
          <Users size={15} strokeWidth={2.25} aria-hidden />
          {partyLabel(trip.party)}
        </li>
        {transportFacts.map(({ id, label, Icon }) => (
          <li key={id} className="jd-fact">
            <Icon size={15} strokeWidth={2.25} aria-hidden />
            {label}
          </li>
        ))}
        <li className="jd-fact jd-fact--cost">{formatJourneyCost(trip.total_cost, trip.currency)} total</li>
      </ul>

      {/* Route highlights & moments */}
      <HighlightStoriesSection
        listingName={trip.title}
        explorePath={`/journeys/${journeyId}`}
        channels={storyChannels}
        title="Along the way"
        subtitle="Route highlights, moments & tips"
        ctaLabel="View journey"
        className="jd-stories"
        isOwner={isAuthor}
        onAddHighlight={() => setAddHighlightOpen(true)}
      />

      <HighlightAddFlow
        open={addHighlightOpen}
        onClose={() => setAddHighlightOpen(false)}
        onSave={saveJourneyHighlight}
        saving={savingHighlight}
      />

      {trip.summary?.trim() || storyRows.length > 0 ? (
        <JourneySection title="The story">
          {trip.summary?.trim() ? <p className="jd-story__lead">{trip.summary.trim()}</p> : null}
          {storyRows.length > 0 ? (
            <ul className="jd-story__rows">
              {storyRows.map((row) => (
                <li key={row.id} className="jd-story__row">
                  <span className="jd-story__row-label">
                    {row.id === 'when' ? (
                      <CalendarDays size={14} strokeWidth={2.25} aria-hidden />
                    ) : row.id === 'countries' ? (
                      <MapPin size={14} strokeWidth={2.25} aria-hidden />
                    ) : (
                      <Route size={14} strokeWidth={2.25} aria-hidden />
                    )}
                    {row.label}
                  </span>
                  <span className="jd-story__row-value">{row.value}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </JourneySection>
      ) : null}

      <JourneyRouteStops stops={trip.stops} tags={trip.tags} className="jn-detail__route" />

      <JourneyDayByDay
        stops={trip.stops}
        className="jn-detail__diary"
        isAuthor={isAuthor}
        onShareEntry={isAuthor ? shareEntryOnDelvers : undefined}
      />

      {practicalTips.length > 0 ? (
        <JourneySection title="Practical tips">
          <ul className="jd-tips">
            {practicalTips.map((tip, i) => (
              <li key={`tip-${i}`} className="jd-tip">
                <Info size={16} strokeWidth={2.25} aria-hidden />
                {tip}
              </li>
            ))}
          </ul>
        </JourneySection>
      ) : null}

      <JourneyBudgetBreakdown
        totalCost={trip.total_cost}
        days={trip.days}
        costs={trip.costs}
        currency={trip.currency}
        className="jn-detail__budget"
      />

      <JourneyCommentsSection
        journeyId={journeyId}
        sectionRef={commentsSectionRef}
        composerRef={commentComposerRef}
        className="jn-detail__comments"
      />

      <JourneyInspirationGrid journeys={similarJourneys} className="jn-detail__inspiration" />

      {/* Mobile action bar */}
      <div className="jd-mobilebar">
        <span className="jd-mobilebar__meta">
          <span className="jd-mobilebar__title">{trip.title}</span>
          <span className="jd-mobilebar__sub">{route}</span>
        </span>
        <button type="button" className="jd-mobilebar__btn" onClick={onSave}>
          <Bookmark size={16} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          {saved ? 'Saved' : 'Save journey'}
        </button>
      </div>
    </>
  )
}
