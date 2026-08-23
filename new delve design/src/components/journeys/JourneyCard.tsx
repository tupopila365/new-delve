import { useCallback, useState } from 'react'
import type { MouseEvent } from 'react'
import { Bookmark, Heart, MapPin, MessageCircle, Navigation } from 'lucide-react'
import type { JourneySummary } from '@delve/contracts'
import { likeJourney, unlikeJourney } from '../../api/journeyClient'
import { saveItem, unsaveItem } from '../../api/socialClient'
import { formatUsername } from '../../lib/formatUsername'
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

  const patch = useCallback(
    (patch: Partial<JourneySummary>) => {
      onJourneyUpdated?.({ ...journey, ...patch })
    },
    [journey, onJourneyUpdated],
  )

  async function toggleLike(e: MouseEvent) {
    e.stopPropagation()
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
      className="overflow-hidden sm:rounded-2xl w-full min-w-0"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <button
        type="button"
        onClick={() => onOpen(journey.id)}
        className="block w-full text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <div className="relative aspect-[16/10] bg-black/10">
          {journey.coverUrl ? (
            <JourneyCoverMedia
              url={journey.coverUrl}
              resourceType={journey.coverResourceType}
              className="w-full h-full object-cover"
              variant="card"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Navigation size={28} style={{ color: 'var(--fg-muted)' }} />
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
      </button>

      <div className="px-4 py-3 flex flex-col gap-1.5 min-w-0">
        <button
          type="button"
          onClick={() => onOpen(journey.id)}
          className="text-left min-w-0"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <p
            className="text-sm font-bold m-0 leading-snug"
            style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}
          >
            {journey.title}
          </p>
          <p className="text-xs m-0 mt-1 inline-flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
            <MapPin size={12} className="flex-shrink-0" />
            <span className="truncate">{destination}</span>
          </p>
          <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--fg-muted)' }}>
            {journey.durationDays} days · {journey.stopCount} stops
          </p>
          {route && (
            <p className="text-xs m-0 mt-1 truncate" style={{ color: 'var(--fg-muted)' }}>
              {route}
            </p>
          )}
        </button>

        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onOpenProfile?.(journey.author.username)
          }}
          className="flex items-center gap-2 mt-0.5 text-left min-w-0"
          style={{ background: 'none', border: 'none', padding: 0, cursor: onOpenProfile ? 'pointer' : 'default' }}
        >
          {journey.author.avatarUrl ? (
            <img src={journey.author.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: 'var(--surface-subtle)' }} />
          )}
          <span className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>
            {journey.author.displayName || formatUsername(journey.author.username)}
          </span>
        </button>

        <div className="flex items-center gap-3 mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            disabled={busy}
            onClick={toggleLike}
            className="inline-flex items-center gap-1 text-xs font-semibold min-h-[44px] min-w-[44px] justify-center"
            style={{
              background: 'none',
              border: 'none',
              color: journey.likedByMe ? '#E11D48' : 'var(--fg-muted)',
              cursor: 'pointer',
            }}
            aria-label="Like journey"
          >
            <Heart size={16} fill={journey.likedByMe ? 'currentColor' : 'none'} />
            {formatCount(journey.likeCount)}
          </button>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onOpen(journey.id)
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold min-h-[44px]"
            style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}
          >
            <MessageCircle size={16} />
            {formatCount(journey.commentCount)}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={toggleSave}
            className="inline-flex items-center gap-1 text-xs font-semibold min-h-[44px] ml-auto"
            style={{
              background: 'none',
              border: 'none',
              color: journey.savedByMe ? 'var(--primary)' : 'var(--fg-muted)',
              cursor: 'pointer',
            }}
            aria-label={journey.savedByMe ? 'Unsave journey' : 'Save journey'}
          >
            <Bookmark size={16} fill={journey.savedByMe ? 'currentColor' : 'none'} />
            Save
          </button>
        </div>
      </div>
    </article>
  )
}
