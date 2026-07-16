import type { SyntheticEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Map, Users } from 'lucide-react'
import type { MockTrip } from '../../data/mockTrips'
import { apiFetch } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { journeyCoverSrc, JOURNEY_DEFAULT_IMAGE } from '../../utils/journeyDisplay'

type PubProfile = {
  relationship?: { is_following?: boolean } | null
  stats?: { followers_count?: number } | null
}

type CardProps = {
  username: string
  displayName: string
  avatar: string | null
  journeyCount?: number
  isAuthor?: boolean
  className?: string
}

/** Creator mini-card near the top of the journey — turns the byline into a
 *  social hub with a real Follow button. */
export function JourneyCreatorCard({
  username,
  displayName,
  avatar,
  journeyCount,
  isAuthor = false,
  className = '',
}: CardProps) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const signedIn = Boolean(profile)

  const { data: pub } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: () =>
      apiFetch<PubProfile>(`/api/accounts/users/${encodeURIComponent(username)}/`).catch(
        () => ({}) as PubProfile,
      ),
    enabled: Boolean(username) && !isAuthor,
    retry: false,
  })

  const isFollowing = pub?.relationship?.is_following ?? false

  const followMut = useMutation({
    mutationFn: () =>
      apiFetch<{ following: boolean; followers_count: number }>(
        `/api/social/users/${encodeURIComponent(username)}/follow/`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['public-profile', username] })
    },
  })

  const initial = (displayName || username || '?').charAt(0).toUpperCase()
  const countLabel = journeyCount
    ? `${journeyCount} ${journeyCount === 1 ? 'journey' : 'journeys'}`
    : null

  return (
    <div className={`jn-creator ${className}`.trim()}>
      <Link to={`/u/${username}`} className="jn-creator__id">
        {avatar ? (
          <img className="jn-creator__avatar" src={avatar} alt="" />
        ) : (
          <span className="jn-creator__avatar jn-creator__avatar--fallback" aria-hidden>
            {initial}
          </span>
        )}
        <span className="jn-creator__copy">
          <span className="jn-creator__name">{displayName}</span>
          <span className="jn-creator__sub">
            @{username}
            {countLabel ? ` · ${countLabel}` : ''}
          </span>
        </span>
      </Link>

      {!isAuthor ? (
        signedIn ? (
          <button
            type="button"
            className={`jn-creator__follow${isFollowing ? ' is-following' : ''}`}
            onClick={() => followMut.mutate()}
            disabled={followMut.isPending}
            aria-pressed={isFollowing}
          >
            <Users size={14} strokeWidth={2.25} aria-hidden />
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        ) : (
          <Link to="/login" className="jn-creator__follow">
            <Users size={14} strokeWidth={2.25} aria-hidden />
            Follow
          </Link>
        )
      ) : null}
    </div>
  )
}

function onCoverError(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.onerror = null
  event.currentTarget.src = JOURNEY_DEFAULT_IMAGE
}

type MoreProps = {
  journeys: MockTrip[]
  displayName: string
  username: string
  className?: string
}

/** Horizontal rail of the creator's other journeys. */
export function JourneyCreatorMore({ journeys, displayName, username, className = '' }: MoreProps) {
  if (journeys.length === 0) return null

  return (
    <section className={`jn-creator-more ${className}`.trim()} aria-labelledby="jn-creator-more-title">
      <header className="jn-creator-more__head">
        <h2 id="jn-creator-more-title" className="jn-creator-more__title">
          More from {displayName}
        </h2>
        <Link to={`/u/${username}`} className="jn-creator-more__all">
          View profile
        </Link>
      </header>
      <div className="jn-creator-more__rail">
        {journeys.map((journey) => {
          const cover = journeyCoverSrc(journey.cover_image)
          return (
            <Link
              key={journey.id}
              to={`/journeys/${journey.id}`}
              className="jn-creator-more__card"
              aria-label={`Open journey: ${journey.title}`}
            >
              <span className="jn-creator-more__media">
                {cover ? (
                  <img src={cover} alt="" onError={onCoverError} loading="lazy" />
                ) : (
                  <span className="jn-creator-more__placeholder" aria-hidden>
                    <Map size={20} strokeWidth={2} />
                  </span>
                )}
              </span>
              <span className="jn-creator-more__name">{journey.title}</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
