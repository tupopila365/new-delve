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
  Eye,
  Footprints,
  Heart,
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
import type { MockTrip, TripReflections } from '../../data/mockTrips'
import { apiFetch } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { postPermalinkPath } from '../../utils/postPermalink'
import { friendlyApiMessage } from '../../utils/friendlyError'
import { ReportButton } from '../report/ReportButton'
import {
  buildJourneyGallery,
  collectJourneyPhotos,
  formatJourneyCost,
  journeyHook,
  partyLabel,
  routeLabel,
} from '../../utils/journeyListing'
import { JourneyHero } from './JourneyHero'
import { JourneyDayByDay } from './JourneyDayByDay'
import { JourneyRouteRibbon } from './JourneyRouteRibbon'
import { JourneyBudgetBreakdown } from './JourneyBudgetBreakdown'
import { buildJourneyStoryChannels } from './journeyStoriesUtils'
import { JourneyDelversHighlightsSection } from './JourneyDelversHighlights'
import { JourneyReflections, JourneyTakeaway } from './JourneyReflections'
import { JourneyCreatorCard, JourneyCreatorMore } from './JourneyCreator'
import { HighlightAddFlow } from '../highlights/HighlightAddFlow'
import { HighlightManageSheet } from '../highlights/HighlightManageSheet'
import { MAX_HIGHLIGHT_CHANNELS, normalizeHighlightsForSave } from '../highlights/highlightFormUtils'
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

