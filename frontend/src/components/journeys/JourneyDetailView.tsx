import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'
import {
  ArrowRight,
  Bike,
  Bookmark,
  Bus,
  CalendarDays,
  Car,
  Footprints,
  Heart,
  Info,
  Map,
  MapPin,
  MessageCircle,
  Pencil,
  Plane,
  Route,
  Ship,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import type { MockTrip } from '../../data/mockTrips'
import { apiFetch } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { postPermalinkPath } from '../../utils/postPermalink'
import { friendlyApiMessage } from '../../utils/friendlyError'
import { DetailLayout } from '../detail'
import {
  ListingBookBar,
  ListingDetails,
  ListingHeroGallery,
  ListingHighlights,
  ListingIdentityHeader,
  ListingQuickInfo,
} from '../listing'
import { ListingQuestionsSection } from '../listing/ListingQuestionsSection'
import {
  buildJourneyDetailRows,
  buildJourneyGallery,
  buildJourneyTrustHighlights,
  collectJourneyPhotos,
  formatJourneyCost,
  partyLabel,
  routeLabel,
} from '../../utils/journeyListing'
import { JourneyRouteStops } from './JourneyRouteStops'
import { JourneyDayByDay } from './JourneyDayByDay'
import { JourneyBudgetBreakdown } from './JourneyBudgetBreakdown'
import { buildJourneyStoryChannels } from './journeyStoriesUtils'
import { VenueStoriesSection } from '../food/stories'
import { journeyAccentBadge } from '../../utils/journeyDisplay'
import { messageProviderPath } from '../messages/messageProviderUtils'

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
  const photoItems = collectJourneyPhotos(trip)
  const route = routeLabel(trip)
  const accent = journeyAccentBadge(trip)
  const galleryImages = buildJourneyGallery(trip, photoItems)
  const trustHighlights = buildJourneyTrustHighlights(trip)
  const storyRows = buildJourneyDetailRows(trip)

  const practicalTips = trip.stops
    .map((s) => s.notes?.trim())
    .filter((n): n is string => !!n)
    .slice(0, 4)

  const storyChannels = useMemo(
    () => buildJourneyStoryChannels(trip, { journeyPath: `/journeys/${journeyId}` }),
    [trip, journeyId],
  )

  const tipHighlights = practicalTips.map((tip, i) => ({
    id: `tip-${i}`,
    label: tip,
    icon: <Info size={16} strokeWidth={2.25} aria-hidden />,
  }))

  const transportChips = trip.transport_modes.map((m) => {
    const { Icon, label } = transportMeta(m)
    return {
      id: m,
      label,
      icon: <Icon size={15} strokeWidth={2.25} aria-hidden />,
    }
  })

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

  const headerActions = [
    ...(isAuthor
      ? [
          {
            id: 'edit',
            label: 'Edit journey',
            icon: <Pencil size={14} strokeWidth={2.25} aria-hidden />,
            href: `/journeys/${journeyId}/edit`,
          },
          {
            id: 'delete',
            label: 'Delete',
            icon: <Trash2 size={14} strokeWidth={2.25} aria-hidden />,
            onClick: () => void deleteJourney(),
          },
        ]
      : []),
    {
      id: 'like',
      label: liked ? `Liked · ${likeCount}` : `Like · ${likeCount}`,
      icon: <Heart size={14} strokeWidth={2.25} fill={liked ? 'currentColor' : 'none'} aria-hidden />,
      onClick: onLike,
      accent: liked,
    },
    ...(isAuthor
      ? []
      : [
          {
            id: 'message-creator',
            label: 'Message creator',
            icon: <MessageCircle size={14} strokeWidth={2.25} aria-hidden />,
            href: messageProviderPath(trip.author.username),
            accent: true,
          },
        ]),
  ]

  return (
    <>
      <ListingHeroGallery
        className="jn-detail__gallery-wrap acc-detail__gallery-wrap"
        images={galleryImages}
        listingType="journey"
        listingId={journeyId}
        backTo="/journeys"
        backLabel="Journeys"
        saved={saved}
        onSave={onSave}
        onShare={onShare}
      />

      <ListingIdentityHeader
        name={trip.title}
        tagline={`Created by @${trip.author.username}`}
        categoryLabel={accent ? `${accent} · Journey` : 'Journey'}
        locationLabel={route}
        saved={saved}
        onSave={onSave}
        onShare={onShare}
        reportTarget={{
          target_type: 'journey',
          target_id: journeyId,
          target_label: trip.title,
        }}
        actions={headerActions}
        className="jn-detail__identity acc-detail__identity"
      />

      {authorErr ? (
        <p className="ce-form__err" role="alert">
          {authorErr}
        </p>
      ) : null}

      <div className="jn-detail__intro">
        <VenueStoriesSection
          listingName={trip.title}
          explorePath={`/journeys/${journeyId}`}
          channels={storyChannels}
          title="Along the way"
          subtitle="Route highlights, moments & tips"
          ctaLabel="View journey"
          className="jn-detail__stories"
        />

        <ListingQuickInfo
          chips={[
            {
              id: 'days',
              label: `${trip.days} days`,
              icon: <CalendarDays size={15} strokeWidth={2.25} aria-hidden />,
            },
            {
              id: 'stops',
              label: `${trip.stops.length} ${trip.stops.length === 1 ? 'stop' : 'stops'}`,
              icon: <MapPin size={15} strokeWidth={2.25} aria-hidden />,
            },
            {
              id: 'party',
              label: partyLabel(trip.party),
              icon: <Users size={15} strokeWidth={2.25} aria-hidden />,
            },
            ...transportChips,
            {
              id: 'cost',
              label: `${formatJourneyCost(trip.total_cost)} total`,
              accent: true,
            },
          ]}
          highlights={trustHighlights}
          className="jn-detail__quick-info acc-detail__quick-info"
        />
      </div>

      <DetailLayout
        main={
          <>
            {trip.summary?.trim() || storyRows.length > 0 ? (
              <ListingDetails
                title="The story"
                description={trip.summary?.trim() || null}
                rows={storyRows.map((row) => ({
                  ...row,
                  icon:
                    row.id === 'when' ? (
                      <CalendarDays size={14} strokeWidth={2.25} aria-hidden />
                    ) : row.id === 'countries' ? (
                      <MapPin size={14} strokeWidth={2.25} aria-hidden />
                    ) : (
                      <Route size={14} strokeWidth={2.25} aria-hidden />
                    ),
                }))}
                className="jn-detail__story acc-detail__about"
              />
            ) : null}

            <JourneyRouteStops stops={trip.stops} tags={trip.tags} className="jn-detail__route acc-detail__section" />

            <JourneyDayByDay
              stops={trip.stops}
              className="jn-detail__diary acc-detail__section"
              isAuthor={isAuthor}
              onShareEntry={isAuthor ? shareEntryOnDelvers : undefined}
            />

            {tipHighlights.length > 0 ? (
              <ListingHighlights
                title="Practical tips"
                items={tipHighlights}
                className="jn-detail__tips acc-detail__love"
              />
            ) : null}

            <JourneyBudgetBreakdown
              totalCost={trip.total_cost}
              days={trip.days}
              costs={trip.costs}
              currency={trip.currency}
              className="jn-detail__budget acc-detail__section"
            />

            <ListingQuestionsSection
              className="jn-detail__questions acc-detail__comments"
              questionsPath={`/api/journeys/${journeyId}/questions/`}
              answerPath={(questionId) => `/api/journeys/questions/${questionId}/answers/`}
              queryKey={['journey-questions', journeyId]}
              title="Questions and travel tips"
              placeholder="How much was fuel? Where did you stay? Was a 4x4 required?"
              canAnswer={isAuthor}
              officialLabel="Creator"
              invalidateKeys={[['me-journey-questions']]}
            />

            {similarJourneys.length > 0 ? (
              <section className="detail-section td-similar acc-detail__section">
                <h2 className="td-section-title listing-section__title">More inspiration</h2>
                <div className="td-similar__grid">
                  {similarJourneys.map((j) => (
                    <Link key={j.id} to={`/journeys/${j.id}`} className="td-similar__card">
                      {j.cover_image ? (
                        <img src={j.cover_image} alt={j.title} />
                      ) : (
                        <div className="td-similar__placeholder" aria-hidden>
                          <Map size={24} strokeWidth={1.75} />
                        </div>
                      )}
                      <div>
                        <p className="td-similar__title">{j.title}</p>
                        <p className="td-similar__meta">
                          <MapPin size={12} strokeWidth={2.25} aria-hidden />
                          {routeLabel(j)}
                        </p>
                        <p className="td-similar__creator">
                          <UserRound size={11} strokeWidth={2.25} aria-hidden />
                          {j.author.display_name}
                        </p>
                      </div>
                      <ArrowRight size={16} strokeWidth={2.5} className="td-similar__arrow" aria-hidden />
                    </Link>
                  ))}
                </div>
              </section>
            ) : (
              <section className="detail-section td-similar td-similar--empty acc-detail__section">
                <Link to="/journeys" className="btn btn-primary">
                  <Route size={15} strokeWidth={2.25} aria-hidden />
                  Browse more journeys
                </Link>
              </section>
            )}
          </>
        }
      />

      <ListingBookBar
        title={trip.title}
        subtitle={route}
        action={
          <button type="button" className="btn btn-primary" onClick={onSave}>
            <Bookmark size={15} strokeWidth={2.25} aria-hidden />
            {saved ? 'Saved' : 'Save journey'}
          </button>
        }
        className="jn-detail__mobile-bar acc-detail__mobile-bar"
      />
    </>
  )
}