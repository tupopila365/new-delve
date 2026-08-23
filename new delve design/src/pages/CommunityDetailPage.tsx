import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, Flag, Lock, MapPin, Users, Loader2, AlertCircle, Share2, Plus,
} from 'lucide-react'
import type { CommunityDetail, CommunityRule, CommunityThreadDetail, CommunityThreadKind, CommunityThreadSummary } from '@delve/contracts'
import {
  addThreadAnswer,
  approveCommunityThread,
  createCommunityThread,
  fetchCommunity,
  fetchThread,
  joinCommunity,
  leaveCommunity,
  likeCommunityThread,
  listCommunityMembers,
  listCommunityRules,
  listCommunityThreads,
  markCommunityThreadAnswered,
  pinCommunityThread,
  removeCommunityThread,
  unlikeCommunityThread,
} from '../api/communityClient'
import { saveItem, unsaveItem } from '../api/socialClient'
import CommunityComposeSheet from '../components/communities/CommunityComposeSheet'
import CommunityModerationPanel from '../components/communities/CommunityModerationPanel'
import CommunityReportSheet from '../components/communities/CommunityReportSheet'
import CommunityRulesEditor from '../components/communities/CommunityRulesEditor'
import CommunityThreadCard from '../components/communities/CommunityThreadCard'
import {
  EVENT_KINDS,
  FEED_KINDS,
  JOURNEY_KINDS,
  QUESTION_KINDS,
  TIP_KINDS,
} from '../components/communities/communityThreadKinds'
import { categoryLabel } from '../components/communities/communityCategories'

type Tab = 'feed' | 'questions' | 'tips' | 'journeys' | 'events' | 'members' | 'about' | 'manage'

const TAB_KINDS: Partial<Record<Tab, CommunityThreadKind[]>> = {
  feed: FEED_KINDS,
  questions: QUESTION_KINDS,
  tips: TIP_KINDS,
  journeys: JOURNEY_KINDS,
  events: EVENT_KINDS,
}