function formatViews(n?: number): string | null {
  if (!n || n <= 0) return null
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`
  return String(n)
}

type Props = {
  trip: MockTrip
  journeyId: string
  saved: boolean
  saveCount: number
  onSave: () => void
  onShare: () => void
  liked: boolean
  likeCount: number
  onLike: () => void
  likeBusy?: boolean
  saveBusy?: boolean
  similarJourneys: MockTrip[]
  creatorJourneys?: MockTrip[]
}

export function JourneyDetailView({
  trip,
  journeyId,
  saved,
  saveCount,
  onSave,
  onShare,
  liked,
  likeCount,
  onLike,
  likeBusy = false,
  saveBusy = false,
  similarJourneys,
  creatorJourneys = [],
}: Props) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const isAuthor = profile?.username === trip.author.username
  const [authorErr, setAuthorErr] = useState<string | null>(null)
  const [addHighlightOpen, setAddHighlightOpen] = useState(false)
  const [manageHighlightsOpen, setManageHighlightsOpen] = useState(false)
  const [savingHighlight, setSavingHighlight] = useState(false)
  const [savingReflections, setSavingReflections] = useState(false)
  const customHighlightChannels = trip.journey_stories ?? []
  const commentsSectionRef = useRef<HTMLElement>(null)
  const commentComposerRef = useRef<HTMLInputElement>(null)

  const photoItems = collectJourneyPhotos(trip)
  const route = routeLabel(trip)
  const accent = journeyAccentBadge(trip)
  const hook = journeyHook(trip)
  const galleryImages = buildJourneyGallery(trip, photoItems)
  const travelled = travelledLabel(trip)
  const viewsLabel = formatViews(trip.views_count)

  const storyChannels = useMemo(
    () => buildJourneyStoryChannels(trip, { journeyPath: `/journeys/${journeyId}` }),
    [trip, journeyId],
  )

  const transportFacts = trip.transport_modes.map((m) => {
    const { Icon, label } = transportMeta(m)
    return { id: m, label, Icon }
  })

  async function patchJourneyStories(next: HighlightChannelInput[], close: 'add' | 'manage') {
    setSavingHighlight(true)
    setAuthorErr(null)
    try {
      await apiFetch(`/api/journeys/${journeyId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ journey_stories: next }),
      })
      void qc.invalidateQueries({ queryKey: ['journey', journeyId] })
      void qc.invalidateQueries({ queryKey: ['journeys'] })
      if (close === 'add') setAddHighlightOpen(false)
      if (close === 'manage') setManageHighlightsOpen(false)
    } catch (error) {
      setAuthorErr(friendlyApiMessage(error, 'Could not save highlights.'))
    } finally {
      setSavingHighlight(false)
    }
  }

  async function saveJourneyHighlight(channel: HighlightChannelInput) {
    const existing = trip.journey_stories ?? []
    if (existing.length >= MAX_HIGHLIGHT_CHANNELS) {
      setAuthorErr(`You can keep up to ${MAX_HIGHLIGHT_CHANNELS} highlight rings. Manage highlights to edit or remove one.`)
      return
    }
    const next = normalizeHighlightsForSave([...existing, channel])
    await patchJourneyStories(next, 'add')
  }

  async function saveManagedHighlights(channels: HighlightChannelInput[]) {
    await patchJourneyStories(normalizeHighlightsForSave(channels), 'manage')
  }

  async function saveReflections(next: TripReflections) {
    setSavingReflections(true)
    setAuthorErr(null)
    try {
      await apiFetch(`/api/journeys/${journeyId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ reflections: next }),
      })
      void qc.invalidateQueries({ queryKey: ['journey', journeyId] })
    } catch (error) {
      setAuthorErr(friendlyApiMessage(error, 'Could not save reflections.'))
    } finally {
      setSavingReflections(false)
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
        liked={liked}
        saved={saved}
        likeBusy={likeBusy}
        saveBusy={saveBusy}
        onLike={onLike}
        onSave={onSave}
        onShare={onShare}
      />

      {/* Creator hub — avatar, name, journey count, Follow */}
      <div className="jd-head">
        <JourneyCreatorCard
          username={trip.author.username}
          displayName={trip.author.display_name || trip.author.username}
          avatar={trip.author.avatar}
          journeyCount={creatorJourneys.length + 1}
          isAuthor={isAuthor}
        />

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

      {/* Title, route, hook as an opening line, summary lead */}
      <div className="jd-titleblock">
        {accent ? <span className="jd-badge">{accent}</span> : null}
        <h1 className="jd-title">{trip.title}</h1>
        <p className="jd-route">
          <Route size={17} strokeWidth={2.25} aria-hidden />
          {route}
          {travelled ? <span className="jd-route__when"> · {travelled}</span> : null}
        </p>
        {hook ? <p className="jd-hook">{hook}</p> : null}
        {trip.summary?.trim() ? <p className="jd-lead">{trip.summary.trim()}</p> : null}
      </div>

      {/* Social engagement bar */}
      <div className="jd-engage" aria-label="Journey actions">
        <div className="jd-engage__primary">
          <button
            type="button"
            className={`jd-engage__btn jd-engage__btn--like${liked ? ' is-active' : ''}`}
            onClick={onLike}
            disabled={likeBusy}
            aria-label={liked ? 'Unlike journey' : 'Like journey'}
            aria-pressed={liked}
          >
            <Heart size={22} strokeWidth={2.25} fill={liked ? 'currentColor' : 'none'} aria-hidden />
            <span className="jd-engage__count">{likeCount}</span>
          </button>
          <button
            type="button"
            className="jd-engage__btn"
            onClick={openComments}
            aria-label={`${trip.comments_count} comments — view and write comments`}
          >
            <MessageCircle size={22} strokeWidth={2.25} aria-hidden />
            <span className="jd-engage__count">{trip.comments_count}</span>
          </button>
          <button type="button" className="jd-engage__btn" onClick={onShare} aria-label="Share journey">
            <Share2 size={22} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
        <div className="jd-engage__secondary">
          <button
            type="button"
            className={`jd-engage__btn jd-engage__btn--save${saved ? ' is-active' : ''}`}
            onClick={onSave}
            disabled={saveBusy}
            aria-label={saved ? 'Remove saved journey' : 'Save journey'}
            aria-pressed={saved}
          >
            <Bookmark size={22} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
            <span className="jd-engage__count">{saveCount}</span>
          </button>
        </div>
      </div>

      {authorErr ? (
        <p className="jd-err" role="alert">
          {authorErr}
        </p>
      ) : null}

      {/* At-a-glance facts + views */}
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
        {viewsLabel ? (
          <li className="jd-fact jd-fact--views">
            <Eye size={15} strokeWidth={2.25} aria-hidden />
            {viewsLabel} views
          </li>
        ) : null}
        <li className="jd-fact jd-fact--cost">{formatJourneyCost(trip.total_cost, trip.currency)} total</li>
      </ul>

      {/* Route ribbon */}
      <JourneyRouteRibbon stops={trip.stops} className="jn-detail__ribbon" />

      {/* Route highlights & moments (story rings) */}
      <JourneyDelversHighlightsSection
        trip={trip}
        channels={storyChannels}
        explorePath={`/journeys/${journeyId}`}
        title="Along the way"
        subtitle="Route highlights, moments & tips"
        ctaLabel="View journey"
        className="jd-stories"
        isOwner={isAuthor}
        onAddHighlight={
          customHighlightChannels.length < MAX_HIGHLIGHT_CHANNELS
            ? () => setAddHighlightOpen(true)
            : undefined
        }
        onManageHighlights={() => setManageHighlightsOpen(true)}
      />

      <HighlightAddFlow
        open={addHighlightOpen}
        onClose={() => setAddHighlightOpen(false)}
        onSave={saveJourneyHighlight}
        saving={savingHighlight}
      />

      <HighlightManageSheet
        open={manageHighlightsOpen}
        channels={customHighlightChannels}
        onClose={() => setManageHighlightsOpen(false)}
        onSave={saveManagedHighlights}
        saving={savingHighlight}
      />

      {/* One immersive diary (route + day-by-day merged) */}
      <JourneyDayByDay
        stops={trip.stops}
        tags={trip.tags}
        className="jn-detail__diary"
        isAuthor={isAuthor}
        onShareEntry={isAuthor ? shareEntryOnDelvers : undefined}
      />

      {/* Author reflections */}
      <JourneyReflections
        reflections={trip.reflections}
        isAuthor={isAuthor}
        saving={savingReflections}
        onSave={saveReflections}
        className="jn-detail__reflect"
      />

      <JourneyBudgetBreakdown
        totalCost={trip.total_cost}
        days={trip.days}
        costs={trip.costs}
        currency={trip.currency}
        className="jn-detail__budget"
      />

      {/* Closing takeaway */}
      <JourneyTakeaway text={trip.reflections?.takeaway} className="jn-detail__takeaway" />

      <JourneyCommentsSection
        journeyId={journeyId}
        sectionRef={commentsSectionRef}
        composerRef={commentComposerRef}
        className="jn-detail__comments"
      />

      {/* More from the creator */}
      <JourneyCreatorMore
        journeys={creatorJourneys}
        displayName={trip.author.display_name || trip.author.username}
        username={trip.author.username}
        className="jn-detail__creator-more"
      />

      <JourneyInspirationGrid journeys={similarJourneys} className="jn-detail__inspiration" />

      {/* Mobile action bar */}
      <div className="jd-mobilebar">
        <span className="jd-mobilebar__meta">
          <span className="jd-mobilebar__title">{trip.title}</span>
          <span className="jd-mobilebar__sub">{route}</span>
        </span>
        <div className="jd-mobilebar__actions">
          <button
            type="button"
            className={`jd-mobilebar__icon jd-mobilebar__icon--like${liked ? ' is-active' : ''}`}
            onClick={onLike}
            disabled={likeBusy}
            aria-label={liked ? 'Unlike journey' : 'Like journey'}
            aria-pressed={liked}
          >
            <Heart size={20} strokeWidth={2.25} fill={liked ? 'currentColor' : 'none'} aria-hidden />
          </button>
          <button
            type="button"
            className="jd-mobilebar__icon"
            onClick={onShare}
            aria-label="Share journey"
          >
            <Share2 size={20} strokeWidth={2.25} aria-hidden />
          </button>
          <button
            type="button"
            className={`jd-mobilebar__btn${saved ? ' jd-mobilebar__btn--saved' : ''}`}
            onClick={onSave}
            disabled={saveBusy}
            aria-pressed={saved}
          >
            <Bookmark size={16} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </>
  )
}
