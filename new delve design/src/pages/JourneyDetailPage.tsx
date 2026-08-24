import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft, Bookmark, MapPin, Clock, Users, Eye, AlertCircle, Car, Pencil, Heart, MessageCircle, Share2,
} from 'lucide-react'
import type { JourneyDetail } from '@delve/contracts'
import {
  addJourneyComment,
  fetchJourney,
  fetchJourneyComments,
  likeJourney,
  unlikeJourney,
} from '../api/journeyClient'
import { createPost, saveItem, unsaveItem } from '../api/socialClient'
import { getStoredUser } from '../api/authClient'
import { AuthApiError } from '../api/authClient'
import { formatUsername } from '../lib/formatUsername'
import JourneyEditorSheet from '../components/journeys/JourneyEditorSheet'
import JourneyCoverMedia from '../components/journeys/JourneyCoverMedia'
import JourneyStopMediaGallery from '../components/journeys/JourneyStopMediaGallery'
import JourneyDetailSkeleton from '../components/journeys/JourneyDetailSkeleton'
import CommentsSheet from '../components/comments/CommentsSheet'
import { deriveJourneyLifecycle, lifecycleLabel } from '../components/journeys/journeyLifecycle'
import { mapJourneyComment } from '../components/comments/mappers'

interface Props {
  journeyId: string
  signedIn?: boolean
  onBack: () => void
  onSignIn?: () => void
  onOpenProfile?: (username: string) => void
  onOpenGroupChat?: (journeyId: string) => void
  onOpenEvent?: (eventId: string) => void
  onSharedToDelvers?: () => void
}

function partyLabel(p: JourneyDetail['partyType']) {
  return p.charAt(0) + p.slice(1).toLowerCase()
}

