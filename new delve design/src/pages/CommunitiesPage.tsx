import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Users, Search, MapPin, Lock, CheckCircle, Loader2, AlertCircle, LogIn,
  MessageCircle, HelpCircle, Bookmark, ThumbsUp, ArrowLeft, X, Pin, BadgeCheck,
} from 'lucide-react'
import type {
  CommunityDto,
  CommunityJoinRequest,
  CommunityThreadDetail,
  CommunityThreadKind,
  CommunityThreadSummary,
  CommunityType,
} from '@delve/contracts'
import {
  joinCommunity,
  leaveCommunity,
  listCommunities,
  listMyCommunities,
  listCommunityThreads,
  listJoinRequests,
  approveJoinRequest,
  denyJoinRequest,
  fetchThread,
  createCommunityThread,
  addThreadAnswer,
  acceptThreadAnswer,
  markAnswerHelpful,
} from '../api/communityClient'
import { saveItem, unsaveItem } from '../api/socialClient'
import { AuthApiError } from '../api/authClient'
import { formatUsername } from '../lib/formatUsername'

type Tab = 'discover' | 'yours' | 'questions' | 'discussions'
type ComposeKind = CommunityThreadKind

const TYPE_FILTERS: { label: string; value: CommunityType | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Destination', value: 'DESTINATION' },
  { label: 'Interest', value: 'INTEREST' },
  { label: 'Transport', value: 'TRANSPORT' },
  { label: 'Official', value: 'OFFICIAL' },
]

