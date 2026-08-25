import { useCallback, useState } from 'react'
import type { MouseEvent } from 'react'
import { Bookmark, Heart, MapPin, MessageCircle, Navigation, User } from 'lucide-react'
import type { JourneySummary } from '@delve/contracts'
import { likeJourney, unlikeJourney } from '../../api/journeyClient'
import { saveItem, unsaveItem } from '../../api/socialClient'
import { DoubleTapLike } from '../delvers/DoubleTapLike'
import ExpandableCaption from '../mobile/ExpandableCaption'
import { formatUsername } from '../../lib/formatUsername'
import { timeAgoShort } from '../../lib/timeAgoShort'
import JourneyCoverMedia from './JourneyCoverMedia'
import { deriveJourneyLifecycle, formatStopRoute, lifecycleLabel } from './journeyLifecycle'

interface JourneyCardProps {
  journey: JourneySummary
  signedIn?: boolean
  onSignIn?: () => void
  onOpen: (id: string) => void
  onOpenProfile?: (username: string) => void
  onJourneyUpdated?: (journey: JourneySummary) => void
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}

export default function JourneyCard({
  journey,
  signedIn = false,
  onSignIn,
  onOpen,
  onOpenProfile,
  onJourneyUpdated,
}: JourneyCardProps) {
  const [busy, setBusy] = useState(false)
  const status = journey.lifecycleStatus || deriveJourneyLifecycle(journey)
  const route = formatStopRoute(
    journey.stopPreview?.length
      ? journey.stopPreview
      : [journey.startPlace, journey.endPlace].filter(Boolean),
  )
  const destination = journey.countries[0] || journey.endPlace || journey.startPlace
  const caption = [journey.title, journey.summary || journey.takeaway].filter(Boolean).join(' — ')
  const postedAt = journey.publishedAt || journey.createdAt

  const patch = useCallback(
    (next: Partial<JourneySummary>) => {
      onJourneyUpdated?.({ ...journey, ...next })
    },
    [journey, onJourneyUpdated],
  )

  async function toggleLike(e?: MouseEvent) {
    e?.stopPropagation()
    if (!signedIn) {
      onSignIn?.()
      return
    }
    if (busy) return
    setBusy(true)
    try {
      const updated = journey.likedByMe
        ? await unlikeJourney(journey.id)
        : await likeJourney(journey.id)
      patch({
        likedByMe: updated.likedByMe,
        likeCount: updated.likeCount,
      })
    } catch {
      /* ignore */
    } finally {
      setBusy(false)
    }
  }

  async function toggleSave(e: MouseEvent) {
    e.stopPropagation()
    if (!signedIn) {
      onSignIn?.()
      return
    }
    if (busy) return
    setBusy(true)
    try {
      if (journey.savedByMe) {
        await unsaveItem({ targetType: 'JOURNEY', targetId: journey.id })
        patch({ savedByMe: false, saveCount: Math.max(0, journey.saveCount - 1) })
      } else {
        await saveItem({ targetType: 'JOURNEY', targetId: journey.id })
        patch({ savedByMe: true, saveCount: journey.saveCount + 1 })
      }
    } catch {
      /* ignore */
    } finally {
      setBusy(false)
    }
  }

  return (
    <article
      className="overflow-hidden w-full min-w-0 sm:rounded-2xl"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2.5 px-4 py-3">
        <button
          type="button"
          onClick={() => onOpenProfile?.(journey.author.username)}
          className="flex items-center gap-2.5 min-w-0"
          style={{ background: 'none', border: 'none', cursor: onOpenProfile ? 'pointer' : 'default', padding: 0 }}
        >
          <div
            className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(140,82,255,0.12)' }}
          >
            {journey.author.avatarUrl ? (
              <img src={journey.author.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <User size={18} style={{ color: 'var(--fg-muted)' }} />
            )}
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--fg)' }}>
              {journey.author.displayName || formatUsername(journey.author.username)}
            </p>
            {destination ? (
              <p className="text-xs m-0 truncate inline-flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
                <MapPin size={11} className="flex-shrink-0" />
                {destination}
              </p>
            ) : null}
          </div>
        </button>
        <span className="ml-auto text-xs flex-shrink-0" style={{ color: 'var(--fg-muted)' }}>
          {timeAgoShort(postedAt)}
        </span>
      </div>

      <DoubleTapLike
        onDoubleLike={() => {
          if (!signedIn) {
            onSignIn?.()
            return
          }
          if (journey.likedByMe) return
          patch({ likedByMe: true, likeCount: journey.likeCount + 1 })
          void likeJourney(journey.id)
            .then(updated => patch({ likedByMe: updated.likedByMe, likeCount: updated.likeCount }))
            .catch(() => patch({ likedByMe: false, likeCount: Math.max(0, journey.likeCount) }))
        }}
        onSingleTap={() => onOpen(journey.id)}
        className="relative w-full overflow-hidden bg-black/10"
      >
        <div
          className="block w-full text-left"
          aria-label={`Open ${journey.title}`}
        >
          <div className="relative w-full max-h-[70vh] aspect-[4/5] min-h-[22rem]">
            {journey.coverUrl ? (
              <JourneyCoverMedia
                url={journey.coverUrl}
                resourceType={journey.coverResourceType}
                className="absolute inset-0 w-full h-full object-cover"
                variant="card"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Navigation size={36} style={{ color: 'var(--fg-muted)' }} />
              </div>
            )}
            {status !== 'UPCOMING' && (
              <span
                className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
              >
                {lifecycleLabel(status)}
              </span>
            )}
          </div>
        </div>
      </DoubleTapLike>

      <div className="px-4 py-3">
        <div className="flex items-center gap-4 mb-2">
          <button
            type="button"
            disabled={busy}
            onClick={e => void toggleLike(e)}
            style={{
              background: 'none',
              border: 'none',
              color: journey.likedByMe ? 'var(--primary)' : 'var(--fg)',
              cursor: 'pointer',
              padding: 0,
            }}
            aria-label="Like journey"
          >
            <Heart size={22} fill={journey.likedByMe ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            onClick={() => onOpen(journey.id)}
            style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', padding: 0 }}
            aria-label="Comments"
          >
            <MessageCircle size={22} />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={toggleSave}
            className="ml-auto"
            style={{
              background: 'none',
              border: 'none',
              color: journey.savedByMe ? 'var(--primary)' : 'var(--fg)',
              cursor: 'pointer',
              padding: 0,
            }}
            aria-label={journey.savedByMe ? 'Unsave journey' : 'Save journey'}
          >
            <Bookmark size={22} fill={journey.savedByMe ? 'currentColor' : 'none'} />
          </button>
        </div>

        <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>
          {formatCount(journey.likeCount)} likes · {formatCount(journey.commentCount)} comments
        </p>

        {caption ? (
          <ExpandableCaption
            authorFirstName={journey.author.displayName || journey.author.username}
            caption={caption}
          />
        ) : null}

        <p className="text-xs m-0 mt-2" style={{ color: 'var(--fg-muted)' }}>
          {journey.durationDays} days · {journey.stopCount} stops
          {route ? ` · ${route}` : ''}
        </p>

        <button
          type="button"
          onClick={() => onOpen(journey.id)}
          className="text-sm mt-1 min-h-[32px] inline-flex items-center"
          style={{
            color: 'var(--fg-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {journey.commentCount > 0
            ? `View all ${formatCount(journey.commentCount)} comments`
            : 'Open journey'}
        </button>
      </div>
    </article>
  )
}
