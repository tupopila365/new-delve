import { useEffect, useState } from 'react'
import {
  ArrowLeft, Bookmark, MapPin, Clock, Users, Eye, Loader2, AlertCircle, Car, Pencil, Heart, MessageCircle,
} from 'lucide-react'
import type { JourneyCommentDto, JourneyDetail } from '@delve/contracts'
import {
  addJourneyComment,
  fetchJourney,
  fetchJourneyComments,
  likeJourney,
  unlikeJourney,
} from '../api/journeyClient'
import { saveItem, unsaveItem } from '../api/socialClient'
import { getStoredUser } from '../api/authClient'
import { AuthApiError } from '../api/authClient'
import { formatUsername } from '../lib/formatUsername'
import JourneyEditorSheet from '../components/journeys/JourneyEditorSheet'

interface Props {
  journeyId: string
  signedIn?: boolean
  onBack: () => void
  onSignIn?: () => void
  onOpenProfile?: (username: string) => void
  onOpenGroupChat?: (journeyId: string) => void
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
}: Props) {
  const [journey, setJourney] = useState<JourneyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saveBusy, setSaveBusy] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeBusy, setLikeBusy] = useState(false)
  const [comments, setComments] = useState<JourneyCommentDto[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [commentBusy, setCommentBusy] = useState(false)
  const viewerId = getStoredUser()?.id
  const isOwner = Boolean(journey && viewerId && journey.author.id === viewerId)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void fetchJourney(journeyId)
      .then(j => {
        if (cancelled) return
        setJourney(j)
        setSaved(j.savedByMe)
        setLiked(j.likedByMe)
      })
      .catch(err => {
        if (cancelled) return
        setJourney(null)
        setError(err instanceof AuthApiError || err instanceof Error ? err.message : 'Could not load journey')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [journeyId])

  useEffect(() => {
    let cancelled = false
    setCommentsLoading(true)
    void fetchJourneyComments(journeyId)
      .then(rows => {
        if (!cancelled) setComments(rows)
      })
      .catch(() => {
        if (!cancelled) setComments([])
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [journeyId])

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

  async function submitComment() {
    if (!journey || !commentDraft.trim()) return
    if (!signedIn) {
      onSignIn?.()
      return
    }
    setCommentBusy(true)
    try {
      const created = await addJourneyComment(journey.id, commentDraft.trim())
      setComments(prev => [...prev, created])
      setCommentDraft('')
      setJourney(j => (j ? { ...j, commentCount: j.commentCount + 1 } : j))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post comment')
    } finally {
      setCommentBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />
      </div>
    )
  }

  if (error || !journey) {
    return (
      <div className="px-4 py-12 text-center">
        <AlertCircle size={32} className="mx-auto mb-3" style={{ color: 'var(--border)' }} />
        <p className="text-base font-bold m-0 mb-2" style={{ color: 'var(--fg)' }}>
          {error || 'Journey not found'}
        </p>
        <button type="button" onClick={onBack} className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
          Back to Journeys
        </button>
      </div>
    )
  }

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
        </div>
      </div>

      <div className="relative h-56 sm:h-72 sm:rounded-2xl overflow-hidden bg-black/10 sm:mx-0">
        {journey.coverUrl || journey.media[0] ? (
          <img
            src={journey.coverUrl || journey.media[0]}
            alt=""
            className="w-full h-full object-cover"
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
              {stop.mediaUrls[0] && (
                <img src={stop.mediaUrls[0]} alt="" className="w-full h-36 object-cover" />
              )}
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
          className="mt-6 rounded-2xl p-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <h2 className="text-base font-bold m-0 mb-3 inline-flex items-center gap-2" style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}>
            <MessageCircle size={18} /> Comments
          </h2>
          {commentsLoading ? (
            <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>Loading comments…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm m-0 mb-3" style={{ color: 'var(--fg-muted)' }}>
              No comments yet. Be the first to ask a question or share a tip.
            </p>
          ) : (
            <div className="flex flex-col gap-3 mb-3">
              {comments.map(c => (
                <div key={c.id}>
                  <p className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>
                    {c.author.displayName || formatUsername(c.author.username)}
                  </p>
                  <p className="text-sm m-0" style={{ color: 'var(--fg)' }}>{c.body}</p>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={commentDraft}
              onChange={e => setCommentDraft(e.target.value)}
              placeholder={signedIn ? 'Add a comment' : 'Sign in to comment'}
              disabled={commentBusy}
              className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: 'var(--surface-subtle)', color: 'var(--fg)', border: '1px solid var(--border)' }}
            />
            <button
              type="button"
              disabled={commentBusy || !commentDraft.trim()}
              onClick={() => void submitComment()}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              style={{ background: 'var(--primary)', border: 'none' }}
            >
              Post
            </button>
          </div>
        </div>
      </div>

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
