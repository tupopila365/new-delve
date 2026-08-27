import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft, Bookmark, MapPin, Clock, Users, Eye, AlertCircle, Car, Pencil, Heart, MessageCircle, Share2, Flag, MoreHorizontal,
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
import { DoubleTapLike } from '../components/delvers/DoubleTapLike'
import JourneyStopMediaGallery from '../components/journeys/JourneyStopMediaGallery'
import JourneyDetailSkeleton from '../components/journeys/JourneyDetailSkeleton'
import CommentsSheet from '../components/comments/CommentsSheet'
import { deriveJourneyLifecycle, lifecycleLabel } from '../components/journeys/journeyLifecycle'
import { mapJourneyComment } from '../components/comments/mappers'
import ContentReportSheet from '../components/safety/ContentReportSheet'

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
  const [reportOpen, setReportOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
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

  // Structured data — schema.org/TravelAction
  useEffect(() => {
    if (!journey) return
    const script = document.createElement('script')
    script.id = `journey-ld-${journey.id}`
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'TravelAction',
      name: journey.title,
      description: journey.summary || `${journey.startPlace} → ${journey.endPlace}`,
      image: journey.coverUrl || undefined,
      agent: {
        '@type': 'Person',
        name: journey.author.displayName || journey.author.username,
        identifier: journey.author.username,
      },
      ...(journey.startDate ? { startTime: journey.startDate } : {}),
      ...(journey.endDate ? { endTime: journey.endDate } : {}),
      location: journey.startPlace
        ? { '@type': 'Place', name: journey.startPlace }
        : undefined,
    })
    document.head.appendChild(script)
    return () => {
      document.getElementById(`journey-ld-${journey.id}`)?.remove()
    }
  }, [journey])

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

  async function likeFromDoubleTap() {
    if (!journey) return
    if (!signedIn) {
      onSignIn?.()
      return
    }
    if (liked) return
    setLiked(true)
    setJourney(j => j ? { ...j, likedByMe: true, likeCount: j.likeCount + 1 } : j)
    try {
      const updated = await likeJourney(journey.id)
      setJourney(updated)
      setLiked(updated.likedByMe)
    } catch {
      setLiked(false)
      setJourney(j => j ? { ...j, likedByMe: false, likeCount: Math.max(0, j.likeCount - 1) } : j)
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
          style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          aria-label="Back to Journeys list"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--surface)', color: 'var(--fg)', border: '1px solid var(--border)', cursor: 'pointer' }}
              aria-label="Edit journey details"
            >
              <Pencil size={16} /> Edit
            </button>
          )}
          {/* ⋯ overflow menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen(v => !v)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--fg)' }}
              aria-label="More options"
              aria-expanded={moreOpen}
            >
              <MoreHorizontal size={20} />
            </button>
            {moreOpen && (
              <>
                {/* Transparent backdrop to close menu on outside click */}
                <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
                <div
                  className="absolute right-0 top-12 z-50 rounded-2xl overflow-hidden"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
                    minWidth: 200,
                  }}
                  role="menu"
                  aria-label="Journey actions"
                >
                  <button
                    type="button"
                    onClick={() => { void shareJourney(); setMoreOpen(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-left"
                    style={{ background: 'none', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--fg)', cursor: 'pointer' }}
                    role="menuitem"
                    aria-label="Share journey link"
                  >
                    <Share2 size={15} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} /> Share link
                  </button>
                  <button
                    type="button"
                    disabled={shareBusy}
                    onClick={() => { void shareToDelvers(); setMoreOpen(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-left disabled:opacity-60"
                    style={{ background: 'none', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--fg)', cursor: 'pointer' }}
                    role="menuitem"
                    aria-label="Share journey to Delvers feed"
                  >
                    <Share2 size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} /> Share to Delvers
                  </button>
                  {onOpenGroupChat && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!signedIn) { onSignIn?.(); setMoreOpen(false); return }
                        onOpenGroupChat(journey.id)
                        setMoreOpen(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-left"
                      style={{ background: 'none', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--fg)', cursor: 'pointer' }}
                      role="menuitem"
                      aria-label="Open journey group chat"
                    >
                      <MessageCircle size={15} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} /> Group chat
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!signedIn) { onSignIn?.(); setMoreOpen(false); return }
                      setReportOpen(true)
                      setMoreOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-left"
                    style={{ background: 'none', border: 'none', color: 'var(--auth-danger)', cursor: 'pointer' }}
                    role="menuitem"
                    aria-label="Report journey content"
                  >
                    <Flag size={15} style={{ flexShrink: 0 }} /> Report
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="relative h-56 sm:h-72 sm:rounded-2xl overflow-hidden bg-black/10 sm:mx-0">
        <DoubleTapLike onDoubleLike={() => void likeFromDoubleTap()} className="h-full w-full">
          {journey.coverUrl || journey.media[0] ? (
            <JourneyCoverMedia
              url={journey.coverUrl || journey.media[0]!}
              resourceType={journey.coverResourceType}
              className="w-full h-full object-cover"
              alt={journey.title}
              variant="hero"
              priority="high"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin size={32} style={{ color: 'var(--fg-muted)' }} />
            </div>
          )}
        </DoubleTapLike>
      </div>

      {/* Social action bar — like, comments, save */}
      <div
        className="px-4 sm:px-0 py-3 flex items-center gap-5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button
          type="button"
          disabled={likeBusy}
          onClick={() => void toggleLike()}
          className="inline-flex items-center gap-1.5 text-sm font-semibold disabled:opacity-60"
          style={{ background: 'none', border: 'none', color: liked ? 'var(--primary)' : 'var(--fg)', cursor: 'pointer', padding: 0 }}
          aria-label={liked ? "Unlike journey" : "Like journey"}
          aria-pressed={liked}
        >
          <Heart size={22} fill={liked ? 'currentColor' : 'none'} />
          <span>{journey.likeCount}</span>
        </button>
        <button
          type="button"
          onClick={() => setCommentsOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', padding: 0 }}
          aria-label={`View comments, ${journey.commentCount} comment${journey.commentCount === 1 ? '' : 's'}`}
        >
          <MessageCircle size={22} />
          <span>{journey.commentCount}</span>
        </button>
        {shareNote && (
          <p className="text-xs m-0" style={{ color: 'var(--primary)' }} role="status">{shareNote}</p>
        )}
        <button
          type="button"
          disabled={saveBusy}
          onClick={() => void toggleSave()}
          className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold disabled:opacity-60"
          style={{ background: 'none', border: 'none', color: saved ? 'var(--primary)' : 'var(--fg)', cursor: 'pointer', padding: 0 }}
          aria-label={saved ? 'Unsave journey' : 'Save journey'}
          aria-pressed={saved}
        >
          <Bookmark size={22} fill={saved ? 'currentColor' : 'none'} />
          <span>{saved ? 'Saved' : 'Save'}</span>
        </button>
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
          aria-label={`View profile of ${journey.author.displayName || journey.author.username}`}
        >
          {journey.author.avatarUrl ? (
            <img src={journey.author.avatarUrl} alt={`Avatar of ${journey.author.displayName || journey.author.username}`} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full" style={{ background: 'var(--surface-subtle)' }} aria-hidden="true" />
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
            <div className="flex flex-col gap-2 mb-5" role="list" aria-label="Linked events">
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
                  role="listitem"
                  aria-label={`Open event details for ${ev.title}`}
                >
                  {ev.coverUrl ? (
                    <img src={ev.coverUrl} alt={`Cover for event ${ev.title}`} className="w-16 h-16 object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 flex-shrink-0" style={{ background: 'var(--surface-subtle)' }} aria-hidden="true" />
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

        {(journey.bookings?.length ?? 0) > 0 && (
          <>
            <h2 className="text-base font-bold m-0 mb-3" style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}>
              Booked
            </h2>
            <div className="flex flex-col gap-2 mb-5" role="list" aria-label="Bookings">
              {journey.bookings!.map(row => (
                <div
                  key={row.id}
                  className="rounded-2xl px-3 py-3"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  role="listitem"
                  aria-label={`Booking: ${row.listingTitle}, status: ${row.status}`}
                >
                  <p className="text-xs font-semibold m-0" style={{ color: '#0F8A52' }}>
                    BOOKED ✓ · {row.status}
                  </p>
                  <p className="text-sm font-bold m-0">{row.listingTitle}</p>
                  <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
                    {row.startDateTime
                      ? new Date(row.startDateTime).toLocaleString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Dates to confirm'}
                    {' · '}
                    {row.currency} {row.finalAmount}
                  </p>
                  <p className="text-xs font-mono m-0 mt-1">{row.bookingReference}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {(journey.deals?.length ?? 0) > 0 && (
          <>
            <h2 className="text-base font-bold m-0 mb-3" style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}>
              Linked deals
            </h2>
            <div className="flex flex-col gap-2 mb-5" role="list" aria-label="Linked deals">
              {journey.deals!.map(deal => (
                <div
                  key={deal.id}
                  className="flex items-center gap-3 rounded-2xl overflow-hidden"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  role="listitem"
                  aria-label={`Deal: ${deal.title}, discount: ${deal.discountSummary}`}
                >
                  {deal.coverUrl ? (
                    <img src={deal.coverUrl} alt={`Cover for deal ${deal.title}`} className="w-16 h-16 object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 flex-shrink-0" style={{ background: 'var(--surface-subtle)' }} aria-hidden="true" />
                  )}
                  <div className="min-w-0 pr-3 py-2">
                    <p className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--fg)' }}>{deal.title}</p>
                    <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                      {deal.discountSummary}
                      {deal.city ? ` · ${deal.city}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <h2 className="text-base font-bold m-0 mb-4" style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}>
          Stops
        </h2>
        {/* Timeline layout */}
        <div className="relative" role="list" aria-label="Journey stops timeline">
          {/* Vertical gradient line */}
          <div
            className="absolute"
            style={{
              left: 19,
              top: 20,
              bottom: 20,
              width: 2,
              background: 'linear-gradient(to bottom, var(--primary), var(--border))',
              borderRadius: 1,
              zIndex: 0,
            }}
          />
          {journey.stops.map((stop, i) => (
            <div key={stop.id} role="listitem" aria-label={`Stop ${i + 1} of ${journey.stops.length}: ${stop.place}${stop.region ? `, ${stop.region}` : ''}. Day ${stop.arrivalDay}.`}>
              <div className="flex gap-4 items-start">
                {/* Numbered timeline dot */}
                <div className="flex-shrink-0 relative" style={{ zIndex: 1 }}>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{
                      background: i === 0 || i === journey.stops.length - 1 ? 'var(--primary)' : 'var(--surface)',
                      color: i === 0 || i === journey.stops.length - 1 ? '#fff' : 'var(--primary)',
                      border: '2px solid var(--primary)',
                    }}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </div>
                </div>
                {/* Stop card */}
                <article
                  className="flex-1 rounded-2xl overflow-hidden mb-4"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', minWidth: 0 }}
                >
                  <JourneyStopMediaGallery
                    mediaUrls={stop.mediaUrls}
                    mediaResourceTypes={stop.mediaResourceTypes}
                  />
                  <div className="p-4">
                    <p className="text-xs font-bold m-0 mb-1" style={{ color: 'var(--primary)' }}>
                      Day {stop.arrivalDay}
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
                  </div>
                </article>
              </div>
              {/* Transport connector between stops */}
              {stop.transportModeToNext && i < journey.stops.length - 1 && (
                <div
                  className="flex items-center gap-2 mb-3 ml-14"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  <Car size={13} aria-hidden="true" />

                  <span className="text-xs font-medium">
                    {stop.transportModeToNext}
                    {stop.transportDurationToNext ? ` · ${stop.transportDurationToNext}` : ''}
                  </span>
                </div>
              )}
            </div>
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
      <ContentReportSheet open={reportOpen} targetType="JOURNEY" targetId={journey.id} onClose={() => setReportOpen(false)} />
    </div>
  )
}