export default function JourneyDetailPage({
  journeyId,
  signedIn = false,
  onBack,
  onSignIn,
  onOpenProfile,
  onOpenGroupChat,
  onOpenEvent,
  onSharedToDelvers,
}: Props) {
  const [journey, setJourney] = useState<JourneyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saveBusy, setSaveBusy] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeBusy, setLikeBusy] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [shareNote, setShareNote] = useState<string | null>(null)
  const [shareBusy, setShareBusy] = useState(false)
  const viewerId = getStoredUser()?.id
  const isOwner = Boolean(journey && viewerId && journey.author.id === viewerId)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const j = await fetchJourney(journeyId)
      setJourney(j)
      setSaved(j.savedByMe)
      setLiked(j.likedByMe)
    } catch (err) {
      setJourney(null)
      setError(err instanceof AuthApiError || err instanceof Error ? err.message : 'Could not load journey')
    } finally {
      setLoading(false)
    }
  }, [journeyId])

  useEffect(() => {
    void load()
  }, [load])

  const loadJourneyComments = useCallback(async () => {
    const rows = await fetchJourneyComments(journeyId)
    return rows.map(mapJourneyComment)
  }, [journeyId])

  const submitJourneyComment = useCallback(
    async (body: string) => {
      const created = await addJourneyComment(journeyId, body)
      return mapJourneyComment(created)
    },
    [journeyId],
  )

  async function toggleSave() {
    if (!journey) return
    if (!signedIn) {
      onSignIn?.()
      return
    }
    setSaveBusy(true)
    try {
      if (saved) {
        await unsaveItem({ targetType: 'JOURNEY', targetId: journey.id })
        setSaved(false)
        setJourney(j => (j ? { ...j, saveCount: Math.max(0, j.saveCount - 1), savedByMe: false } : j))
      } else {
        await saveItem({ targetType: 'JOURNEY', targetId: journey.id })
        setSaved(true)
        setJourney(j => (j ? { ...j, saveCount: j.saveCount + 1, savedByMe: true } : j))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update save')
    } finally {
      setSaveBusy(false)
    }
  }

  async function toggleLike() {
    if (!journey) return
    if (!signedIn) {
      onSignIn?.()
      return
    }
    setLikeBusy(true)
    try {
      const updated = liked
        ? await unlikeJourney(journey.id)
        : await likeJourney(journey.id)
      setJourney(updated)
      setLiked(updated.likedByMe)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update like')
    } finally {
      setLikeBusy(false)
    }
  }

  async function shareJourney() {
    if (!journey) return
    const url = `${window.location.origin}/journeys/${journey.slug || journey.id}`
    const text = `${journey.title}\n${url}`
    try {
      if (navigator.share) {
        await navigator.share({ title: journey.title, text, url })
      } else {
        await navigator.clipboard.writeText(text)
        setShareNote('Link copied')
        window.setTimeout(() => setShareNote(null), 2000)
      }
    } catch {
      /* dismissed */
    }
  }

  async function shareToDelvers() {
    if (!journey || shareBusy) return
    if (!signedIn) {
      onSignIn?.()
      return
    }
    setShareBusy(true)
    try {
      await createPost({ journeyId: journey.id })
      setShareNote('Shared to Delvers')
      onSharedToDelvers?.()
      window.setTimeout(() => setShareNote(null), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not share to Delvers')
    } finally {
      setShareBusy(false)
    }
  }

  if (loading) {
    return <JourneyDetailSkeleton />
  }

  if (error || !journey) {
    return (
      <div className="px-4 py-12 text-center">
        <AlertCircle size={32} className="mx-auto mb-3" style={{ color: 'var(--border)' }} />
        <p className="text-base font-bold m-0 mb-2" style={{ color: 'var(--fg)' }}>
          {error || "We couldn't load this Journey."}
        </p>
        <button type="button" onClick={() => void load()} className="text-sm font-semibold mr-4" style={{ color: 'var(--primary)' }}>
          Retry
        </button>
        <button type="button" onClick={onBack} className="text-sm font-semibold" style={{ color: 'var(--fg-muted)' }}>
          Back to Journeys
        </button>
      </div>
    )
  }

  const lifecycle = deriveJourneyLifecycle(journey)
  const progressPct =
    lifecycle === 'ACTIVE' && journey.durationDays > 0 && journey.startDate
      ? Math.min(
          100,
          Math.round(
            ((Date.now() - new Date(journey.startDate).getTime()) / 86400000 / journey.durationDays) * 100,
          ),
        )
      : null

  return (
    <div className="pb-10">
      <div className="px-4 sm:px-0 pt-3 pb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: 'var(--primary)' }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
              style={{
                background: 'var(--surface)',
                color: 'var(--fg)',
                border: '1px solid var(--border)',
              }}
            >
              <Pencil size={16} /> Edit
            </button>
          )}
          <button
            type="button"
            disabled={likeBusy}
            onClick={() => void toggleLike()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
            style={{
              background: liked ? 'rgba(140,82,255,0.12)' : 'var(--surface)',
              color: liked ? 'var(--primary)' : 'var(--fg)',
              border: '1px solid var(--border)',
            }}
          >
            <Heart size={16} fill={liked ? 'var(--primary)' : 'none'} />
            {journey.likeCount}
          </button>
          <button
            type="button"
            disabled={saveBusy}
            onClick={() => void toggleSave()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
            style={{
              background: saved ? 'rgba(140,82,255,0.12)' : 'var(--surface)',
              color: saved ? 'var(--primary)' : 'var(--fg)',
              border: '1px solid var(--border)',
            }}
          >
            <Bookmark size={16} fill={saved ? 'var(--primary)' : 'none'} />
            {saved ? 'Saved' : 'Save'}
          </button>
          {onOpenGroupChat && (
            <button
              type="button"
              onClick={() => {
                if (!signedIn) {
                  onSignIn?.()
                  return
                }
                onOpenGroupChat(journey.id)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
              style={{
                background: 'var(--primary)',
                color: '#fff',
                border: 'none',
              }}
            >
              <MessageCircle size={16} /> Group chat
            </button>
          )}
          <button
            type="button"
            onClick={() => void shareJourney()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', cursor: 'pointer' }}
          >
            <Share2 size={16} /> Share
          </button>
          <button
            type="button"
            disabled={shareBusy}
            onClick={() => void shareToDelvers()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
            style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--fg)', cursor: 'pointer' }}
          >
            <Share2 size={16} /> Delvers
          </button>
        </div>
      </div>

      <div className="relative h-56 sm:h-72 sm:rounded-2xl overflow-hidden bg-black/10 sm:mx-0">
        {journey.coverUrl || journey.media[0] ? (
          <JourneyCoverMedia
            url={journey.coverUrl || journey.media[0]!}
            resourceType={journey.coverResourceType}
            className="w-full h-full object-cover"
            variant="hero"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin size={32} style={{ color: 'var(--fg-muted)' }} />
          </div>
        )}
      </div>

      <div className="px-4 sm:px-0 pt-4">
        <h1
          className="text-2xl font-extrabold m-0 mb-2"
          style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}
        >
          {journey.title}
        </h1>
        <p className="text-xs font-bold uppercase tracking-wide m-0 mb-2" style={{ color: 'var(--primary)' }}>
          {lifecycleLabel(lifecycle)}
        </p>
        {shareNote && (
          <p className="text-xs mb-2" style={{ color: 'var(--primary)' }} role="status">{shareNote}</p>
        )}
        {progressPct != null && (
          <div className="mb-3">
            <p className="text-xs m-0 mb-1" style={{ color: 'var(--fg-muted)' }}>
              Trip in progress · Day {Math.max(1, Math.ceil((Date.now() - new Date(journey.startDate!).getTime()) / 86400000))} of {journey.durationDays}
            </p>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-subtle)' }}>
              <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: 'var(--primary)' }} />
            </div>
          </div>
        )}
        <p className="text-sm m-0 mb-3" style={{ color: 'var(--fg-muted)' }}>
          {journey.summary || `${journey.startPlace} → ${journey.endPlace}`}
        </p>

        <button
          type="button"
          onClick={() => onOpenProfile?.(journey.author.username)}
          className="flex items-center gap-2 mb-4"
          style={{ background: 'none', border: 'none', padding: 0, cursor: onOpenProfile ? 'pointer' : 'default' }}
        >
          {journey.author.avatarUrl ? (
            <img src={journey.author.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full" style={{ background: 'var(--surface-subtle)' }} />
          )}
          <div className="text-left">
            <p className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>
              {journey.author.displayName || formatUsername(journey.author.username)}
            </p>
            <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
              {formatUsername(journey.author.username)}
            </p>
          </div>
        </button>

        <div className="flex flex-wrap gap-3 mb-5 text-xs" style={{ color: 'var(--fg-muted)' }}>
          <span className="inline-flex items-center gap-1">
            <MapPin size={13} /> {journey.startPlace} → {journey.endPlace}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={13} /> {journey.durationDays} days · {journey.stopCount} stops
          </span>
          <span className="inline-flex items-center gap-1">
            <Users size={13} /> {partyLabel(journey.partyType)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye size={13} /> {journey.viewCount} views · {journey.likeCount} likes · {journey.commentCount} comments · {journey.saveCount} saves
          </span>
          {journey.historicalCost && (
            <span>
              {journey.currency} {journey.historicalCost}
            </span>
          )}
        </div>

        {journey.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {journey.tags.map(t => (
              <span
                key={t}
                className="text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)' }}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {journey.takeaway && (
          <div
            className="rounded-2xl p-4 mb-5"
            style={{ background: 'rgba(140,82,255,0.08)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs font-bold uppercase tracking-wider m-0 mb-1" style={{ color: 'var(--primary)' }}>
              Takeaway
            </p>
            <p className="text-sm m-0" style={{ color: 'var(--fg)' }}>
              {journey.takeaway}
            </p>
          </div>
        )}

        {(journey.events?.length ?? 0) > 0 && (
          <>
            <h2 className="text-base font-bold m-0 mb-3" style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}>
              Linked events
            </h2>
            <div className="flex flex-col gap-2 mb-5">
              {journey.events!.map(ev => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onOpenEvent?.(ev.id)}
                  className="flex items-center gap-3 rounded-2xl overflow-hidden text-left min-h-[64px]"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    cursor: onOpenEvent ? 'pointer' : 'default',
                    padding: 0,
                  }}
                >
                  {ev.coverUrl ? (
                    <img src={ev.coverUrl} alt="" className="w-16 h-16 object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 flex-shrink-0" style={{ background: 'var(--surface-subtle)' }} />
                  )}
                  <div className="min-w-0 pr-3 py-2">
                    <p className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--fg)' }}>{ev.title}</p>
                    <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                      {new Date(ev.startAt).toLocaleString()}
                      {ev.city ? ` · ${ev.city}` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        <h2 className="text-base font-bold m-0 mb-3" style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}>
          Stops
        </h2>
        <div className="flex flex-col gap-3">
          {journey.stops.map((stop, i) => (
            <article
              key={stop.id}
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <JourneyStopMediaGallery
                mediaUrls={stop.mediaUrls}
                mediaResourceTypes={stop.mediaResourceTypes}
              />
              <div className="p-4">
                <p className="text-xs font-bold m-0 mb-1" style={{ color: 'var(--primary)' }}>
                  Stop {i + 1} · Day {stop.arrivalDay}
                </p>
                <p className="text-sm font-bold m-0 mb-1" style={{ color: 'var(--fg)' }}>
                  {stop.place}
                  {stop.region ? ` · ${stop.region}` : ''}
                </p>
                {stop.notes && (
                  <p className="text-sm m-0 mb-2" style={{ color: 'var(--fg-muted)' }}>
                    {stop.notes}
                  </p>
                )}
                {stop.highlights.length > 0 && (
                  <ul className="m-0 pl-4 text-xs" style={{ color: 'var(--fg-muted)' }}>
                    {stop.highlights.map(h => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                )}
                {stop.transportModeToNext && (
                  <p className="text-xs m-0 mt-2 inline-flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
                    <Car size={12} />
                    Next: {stop.transportModeToNext}
                    {stop.transportDurationToNext ? ` · ${stop.transportDurationToNext}` : ''}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>

        <div
          className="mt-6 rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <button
            type="button"
            onClick={() => setCommentsOpen(true)}
            className="w-full flex items-center justify-between gap-3 p-4 text-left"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <div>
              <h2
                className="text-base font-bold m-0 mb-1 inline-flex items-center gap-2"
                style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}
              >
                <MessageCircle size={18} /> Comments
              </h2>
              <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
                {journey.commentCount > 0
                  ? `${journey.commentCount} comment${journey.commentCount === 1 ? '' : 's'}`
                  : 'Be the first to ask a question or share a tip'}
              </p>
            </div>
            <span className="text-sm font-semibold flex-shrink-0" style={{ color: 'var(--primary)' }}>
              {journey.commentCount > 0 ? 'View all' : 'Add comment'}
            </span>
          </button>
        </div>
      </div>

      <CommentsSheet
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        title="Comments"
        subtitle={journey.title}
        emptyMessage="No comments yet. Be the first to ask a question or share a tip."
        signedIn={signedIn}
        onSignIn={onSignIn}
        onOpenProfile={onOpenProfile}
        fetchComments={loadJourneyComments}
        submitComment={submitJourneyComment}
        onCommentAdded={() => {
          setJourney(j => (j ? { ...j, commentCount: j.commentCount + 1 } : j))
        }}
      />

      <JourneyEditorSheet
        open={editOpen}
        mode="edit"
        initial={journey}
        signedIn={signedIn}
        onClose={() => setEditOpen(false)}
        onSignIn={onSignIn}
        onSaved={j => {
          setJourney(j)
          setSaved(j.savedByMe)
          setLiked(j.likedByMe)
          setEditOpen(false)
        }}
      />
    </div>
  )
}