function formatMembers(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return String(n)
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${Math.max(1, m)}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function typeLabel(t: CommunityType) {
  return t.charAt(0) + t.slice(1).toLowerCase()
}

function threadCountLabel(kind: CommunityThreadKind, n: number) {
  return kind === 'QUESTION' ? `${n} answers` : `${n} replies`
}

function errMessage(err: unknown, fallback: string) {
  return err instanceof AuthApiError || err instanceof Error ? err.message : fallback
}

function JoinRequestsPanel({ communityId }: { communityId: string }) {
  const [requests, setRequests] = useState<CommunityJoinRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRequests(await listJoinRequests(communityId))
    } catch (err) {
      setRequests([])
      setError(errMessage(err, 'Could not load join requests'))
    } finally {
      setLoading(false)
    }
  }, [communityId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleAction(userId: string, action: 'approve' | 'deny') {
    setBusyUserId(userId)
    setError(null)
    try {
      if (action === 'approve') await approveJoinRequest(communityId, userId)
      else await denyJoinRequest(communityId, userId)
      await load()
    } catch (err) {
      setError(errMessage(err, action === 'approve' ? 'Could not approve' : 'Could not deny'))
    } finally {
      setBusyUserId(null)
    }
  }

  return (
    <div
      className="rounded-xl px-3 py-2.5 flex flex-col gap-2"
      style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
    >
      <p className="text-xs font-bold m-0" style={{ color: 'var(--fg)' }}>
        Pending requests
        {!loading && requests.length > 0 ? ` · ${requests.length}` : ''}
      </p>

      {loading ? (
        <div className="flex items-center gap-2 py-1">
          <Loader2 size={14} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />
          <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            Loading…
          </span>
        </div>
      ) : error ? (
        <div className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--auth-danger, #C42A2A)' }}>
          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : requests.length === 0 ? (
        <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
          No pending requests
        </p>
      ) : (
        <ul className="m-0 p-0 list-none flex flex-col gap-2">
          {requests.map(r => {
            const username = formatUsername(r.username)
            return (
              <li key={r.userId} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold m-0 truncate" style={{ color: 'var(--fg)' }}>
                    {r.displayName}
                    {username ? ` · ${username}` : ''}
                  </p>
                  <p className="text-[11px] m-0" style={{ color: 'var(--fg-muted)' }}>
                    {timeAgo(r.requestedAt)}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={busyUserId === r.userId}
                    onClick={() => void handleAction(r.userId, 'approve')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold disabled:opacity-60"
                    style={{ background: 'var(--primary)', color: '#fff' }}
                  >
                    {busyUserId === r.userId ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      'Approve'
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={busyUserId === r.userId}
                    onClick={() => void handleAction(r.userId, 'deny')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold disabled:opacity-60"
                    style={{
                      background: 'var(--surface)',
                      color: 'var(--fg)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    Deny
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function CommunityCard({
  community,
  busy,
  signedIn,
  onToggle,
  onSignIn,
}: {
  community: CommunityDto
  busy: boolean
  signedIn: boolean
  onToggle: (c: CommunityDto) => void
  onSignIn?: () => void
}) {
  const joined =
    community.membershipStatus === 'joined' || community.membershipStatus === 'moderator'
  const requested = community.membershipStatus === 'requested'

  return (
    <article
      className="overflow-hidden sm:rounded-2xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="relative h-36 bg-black/10">
        {community.coverUrl ? (
          <img src={community.coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Users size={28} style={{ color: 'var(--fg-muted)' }} />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
          >
            {typeLabel(community.communityType)}
          </span>
          {community.official && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--primary)', color: '#fff' }}
            >
              Official
            </span>
          )}
          {community.privacy === 'PRIVATE' && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
            >
              <Lock size={10} /> Private
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-3 flex flex-col gap-2">
        <div>
          <h3
            className="text-sm font-bold m-0 mb-0.5"
            style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}
          >
            {community.name}
          </h3>
          <p className="text-xs m-0 flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
            <MapPin size={12} /> {community.destination}
            <span aria-hidden>·</span>
            {formatMembers(community.memberCount)} members
            <span aria-hidden>·</span>
            {timeAgo(community.lastActivityAt)}
          </p>
        </div>
        <p className="text-xs m-0 line-clamp-2" style={{ color: 'var(--fg-muted)' }}>
          {community.description}
        </p>
        {community.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {community.topics.slice(0, 4).map(t => (
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
        <div className="pt-1">
          {!signedIn ? (
            <button
              type="button"
              onClick={onSignIn}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
              style={{ background: 'var(--primary)', color: '#fff' }}
            >
              Sign in to join
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => onToggle(community)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60 inline-flex items-center justify-center gap-2"
              style={
                joined || requested
                  ? { background: 'var(--surface-subtle)', color: 'var(--fg)', border: '1px solid var(--border)' }
                  : { background: 'var(--primary)', color: '#fff' }
              }
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : joined ? (
                <>
                  <CheckCircle size={16} /> Joined · Leave
                </>
              ) : requested ? (
                <>Requested · Cancel</>
              ) : community.privacy === 'PRIVATE' ? (
                'Request to join'
              ) : (
                'Join community'
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function ThreadCard({
  thread,
  onOpen,
  onToggleSave,
  saveBusy,
  signedIn,
  onSignIn,
}: {
  thread: CommunityThreadSummary
  onOpen: (id: string) => void
  onToggleSave: (thread: CommunityThreadSummary) => void
  saveBusy: boolean
  signedIn: boolean
  onSignIn?: () => void
}) {
  const isQuestion = thread.kind === 'QUESTION'

  return (
    <article
      className="sm:rounded-2xl px-4 py-3.5 flex flex-col gap-2 cursor-pointer transition-opacity hover:opacity-[0.97]"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      onClick={() => onOpen(thread.id)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(thread.id)
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span
            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)' }}
          >
            {isQuestion ? <HelpCircle size={10} /> : <MessageCircle size={10} />}
            {isQuestion ? 'Question' : 'Discussion'}
          </span>
          {thread.pinned && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--surface-subtle)', color: 'var(--fg)' }}
            >
              <Pin size={10} /> Pinned
            </span>
          )}
          {thread.official && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--primary)', color: '#fff' }}
            >
              <BadgeCheck size={10} /> Official
            </span>
          )}
          {thread.topic && (
            <span className="text-[11px] font-semibold" style={{ color: 'var(--fg-muted)' }}>
              {thread.topic}
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label={thread.savedByMe ? 'Unsave' : 'Save'}
          disabled={saveBusy}
          onClick={e => {
            e.stopPropagation()
            if (!signedIn) {
              onSignIn?.()
              return
            }
            onToggleSave(thread)
          }}
          className="p-1.5 rounded-lg shrink-0 disabled:opacity-50"
          style={{ color: thread.savedByMe ? 'var(--primary)' : 'var(--fg-muted)' }}
        >
          <Bookmark size={16} fill={thread.savedByMe ? 'currentColor' : 'none'} />
        </button>
      </div>

      <h3
        className="text-sm font-bold m-0"
        style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}
      >
        {thread.title}
      </h3>

      {thread.body ? (
        <p className="text-xs m-0 line-clamp-2" style={{ color: 'var(--fg-muted)' }}>
          {thread.body}
        </p>
      ) : null}

      {thread.acceptedAnswer && (
        <div
          className="rounded-xl px-3 py-2 text-xs"
          style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
        >
          <p className="m-0 mb-1 font-semibold inline-flex items-center gap-1" style={{ color: 'var(--fg)' }}>
            <CheckCircle size={12} style={{ color: 'var(--primary)' }} />
            Accepted · {thread.acceptedAnswer.author.displayName}
          </p>
          <p className="m-0 line-clamp-2" style={{ color: 'var(--fg-muted)' }}>
            {thread.acceptedAnswer.body}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
        <span className="truncate">
          {thread.author.displayName}
          {formatUsername(thread.author.username) ? ` · ${formatUsername(thread.author.username)}` : ''}
          <span aria-hidden> · </span>
          {thread.community.name}
          <span aria-hidden> · </span>
          {timeAgo(thread.createdAt)}
        </span>
        <span className="shrink-0 font-semibold">{threadCountLabel(thread.kind, thread.answerCount)}</span>
      </div>
    </article>
  )
}

function ComposeSheet({
  kind,
  communities,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  kind: ComposeKind
  communities: CommunityDto[]
  busy: boolean
  error: string | null
  onClose: () => void
  onSubmit: (input: {
    communityId: string
    title: string
    body: string
    topic: string
  }) => void
}) {
  const joinable = communities.filter(
    c => c.membershipStatus === 'joined' || c.membershipStatus === 'moderator',
  )
  const options = joinable.length > 0 ? joinable : communities
  const [communityId, setCommunityId] = useState(options[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [topic, setTopic] = useState('')

  useEffect(() => {
    if (!communityId && options[0]) setCommunityId(options[0].id)
  }, [communityId, options])

  const titleOk = title.trim().length >= 3

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(12,10,9,0.55)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="compose-sheet-title"
    >
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl px-4 pt-4 pb-6 flex flex-col gap-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <h2
            id="compose-sheet-title"
            className="text-lg font-extrabold m-0"
            style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}
          >
            {kind === 'QUESTION' ? 'Ask a question' : 'Start a discussion'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl"
            style={{ color: 'var(--fg-muted)' }}
            aria-label="Close composer"
          >
            <X size={18} />
          </button>
        </div>

        {options.length === 0 ? (
          <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
            Join a community first, then come back to post.
          </p>
        ) : (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>
                Community
              </span>
              <select
                value={communityId}
                onChange={e => setCommunityId(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{
                  background: 'var(--surface-subtle)',
                  color: 'var(--fg)',
                  border: '1px solid var(--border)',
                }}
              >
                {options.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>
                Title
              </span>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={200}
                placeholder={kind === 'QUESTION' ? 'What do you want to know?' : 'What should we talk about?'}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{
                  background: 'var(--surface-subtle)',
                  color: 'var(--fg)',
                  border: '1px solid var(--border)',
                }}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>
                Details (optional)
              </span>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                maxLength={5000}
                rows={4}
                placeholder="Add context so people can help."
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-y min-h-[96px]"
                style={{
                  background: 'var(--surface-subtle)',
                  color: 'var(--fg)',
                  border: '1px solid var(--border)',
                }}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>
                Topic (optional)
              </span>
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                maxLength={80}
                placeholder="e.g. Transport, Food, Safety"
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{
                  background: 'var(--surface-subtle)',
                  color: 'var(--fg)',
                  border: '1px solid var(--border)',
                }}
              />
            </label>
          </>
        )}

        {error && (
          <div
            className="px-3 py-2.5 rounded-xl flex items-start gap-2 text-sm"
            style={{ background: 'rgba(196,42,42,0.08)', color: 'var(--auth-danger, #C42A2A)' }}
          >
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--surface-subtle)', color: 'var(--fg)', border: '1px solid var(--border)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !titleOk || !communityId || options.length === 0}
            onClick={() =>
              onSubmit({
                communityId,
                title: title.trim(),
                body: body.trim(),
                topic: topic.trim(),
              })
            }
            className="flex-1 py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : kind === 'QUESTION' ? 'Post question' : 'Post discussion'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ThreadDetailView({
  thread,
  signedIn,
  onSignIn,
  onBack,
  onUpdated,
  onError,
}: {
  thread: CommunityThreadDetail
  signedIn: boolean
  onSignIn?: () => void
  onBack: () => void
  onUpdated: (t: CommunityThreadDetail) => void
  onError: (msg: string) => void
}) {
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState<'reply' | 'save' | string | null>(null)
  const isQuestion = thread.kind === 'QUESTION'

  async function handleSave() {
    if (!signedIn) {
      onSignIn?.()
      return
    }
    setBusy('save')
    try {
      const body = { targetType: 'COMMUNITY_THREAD' as const, targetId: thread.id }
      if (thread.savedByMe) await unsaveItem(body)
      else await saveItem(body)
      onUpdated({ ...thread, savedByMe: !thread.savedByMe })
    } catch (err) {
      onError(errMessage(err, 'Could not update save'))
    } finally {
      setBusy(null)
    }
  }

  async function handleReply() {
    if (!signedIn) {
      onSignIn?.()
      return
    }
    const body = reply.trim()
    if (!body) return
    setBusy('reply')
    try {
      const updated = await addThreadAnswer(thread.id, { body })
      onUpdated(updated)
      setReply('')
    } catch (err) {
      onError(errMessage(err, 'Could not post reply'))
    } finally {
      setBusy(null)
    }
  }

  async function handleAccept(answerId: string) {
    if (!signedIn) {
      onSignIn?.()
      return
    }
    setBusy(`accept:${answerId}`)
    try {
      onUpdated(await acceptThreadAnswer(thread.id, answerId))
    } catch (err) {
      onError(errMessage(err, 'Could not accept answer'))
    } finally {
      setBusy(null)
    }
  }

  async function handleHelpful(answerId: string) {
    if (!signedIn) {
      onSignIn?.()
      return
    }
    setBusy(`helpful:${answerId}`)
    try {
      onUpdated(await markAnswerHelpful(answerId))
    } catch (err) {
      onError(errMessage(err, 'Could not mark helpful'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="pb-8">
      <div className="px-4 sm:px-0 pt-3 pb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1.5 rounded-xl"
          style={{ color: 'var(--fg)', background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={busy === 'save'}
          className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1.5 rounded-xl disabled:opacity-60"
          style={{
            color: thread.savedByMe ? 'var(--primary)' : 'var(--fg)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          {busy === 'save' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Bookmark size={14} fill={thread.savedByMe ? 'currentColor' : 'none'} />
          )}
          {thread.savedByMe ? 'Saved' : 'Save'}
        </button>
      </div>

      <article
        className="mx-4 sm:mx-0 sm:rounded-2xl px-4 py-4 flex flex-col gap-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)' }}
          >
            {isQuestion ? <HelpCircle size={10} /> : <MessageCircle size={10} />}
            {isQuestion ? 'Question' : 'Discussion'}
          </span>
          {thread.topic && (
            <span className="text-[11px] font-semibold" style={{ color: 'var(--fg-muted)' }}>
              {thread.topic}
            </span>
          )}
        </div>

        <h1
          className="text-xl font-extrabold m-0"
          style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}
        >
          {thread.title}
        </h1>

        {thread.body ? (
          <p className="text-sm m-0 whitespace-pre-wrap" style={{ color: 'var(--fg)' }}>
            {thread.body}
          </p>
        ) : null}

        <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
          {thread.author.displayName}
          {formatUsername(thread.author.username) ? ` · ${formatUsername(thread.author.username)}` : ''}
          <span aria-hidden> · </span>
          {thread.community.name} · {thread.community.destination}
          <span aria-hidden> · </span>
          {timeAgo(thread.createdAt)}
          <span aria-hidden> · </span>
          {threadCountLabel(thread.kind, thread.answerCount)}
        </p>
      </article>

      <section className="px-4 sm:px-0 pt-5">
        <h2
          className="text-base font-bold m-0 mb-3"
          style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}
        >
          {isQuestion ? 'Answers' : 'Replies'}
        </h2>

        {thread.answers.length === 0 ? (
          <p className="text-sm m-0 mb-4" style={{ color: 'var(--fg-muted)' }}>
            {isQuestion ? 'No answers yet — be the first to help.' : 'No replies yet — start the conversation.'}
          </p>
        ) : (
          <div className="flex flex-col gap-3 mb-4">
            {thread.answers.map(a => (
              <div
                key={a.id}
                className="sm:rounded-2xl px-4 py-3 flex flex-col gap-2"
                style={{
                  background: 'var(--surface)',
                  border: a.isAccepted ? '1px solid var(--primary)' : '1px solid var(--border)',
                }}
              >
                {a.isAccepted && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-bold self-start"
                    style={{ color: 'var(--primary)' }}
                  >
                    <CheckCircle size={12} /> Accepted answer
                  </span>
                )}
                <p className="text-sm m-0 whitespace-pre-wrap" style={{ color: 'var(--fg)' }}>
                  {a.body}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                  <span>
                    {a.author.displayName}
                    {formatUsername(a.author.username) ? ` · ${formatUsername(a.author.username)}` : ''}
                    <span aria-hidden> · </span>
                    {timeAgo(a.createdAt)}
                  </span>
                  <button
                    type="button"
                    disabled={busy === `helpful:${a.id}`}
                    onClick={() => void handleHelpful(a.id)}
                    className="inline-flex items-center gap-1 font-semibold px-2 py-1 rounded-lg disabled:opacity-60"
                    style={{ color: 'var(--fg)', background: 'var(--surface-subtle)' }}
                  >
                    {busy === `helpful:${a.id}` ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <ThumbsUp size={12} />
                    )}
                    Helpful · {a.helpfulCount}
                  </button>
                  {thread.canAccept && isQuestion && !a.isAccepted && (
                    <button
                      type="button"
                      disabled={busy === `accept:${a.id}`}
                      onClick={() => void handleAccept(a.id)}
                      className="inline-flex items-center gap-1 font-semibold px-2 py-1 rounded-lg disabled:opacity-60"
                      style={{ color: '#fff', background: 'var(--primary)' }}
                    >
                      {busy === `accept:${a.id}` ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <CheckCircle size={12} />
                      )}
                      Accept
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          className="sm:rounded-2xl px-4 py-3 flex flex-col gap-2"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs font-semibold m-0" style={{ color: 'var(--fg-muted)' }}>
            {isQuestion ? 'Your answer' : 'Your reply'}
          </p>
          {!signedIn ? (
            <button
              type="button"
              onClick={onSignIn}
              className="w-full py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--primary)', color: '#fff' }}
            >
              Sign in to reply
            </button>
          ) : (
            <>
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                maxLength={4000}
                rows={3}
                placeholder={isQuestion ? 'Share a clear, practical answer…' : 'Add to the discussion…'}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-y min-h-[80px]"
                style={{
                  background: 'var(--surface-subtle)',
                  color: 'var(--fg)',
                  border: '1px solid var(--border)',
                }}
              />
              <button
                type="button"
                disabled={busy === 'reply' || !reply.trim()}
                onClick={() => void handleReply()}
                className="self-end px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60"
                style={{ background: 'var(--primary)', color: '#fff' }}
              >
                {busy === 'reply' ? <Loader2 size={16} className="animate-spin" /> : null}
                {isQuestion ? 'Post answer' : 'Post reply'}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

export default function CommunitiesPage({
  signedIn = false,
  onSignIn,
}: {
  signedIn?: boolean
  onSignIn?: () => void
} = {}) {
  const [tab, setTab] = useState<Tab>('discover')
  const [typeFilter, setTypeFilter] = useState<CommunityType | 'ALL'>('ALL')
  const [query, setQuery] = useState('')
  const [submittedQ, setSubmittedQ] = useState('')
  const [discover, setDiscover] = useState<CommunityDto[]>([])
  const [mine, setMine] = useState<CommunityDto[]>([])
  const [threads, setThreads] = useState<CommunityThreadSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [saveBusyId, setSaveBusyId] = useState<string | null>(null)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [activeThread, setActiveThread] = useState<CommunityThreadDetail | null>(null)
  const [threadLoading, setThreadLoading] = useState(false)
  const [composeKind, setComposeKind] = useState<ComposeKind | null>(null)
  const [composeBusy, setComposeBusy] = useState(false)
  const [composeError, setComposeError] = useState<string | null>(null)

  const isThreadTab = tab === 'questions' || tab === 'discussions'

  const loadDiscover = useCallback(async (q: string, type: CommunityType | 'ALL') => {
    setLoading(true)
    setError(null)
    try {
      const rows = await listCommunities({
        q: q || undefined,
        type: type === 'ALL' ? undefined : type,
      })
      setDiscover(rows)
    } catch (err) {
      setDiscover([])
      setError(errMessage(err, 'Could not load communities'))
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMine = useCallback(async () => {
    if (!signedIn) {
      setMine([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setMine(await listMyCommunities())
    } catch (err) {
      setMine([])
      setError(errMessage(err, 'Could not load your communities'))
    } finally {
      setLoading(false)
    }
  }, [signedIn])

  const loadThreads = useCallback(async (kind: CommunityThreadKind, q: string) => {
    setLoading(true)
    setError(null)
    try {
      setThreads(await listCommunityThreads({ kind, q: q || undefined }))
    } catch (err) {
      setThreads([])
      setError(errMessage(err, 'Could not load threads'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeThreadId) return
    if (tab === 'discover') void loadDiscover(submittedQ, typeFilter)
    else if (tab === 'yours') void loadMine()
    else if (tab === 'questions') void loadThreads('QUESTION', submittedQ)
    else void loadThreads('DISCUSSION', submittedQ)
  }, [tab, submittedQ, typeFilter, loadDiscover, loadMine, loadThreads, activeThreadId])

  useEffect(() => {
    if (!activeThreadId) {
      setActiveThread(null)
      return
    }
    let cancelled = false
    setThreadLoading(true)
    setError(null)
    void fetchThread(activeThreadId)
      .then(t => {
        if (!cancelled) setActiveThread(t)
      })
      .catch(err => {
        if (!cancelled) {
          setActiveThread(null)
          setActiveThreadId(null)
          setError(errMessage(err, 'Could not open thread'))
        }
      })
      .finally(() => {
        if (!cancelled) setThreadLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeThreadId])

  function patchLists(updated: CommunityDto) {
    setDiscover(prev => prev.map(c => (c.id === updated.id ? updated : c)))
    setMine(prev => {
      const isMember =
        updated.membershipStatus === 'joined' ||
        updated.membershipStatus === 'moderator' ||
        updated.membershipStatus === 'requested'
      if (!isMember) return prev.filter(c => c.id !== updated.id)
      const exists = prev.some(c => c.id === updated.id)
      if (exists) return prev.map(c => (c.id === updated.id ? updated : c))
      return [updated, ...prev]
    })
  }

  async function handleToggle(c: CommunityDto) {
    if (!signedIn) {
      onSignIn?.()
      return
    }
    const isMember =
      c.membershipStatus === 'joined' ||
      c.membershipStatus === 'moderator' ||
      c.membershipStatus === 'requested'
    setBusyId(c.id)
    try {
      const result = isMember ? await leaveCommunity(c.id) : await joinCommunity(c.id)
      patchLists(result.community)
    } catch (err) {
      setError(errMessage(err, 'Action failed'))
    } finally {
      setBusyId(null)
    }
  }

  async function handleToggleSave(thread: CommunityThreadSummary) {
    if (!signedIn) {
      onSignIn?.()
      return
    }
    setSaveBusyId(thread.id)
    try {
      const body = { targetType: 'COMMUNITY_THREAD' as const, targetId: thread.id }
      if (thread.savedByMe) await unsaveItem(body)
      else await saveItem(body)
      const next = !thread.savedByMe
      setThreads(prev => prev.map(t => (t.id === thread.id ? { ...t, savedByMe: next } : t)))
      if (activeThread?.id === thread.id) {
        setActiveThread({ ...activeThread, savedByMe: next })
      }
    } catch (err) {
      setError(errMessage(err, 'Could not update save'))
    } finally {
      setSaveBusyId(null)
    }
  }

  function openCompose(kind: ComposeKind) {
    if (!signedIn) {
      onSignIn?.()
      return
    }
    setComposeError(null)
    setComposeKind(kind)
  }

  async function handleComposeSubmit(input: {
    communityId: string
    title: string
    body: string
    topic: string
  }) {
    if (!composeKind) return
    setComposeBusy(true)
    setComposeError(null)
    try {
      const created = await createCommunityThread(input.communityId, {
        kind: composeKind,
        title: input.title,
        body: input.body || undefined,
        topic: input.topic || null,
      })
      setComposeKind(null)
      setTab(composeKind === 'QUESTION' ? 'questions' : 'discussions')
      setSubmittedQ('')
      setQuery('')
      setActiveThreadId(created.id)
      setActiveThread(created)
      setThreads(prev => {
        const summary: CommunityThreadSummary = {
          id: created.id,
          kind: created.kind,
          title: created.title,
          body: created.body,
          topic: created.topic,
          pinned: created.pinned,
          official: created.official,
          answerCount: created.answerCount,
          createdAt: created.createdAt,
          author: created.author,
          community: created.community,
          acceptedAnswer: created.acceptedAnswer,
          savedByMe: created.savedByMe,
        }
        return [summary, ...prev.filter(t => t.id !== summary.id)]
      })
    } catch (err) {
      setComposeError(errMessage(err, 'Could not create thread'))
    } finally {
      setComposeBusy(false)
    }
  }

  function runSearch() {
    setSubmittedQ(query.trim())
    if (tab === 'yours') setTab('discover')
  }

  const list = tab === 'discover' ? discover : mine
  const pickerCommunities = useMemo(() => {
    const map = new Map<string, CommunityDto>()
    for (const c of mine) map.set(c.id, c)
    for (const c of discover) if (!map.has(c.id)) map.set(c.id, c)
    return Array.from(map.values())
  }, [mine, discover])

  useEffect(() => {
    if (!signedIn || mine.length > 0) return
    void listMyCommunities()
      .then(setMine)
      .catch(() => {})
  }, [signedIn, mine.length, composeKind])

  const emptyCopy = useMemo(() => {
    if (tab === 'yours') {
      return signedIn
        ? { title: 'No communities yet', body: 'Join a destination or interest group from Discover.' }
        : { title: 'Sign in to see yours', body: 'Your joined communities will show up here.' }
    }
    if (tab === 'questions') {
      return submittedQ
        ? { title: 'No matching questions', body: 'Try another search.' }
        : { title: 'No questions yet', body: 'Ask locals something practical about your trip.' }
    }
    if (tab === 'discussions') {
      return submittedQ
        ? { title: 'No matching discussions', body: 'Try another search.' }
        : { title: 'No discussions yet', body: 'Start a conversation in a community you joined.' }
    }
    if (submittedQ) {
      return { title: 'No matches', body: 'Try another search or clear filters.' }
    }
    return { title: 'No communities', body: 'Check back soon — hubs are being seeded.' }
  }, [tab, signedIn, submittedQ])

  if (activeThreadId) {
    return (
      <div className="pb-8">
        {error && (
          <div
            className="mx-4 sm:mx-0 mt-4 px-3 py-2.5 rounded-xl flex items-start gap-2 text-sm"
            style={{ background: 'rgba(196,42,42,0.08)', color: 'var(--auth-danger, #C42A2A)' }}
          >
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {threadLoading || !activeThread ? (
          <div className="px-4 sm:px-0 py-12 flex justify-center">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />
          </div>
        ) : (
          <ThreadDetailView
            thread={activeThread}
            signedIn={signedIn}
            onSignIn={onSignIn}
            onBack={() => {
              setActiveThreadId(null)
              setActiveThread(null)
            }}
            onUpdated={t => {
              setActiveThread(t)
              setThreads(prev =>
                prev.map(row =>
                  row.id === t.id
                    ? {
                        ...row,
                        title: t.title,
                        body: t.body,
                        answerCount: t.answerCount,
                        acceptedAnswer: t.acceptedAnswer,
                        savedByMe: t.savedByMe,
                      }
                    : row,
                ),
              )
            }}
            onError={setError}
          />
        )}
      </div>
    )
  }

  return (
    <div className="pb-8">
      <section
        className="px-4 sm:px-0 pt-4 pb-5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <p
          className="text-2xl font-extrabold m-0 mb-1"
          style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}
        >
          Ask, share, and explore together.
        </p>
        <p className="text-sm m-0 mb-4 max-w-xl" style={{ color: 'var(--fg-muted)' }}>
          Join destination communities, ask locals, and learn from people who know the journey.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => openCompose('QUESTION')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            <HelpCircle size={16} /> Ask a question
          </button>
          <button
            type="button"
            onClick={() => openCompose('DISCUSSION')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--surface)', color: 'var(--fg)', border: '1px solid var(--border)' }}
          >
            <MessageCircle size={16} /> Start discussion
          </button>
        </div>

        <div
          className="flex items-center gap-2 px-3 rounded-2xl"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            height: 48,
          }}
        >
          <Search size={16} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') runSearch()
            }}
            placeholder={
              isThreadTab
                ? 'Search questions and discussions…'
                : 'Search communities, places, topics…'
            }
            className="flex-1 bg-transparent text-sm outline-none min-w-0"
            style={{ color: 'var(--fg)' }}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setSubmittedQ('')
              }}
              className="text-xs font-semibold shrink-0"
              style={{ color: 'var(--fg-muted)' }}
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={runSearch}
            className="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0"
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            Search
          </button>
        </div>
      </section>

      <div className="px-4 sm:px-0 pt-4 flex gap-2 overflow-x-auto scroll-rail pb-1">
        {(
          [
            { id: 'discover' as const, label: 'Discover' },
            { id: 'yours' as const, label: 'Your communities' },
            { id: 'questions' as const, label: 'Questions' },
            { id: 'discussions' as const, label: 'Discussions' },
          ] as const
        ).map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all"
            style={{
              background: tab === t.id ? 'var(--primary)' : 'var(--surface)',
              color: tab === t.id ? '#fff' : 'var(--fg)',
              border: tab === t.id ? 'none' : '1px solid var(--border)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'discover' && (
        <div className="px-4 sm:px-0 pt-3 flex gap-2 overflow-x-auto scroll-rail pb-1">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => setTypeFilter(f.value)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: typeFilter === f.value ? 'rgba(140,82,255,0.14)' : 'var(--surface-subtle)',
                color: typeFilter === f.value ? 'var(--primary)' : 'var(--fg-muted)',
                border: typeFilter === f.value ? '1px solid var(--primary)' : '1px solid transparent',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div
          className="mx-4 sm:mx-0 mt-4 px-3 py-2.5 rounded-xl flex items-start gap-2 text-sm"
          style={{ background: 'rgba(196,42,42,0.08)', color: 'var(--auth-danger, #C42A2A)' }}
        >
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {tab === 'yours' && !signedIn && (
        <div
          className="mx-4 sm:mx-0 mt-4 px-4 py-8 text-center rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <LogIn size={28} className="mx-auto mb-2" style={{ color: 'var(--fg-muted)' }} />
          <p className="text-sm font-bold m-0 mb-1" style={{ color: 'var(--fg)' }}>
            Sign in to see your communities
          </p>
          <p className="text-xs m-0 mb-4" style={{ color: 'var(--fg-muted)' }}>
            Join destination groups and keep them here.
          </p>
          <button
            type="button"
            onClick={onSignIn}
            className="px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            Sign in
          </button>
        </div>
      )}

      {loading ? (
        <div className="px-4 sm:px-0 py-12 flex justify-center">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />
        </div>
      ) : isThreadTab ? (
        threads.length === 0 ? (
          <div className="px-4 sm:px-0 py-12 text-center">
            {tab === 'questions' ? (
              <HelpCircle size={32} className="mx-auto mb-3" style={{ color: 'var(--border)' }} />
            ) : (
              <MessageCircle size={32} className="mx-auto mb-3" style={{ color: 'var(--border)' }} />
            )}
            <p
              className="text-base font-bold m-0 mb-1"
              style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}
            >
              {emptyCopy.title}
            </p>
            <p className="text-sm m-0 mb-4" style={{ color: 'var(--fg-muted)' }}>
              {emptyCopy.body}
            </p>
            <button
              type="button"
              onClick={() => openCompose(tab === 'questions' ? 'QUESTION' : 'DISCUSSION')}
              className="px-4 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--primary)', color: '#fff' }}
            >
              {tab === 'questions' ? 'Ask a question' : 'Start discussion'}
            </button>
          </div>
        ) : (
          <div className="px-4 sm:px-0 pt-4 flex flex-col gap-3">
            {threads.map(t => (
              <ThreadCard
                key={t.id}
                thread={t}
                onOpen={setActiveThreadId}
                onToggleSave={th => void handleToggleSave(th)}
                saveBusy={saveBusyId === t.id}
                signedIn={signedIn}
                onSignIn={onSignIn}
              />
            ))}
          </div>
        )
      ) : list.length === 0 && !(tab === 'yours' && !signedIn) ? (
        <div className="px-4 sm:px-0 py-12 text-center">
          <Users size={32} className="mx-auto mb-3" style={{ color: 'var(--border)' }} />
          <p
            className="text-base font-bold m-0 mb-1"
            style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}
          >
            {emptyCopy.title}
          </p>
          <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
            {emptyCopy.body}
          </p>
        </div>
      ) : (
        <div className="px-4 sm:px-0 pt-4 grid gap-3 sm:grid-cols-2">
          {list.map(c => (
            <div key={c.id} className="flex flex-col gap-2">
              <CommunityCard
                community={c}
                busy={busyId === c.id}
                signedIn={signedIn}
                onToggle={handleToggle}
                onSignIn={onSignIn}
              />
              {tab === 'yours' &&
                signedIn &&
                c.membershipStatus === 'moderator' &&
                c.privacy === 'PRIVATE' && <JoinRequestsPanel communityId={c.id} />}
            </div>
          ))}
        </div>
      )}

      {composeKind && (
        <ComposeSheet
          kind={composeKind}
          communities={pickerCommunities}
          busy={composeBusy}
          error={composeError}
          onClose={() => {
            if (!composeBusy) {
              setComposeKind(null)
              setComposeError(null)
            }
          }}
          onSubmit={input => void handleComposeSubmit(input)}
        />
      )}
    </div>
  )
}