export default function CommunityDetailPage({
  communityId,
  initialThreadId,
  signedIn = false,
  onBack,
  onSignIn,
  onOpenProfile,
  onOpenJourney,
  onOpenEvent,
}: {
  communityId: string
  initialThreadId?: string | null
  signedIn?: boolean
  onBack: () => void
  onSignIn?: () => void
  onOpenProfile?: (username: string) => void
  onOpenJourney?: (journeyId: string) => void
  onOpenEvent?: (eventId: string) => void
}) {
  const [community, setCommunity] = useState<CommunityDetail | null>(null)
  const [rules, setRules] = useState<CommunityRule[]>([])
  const [threads, setThreads] = useState<CommunityThreadSummary[]>([])
  const [members, setMembers] = useState<Awaited<ReturnType<typeof listCommunityMembers>>>([])
  const [tab, setTab] = useState<Tab>('feed')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [joinBusy, setJoinBusy] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [activeThread, setActiveThread] = useState<CommunityThreadDetail | null>(null)
  const [threadLoading, setThreadLoading] = useState(false)
  const [composeKind, setComposeKind] = useState<CommunityThreadKind | null>(null)
  const [composeBusy, setComposeBusy] = useState(false)
  const [composeError, setComposeError] = useState<string | null>(null)
  const [busyThreadId, setBusyThreadId] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [reportTarget, setReportTarget] = useState<{ type: 'POST' | 'COMMENT'; id: string } | null>(null)

  const canModerate = Boolean(community?.canModerate || community?.canManage)

  const loadThreads = useCallback(async (t: Tab) => {
    const kinds = TAB_KINDS[t]
    if (!kinds) return
    const rows = await listCommunityThreads({ communityId, kinds })
    setThreads(rows)
  }, [communityId])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const c = await fetchCommunity(communityId)
      setCommunity(c)
      const [r] = await Promise.all([
        listCommunityRules(communityId).catch(() => [] as CommunityRule[]),
      ])
      setRules(r)
      await loadThreads('feed')
    } catch (err) {
      setCommunity(null)
      setError(err instanceof Error ? err.message : 'Unable to load community')
    } finally {
      setLoading(false)
    }
  }, [communityId, loadThreads])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (initialThreadId) setActiveThreadId(initialThreadId)
  }, [initialThreadId])

  useEffect(() => {
    if (tab === 'members' && community) {
      void listCommunityMembers(community.id)
        .then(setMembers)
        .catch(() => setMembers([]))
    }
    if (TAB_KINDS[tab]) void loadThreads(tab).catch(() => setThreads([]))
  }, [tab, community, loadThreads])

  useEffect(() => {
    if (!activeThreadId) {
      setActiveThread(null)
      return
    }
    setThreadLoading(true)
    void fetchThread(activeThreadId)
      .then(setActiveThread)
      .catch(() => {
        setActiveThread(null)
        setActiveThreadId(null)
      })
      .finally(() => setThreadLoading(false))
  }, [activeThreadId])

  async function toggleJoin() {
    if (!community || joinBusy) return
    if (!signedIn) {
      onSignIn?.()
      return
    }
    setJoinBusy(true)
    try {
      if (community.membershipStatus === 'joined' || community.membershipStatus === 'moderator') {
        await leaveCommunity(community.id)
      } else {
        await joinCommunity(community.id)
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update membership')
    } finally {
      setJoinBusy(false)
    }
  }

  async function toggleLike(thread: CommunityThreadSummary) {
    setBusyThreadId(thread.id)
    try {
      if (thread.likedByMe) await unlikeCommunityThread(thread.id)
      else await likeCommunityThread(thread.id)
      await loadThreads(tab)
      if (activeThread?.id === thread.id) setActiveThread(await fetchThread(thread.id))
    } finally {
      setBusyThreadId(null)
    }
  }

  async function toggleSave(thread: CommunityThreadSummary) {
    setBusyThreadId(`save-${thread.id}`)
    try {
      const body = { targetType: 'COMMUNITY_THREAD' as const, targetId: thread.id }
      if (thread.savedByMe) await unsaveItem(body)
      else await saveItem(body)
      await loadThreads(tab)
    } finally {
      setBusyThreadId(null)
    }
  }

  async function submitCompose(body: Parameters<typeof createCommunityThread>[1]) {
    if (!community) return
    setComposeBusy(true)
    setComposeError(null)
    try {
      const created = await createCommunityThread(community.id, body)
      setComposeKind(null)
      setActiveThreadId(created.id)
      await loadThreads(tab)
    } catch (err) {
      setComposeError(err instanceof Error ? err.message : 'Could not post')
    } finally {
      setComposeBusy(false)
    }
  }

  async function submitReply() {
    if (!activeThread || !reply.trim()) return
    const updated = await addThreadAnswer(activeThread.id, { body: reply.trim() })
    setActiveThread(updated)
    setReply('')
    await loadThreads(tab)
  }

  const composeOptions = useMemo((): CommunityThreadKind[] => {
    if (tab === 'questions') return ['QUESTION']
    if (tab === 'tips') return ['TIP']
    if (tab === 'journeys') return ['JOURNEY_SHARE']
    if (tab === 'events') return ['EVENT_SHARE']
    return ['POST', 'DISCUSSION', 'TIP', 'ANNOUNCEMENT']
  }, [tab])

  if (loading) {
    return (
      <div className="py-16 flex justify-center" aria-busy="true">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />
      </div>
    )
  }

  if (error || !community) {
    return (
      <div className="px-4 py-12 text-center">
        <AlertCircle size={32} className="mx-auto mb-3" style={{ color: 'var(--border)' }} />
        <p className="font-bold mb-2" style={{ color: 'var(--fg)' }}>{error || 'Community not found'}</p>
        <button type="button" onClick={() => void load()} className="text-sm font-semibold mr-3" style={{ color: 'var(--primary)' }}>Retry</button>
        <button type="button" onClick={onBack} className="text-sm font-semibold" style={{ color: 'var(--fg-muted)' }}>Back</button>
      </div>
    )
  }

  if (activeThreadId) {
    return (
      <div className="pb-10 px-4 sm:px-0">
        <button type="button" onClick={() => setActiveThreadId(null)} className="inline-flex items-center gap-1.5 text-sm font-semibold mb-3" style={{ color: 'var(--primary)', background: 'none', border: 'none' }}>
          <ArrowLeft size={16} /> Back to community
        </button>
        {threadLoading || !activeThread ? (
          <div className="py-12 flex justify-center"><Loader2 size={22} className="animate-spin" style={{ color: 'var(--fg-muted)' }} /></div>
        ) : (
          <>
            <CommunityThreadCard
              thread={activeThread}
              onOpen={() => {}}
              signedIn={signedIn}
              onSignIn={onSignIn}
              onToggleLike={() => void toggleLike(activeThread)}
              onToggleSave={() => void toggleSave(activeThread)}
              likeBusy={busyThreadId === activeThread.id}
              saveBusy={busyThreadId === `save-${activeThread.id}`}
            />
            {activeThread.linkedJourney && (
              <button type="button" onClick={() => onOpenJourney?.(activeThread.linkedJourney!.id)} className="w-full mt-2 text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                View journey
              </button>
            )}
            {activeThread.linkedEvent && (
              <button type="button" onClick={() => onOpenEvent?.(activeThread.linkedEvent!.id)} className="w-full mt-2 text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                View event
              </button>
            )}
            <div className="mt-4 space-y-3">
              {activeThread.answers.map(a => (
                <div key={a.id} className="p-3 rounded-xl" style={{ border: '1px solid var(--border)' }}>
                  <p className="text-xs m-0 mb-1" style={{ color: 'var(--fg-muted)' }}>{a.author.displayName}</p>
                  <p className="text-sm m-0" style={{ color: 'var(--fg)' }}>{a.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Write a reply…" className="flex-1 px-3 py-2 rounded-xl text-sm" style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--fg)' }} />
              <button type="button" onClick={() => void submitReply()} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}>Reply</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setReportTarget({ type: 'POST', id: activeThread.id })} className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                <Flag size={14} /> Report
              </button>
              {activeThread.canModerate && (
                <>
                  <button type="button" onClick={() => void pinCommunityThread(activeThread.id, !activeThread.pinned).then(t => setActiveThread(t))} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                    {activeThread.pinned ? 'Unpin' : 'Pin'}
                  </button>
                  {activeThread.status === 'PENDING' && (
                    <button type="button" onClick={() => void approveCommunityThread(activeThread.id).then(t => setActiveThread(t))} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}>
                      Approve
                    </button>
                  )}
                  <button type="button" onClick={() => void removeCommunityThread(activeThread.id).then(() => setActiveThreadId(null))} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                    Remove
                  </button>
                  {activeThread.kind === 'QUESTION' && !activeThread.answered && (
                    <button type="button" onClick={() => void markCommunityThreadAnswered(activeThread.id).then(t => setActiveThread(t))} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ border: '1px solid var(--border)' }}>
                      Mark answered
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
        <CommunityReportSheet open={Boolean(reportTarget)} communityId={community.id} targetType={reportTarget?.type ?? 'POST'} targetId={reportTarget?.id ?? ''} onClose={() => setReportTarget(null)} />
      </div>
    )
  }

  const joined = community.membershipStatus === 'joined' || community.membershipStatus === 'moderator'
  const pending = community.membershipStatus === 'requested'

  const tabs: { id: Tab; label: string }[] = [
    { id: 'feed', label: 'Feed' },
    { id: 'questions', label: 'Questions' },
    { id: 'tips', label: 'Tips' },
    { id: 'journeys', label: 'Journeys' },
    { id: 'events', label: 'Events' },
    { id: 'members', label: 'Members' },
    { id: 'about', label: 'About' },
    ...(canModerate ? [{ id: 'manage' as Tab, label: 'Manage' }] : []),
  ]

  return (
    <div className="pb-10">
      <div className="relative h-40 sm:h-52 overflow-hidden sm:rounded-2xl bg-black/10">
        {community.coverUrl ? (
          <img src={community.coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, rgba(140,82,255,0.35), rgba(0,0,0,0.2))' }} />
        )}
      </div>

      <div className="px-4 sm:px-0 -mt-8 relative">
        <div className="flex items-end gap-3 mb-3">
          {community.avatarUrl ? (
            <img src={community.avatarUrl} alt="" className="w-16 h-16 rounded-2xl object-cover border-2" style={{ borderColor: 'var(--bg)' }} />
          ) : (
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold" style={{ background: 'var(--primary)', color: '#fff', border: '2px solid var(--bg)' }}>
              {community.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="text-xl font-extrabold m-0 truncate" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>{community.name}</h1>
            <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
              {categoryLabel(community.category)}
              {!community.isGlobal && community.city ? ` · ${community.city}` : ''}
            </p>
          </div>
        </div>

        <p className="text-sm m-0 mb-3" style={{ color: 'var(--fg-muted)' }}>{community.description}</p>
        <div className="flex flex-wrap items-center gap-3 mb-4 text-xs" style={{ color: 'var(--fg-muted)' }}>
          <span className="inline-flex items-center gap-1"><Users size={14} /> {community.memberCount.toLocaleString()} members</span>
          {community.city && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {community.city}</span>}
          {community.privacy === 'PRIVATE' && <span className="inline-flex items-center gap-1"><Lock size={14} /> Private</span>}
        </div>

        <div className="flex gap-2 mb-4">
          <button type="button" disabled={joinBusy} onClick={() => void toggleJoin()} className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60" style={{ background: joined ? 'var(--surface-subtle)' : 'var(--primary)', color: joined ? 'var(--fg)' : '#fff', border: joined ? '1px solid var(--border)' : 'none' }}>
            {joinBusy ? '…' : joined ? 'Joined' : pending ? 'Request sent' : 'Join'}
          </button>
          <button type="button" className="px-3 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }} aria-label="Share"><Share2 size={18} style={{ color: 'var(--fg)' }} /></button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
          {tabs.map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0" style={{ background: tab === t.id ? 'var(--primary)' : 'var(--surface-subtle)', color: tab === t.id ? '#fff' : 'var(--fg-muted)', border: 'none' }}>
              {t.label}
            </button>
          ))}
        </div>

        {TAB_KINDS[tab] && joined && (
          <button type="button" onClick={() => setComposeKind(composeOptions[0] ?? 'POST')} className="inline-flex items-center gap-1.5 mb-4 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}>
            <Plus size={14} /> Create post
          </button>
        )}

        {TAB_KINDS[tab] && (
          <div className="space-y-3">
            {threads.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: 'var(--fg-muted)' }}>
                {tab === 'questions' ? 'No questions yet. Ask something.' : tab === 'tips' ? 'No tips yet.' : 'Start the first conversation.'}
              </p>
            ) : (
              threads.map(thread => (
                <CommunityThreadCard
                  key={thread.id}
                  thread={thread}
                  onOpen={id => setActiveThreadId(id)}
                  signedIn={signedIn}
                  onSignIn={onSignIn}
                  onToggleLike={() => void toggleLike(thread)}
                  onToggleSave={() => void toggleSave(thread)}
                  likeBusy={busyThreadId === thread.id}
                  saveBusy={busyThreadId === `save-${thread.id}`}
                />
              ))
            )}
          </div>
        )}

        {tab === 'members' && (
          <div className="space-y-2">
            {members.map(m => (
              <button key={m.userId} type="button" onClick={() => onOpenProfile?.(m.username)} className="w-full flex items-center gap-3 p-3 rounded-xl text-left" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full" style={{ background: 'var(--border)' }} />}
                <div>
                  <p className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>{m.displayName}</p>
                  <p className="text-xs m-0 capitalize" style={{ color: 'var(--fg-muted)' }}>{m.role}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === 'about' && (
          <div>
            {community.about && <p className="text-sm whitespace-pre-wrap mb-4" style={{ color: 'var(--fg)' }}>{community.about}</p>}
            {rules.length > 0 && (
              <ol className="space-y-3 m-0 pl-4">
                {rules.map((rule, i) => (
                  <li key={rule.id} className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                    <strong style={{ color: 'var(--fg)' }}>{i + 1}. {rule.title}</strong>
                    {rule.description ? <p className="m-0 mt-1">{rule.description}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {tab === 'manage' && canModerate && (
          <div className="space-y-6">
            {community.canManage && (
              <CommunityRulesEditor
                communityId={community.id}
                rules={rules}
                onChanged={setRules}
              />
            )}
            <CommunityModerationPanel communityId={community.id} onRefresh={() => void loadThreads(tab)} />
          </div>
        )}
      </div>

      <button type="button" onClick={onBack} className="fixed top-4 left-4 z-10 inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold" style={{ background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none' }}>
        <ArrowLeft size={16} /> Back
      </button>

      {composeKind && (
        <CommunityComposeSheet
          open
          kind={composeKind}
          onClose={() => setComposeKind(null)}
          onSubmit={body => void submitCompose(body)}
          busy={composeBusy}
          error={composeError}
        />
      )}
    </div>
  )
}
