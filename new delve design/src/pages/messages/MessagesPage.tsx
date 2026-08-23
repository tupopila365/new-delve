import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, BellOff, Building2, CheckCircle, HelpCircle, LogIn,
  MapPin, MoreVertical, Navigation, Paperclip, Pin, Plus, Search, Send,
  Share2, Shield, Users, Car, Archive, Flag, Ban, Loader2,
} from 'lucide-react'
import type { PublicTravelerProfile } from '@delve/contracts'
import { listBlockedUsers, unblockUser } from '../../api/messageClient'
import { searchTravelers } from '../../api/socialClient'
import { listMyJourneys } from '../../api/journeyClient'
import { fetchPublicDeals } from '../../api/dealClient'
import { formatUsername } from '../../lib/formatUsername'
import MediaStudio from '../MediaStudio'
import MobileTabRail from '../../components/mobile/MobileTabRail'
import SafeImage from '../../components/mobile/SafeImage'
import type { ChatMessage, Conversation, ConversationType, InboxFilter } from './types'
import {
  BlockAccountFlow, DeliveryIcon, ImmediateSafetyFlow, MuteSheet, PillButton,
  QuickActionRow, ReportMessageFlow, SafetyCenterView, ShareLocationFlow,
  Sheet, useToast,
} from './flows'
import { relativeMessageTime, useLiveMessages } from './useLiveMessages'
import { MESSAGE_FEATURES } from './features'

const FILTERS: InboxFilter[] = [
  'All', 'Unread', 'Personal', 'Journeys', 'Communities', 'Businesses', 'Transport', 'Support', 'Requests', 'Archived',
]

const TYPE_META: Record<ConversationType, { color: string; icon: typeof Navigation; label: string }> = {
  personal: { color: 'var(--primary)', icon: Users, label: 'Personal' },
  journey: { color: '#B76808', icon: Navigation, label: 'Journey' },
  business: { color: '#2769C7', icon: Building2, label: 'Business' },
  community: { color: '#16845B', icon: Users, label: 'Community' },
  transport: { color: '#E05C1A', icon: Car, label: 'Transport' },
  support: { color: 'var(--primary)', icon: HelpCircle, label: 'Support' },
  request: { color: '#B76808', icon: Flag, label: 'Request' },
}

type View = 'inbox' | 'thread' | 'details' | 'safety' | 'new'

function matchesFilter(c: Conversation, f: InboxFilter) {
  if (f === 'All') return !c.archived && !c.isRequest
  if (f === 'Unread') return c.unread > 0 && !c.archived
  if (f === 'Archived') return !!c.archived
  if (f === 'Requests') return !!c.isRequest
  if (f === 'Personal') return c.type === 'personal' && !c.isRequest
  if (f === 'Journeys') return c.type === 'journey'
  if (f === 'Communities') return c.type === 'community'
  if (f === 'Businesses') return c.type === 'business'
  if (f === 'Transport') return c.type === 'transport'
  if (f === 'Support') return c.type === 'support'
  return true
}

function Avatar({ src, name, size = 44 }: { src: string | null; name: string; size?: number }) {
  if (!src) {
    return (
      <div className="rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
        style={{ width: size, height: size, background: 'rgba(95,47,201,0.15)', color: 'var(--primary)' }}>
        {name.slice(0, 1)}
      </div>
    )
  }
  return (
    <SafeImage
      src={src}
      alt=""
      kind="avatar"
      className="rounded-full shrink-0 overflow-hidden"
      style={{ width: size, height: size, minHeight: size }}
    />
  )
}

function SharedCard({ entity }: { entity: NonNullable<ChatMessage['entity']> }) {
  return (
    <div className="mt-1 rounded-xl p-3 w-full max-w-full min-w-0 box-border" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>{entity.type}</p>
      <p className="text-sm font-semibold break-anywhere" style={{ color: 'var(--fg)' }}>{entity.title}</p>
      {entity.subtitle && <p className="text-xs break-anywhere" style={{ color: 'var(--fg-muted)' }}>{entity.subtitle}</p>}
      <div className="flex flex-wrap gap-2 mt-1 text-xs min-w-0">
        {entity.price && <span className="font-bold tabular-nums break-anywhere" style={{ fontFamily: 'Syne, sans-serif' }}>{entity.price}</span>}
        {entity.status && <span style={{ color: '#16845B' }}>{entity.status}</span>}
        {entity.meta && <span className="break-anywhere" style={{ color: 'var(--fg-muted)' }}>{entity.meta}</span>}
      </div>
    </div>
  )
}

function ConversationListItem({
  conv, selected, onOpen,
}: {
  conv: Conversation
  selected?: boolean
  onOpen: () => void
}) {
  const meta = TYPE_META[conv.type]
  const Icon = meta.icon
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-start gap-3 px-3 py-3 text-left min-h-[64px] transition-colors"
      style={{
        background: selected ? 'rgba(95,47,201,0.08)' : 'transparent',
        borderBottom: '1px solid var(--border)',
      }}
      aria-current={selected ? 'true' : undefined}
    >
      <div className="relative shrink-0">
        <Avatar src={conv.avatar} name={conv.name} />
        {conv.unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ background: 'var(--primary)' }}>
            {conv.unread}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>{conv.name}</p>
          {conv.verified && <CheckCircle size={12} className="shrink-0" style={{ color: 'var(--primary)' }} aria-label="Verified" />}
          {conv.pinned && <Pin size={11} className="shrink-0" style={{ color: 'var(--fg-muted)' }} aria-label="Pinned" />}
          {conv.muted && <BellOff size={11} className="shrink-0" style={{ color: 'var(--fg-muted)' }} aria-label="Muted" />}
          <span className="ml-auto text-[11px] shrink-0" style={{ color: 'var(--fg-muted)' }}>{conv.time}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Icon size={11} style={{ color: meta.color }} aria-hidden />
          <span className="text-[11px] truncate" style={{ color: 'var(--fg-muted)' }}>{conv.handle}</span>
        </div>
        <p className={`text-xs mt-1 break-anywhere ${conv.unread ? 'font-semibold' : ''}`} style={{ color: conv.draft ? '#B76808' : 'var(--fg-muted)' }}>
          {conv.draft ? `Draft: ${conv.draft}` : conv.typing ? 'Typing…' : conv.preview}
        </p>
        {conv.contextLabel && (
          <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--primary)' }}>{conv.contextLabel}</p>
        )}
      </div>
    </button>
  )
}

function Toast({ text }: { text: string }) {
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl text-sm font-semibold shadow-lg max-w-[90vw]"
      style={{ background: 'var(--fg)', color: 'var(--bg)' }} role="status">
      {text}
    </div>
  )
}

export default function MessagesPage({
  signedIn = false,
  authReady = true,
  onSignIn,
  openJourneyId = null,
  onJourneyOpened,
  openConversationId = null,
  onConversationOpened,
  openUserId = null,
  onUserOpened,
  onOpenJourney,
}: {
  signedIn?: boolean
  authReady?: boolean
  onSignIn?: () => void
  openJourneyId?: string | null
  onJourneyOpened?: () => void
  openConversationId?: string | null
  onConversationOpened?: () => void
  openUserId?: string | null
  onUserOpened?: () => void
  onOpenJourney?: (journeyId: string) => void
} = {}) {
  const liveEnabled = Boolean(signedIn && authReady)
  const [activeId, setActiveId] = useState<string | null>(null)
  const live = useLiveMessages(liveEnabled, activeId)
  const [attachStudioOpen, setAttachStudioOpen] = useState(false)
  const typingTimerRef = useRef<number | null>(null)

  const [view, setView] = useState<View>('inbox')
  const [filter, setFilter] = useState<InboxFilter>('All')
  const [query, setQuery] = useState('')
  const [input, setInput] = useState('')
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [flow, setFlow] = useState<'block' | 'report' | 'safety' | 'location' | 'spam' | 'mute' | 'share' | null>(null)
  const [sendBusy, setSendBusy] = useState(false)
  const [newQuery, setNewQuery] = useState('')
  const [newHits, setNewHits] = useState<PublicTravelerProfile[]>([])
  const [newSearching, setNewSearching] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareJourneys, setShareJourneys] = useState<{ id: string; title: string; subtitle: string }[]>([])
  const [shareDeals, setShareDeals] = useState<{ id: string; title: string; subtitle: string }[]>([])
  const [blockedUsers, setBlockedUsers] = useState<{ id: string; name: string; handle: string; when: string }[]>([])
  const [blockedLoading, setBlockedLoading] = useState(false)
  const [unblockBusyId, setUnblockBusyId] = useState<string | null>(null)
  const { toast, setToast } = useToast()

  useEffect(() => {
    if (flow !== 'share' || !liveEnabled) return
    setShareLoading(true)
    void Promise.all([
      listMyJourneys().catch(() => []),
      fetchPublicDeals(12).catch(() => []),
    ])
      .then(([journeys, deals]) => {
        setShareJourneys(journeys.map(j => ({
          id: j.id,
          title: j.title,
          subtitle: `${j.startPlace} → ${j.endPlace}`,
        })))
        setShareDeals(deals.map(d => ({
          id: d.id,
          title: d.title,
          subtitle: d.business.name,
        })))
      })
      .finally(() => setShareLoading(false))
  }, [flow, liveEnabled])

  const { conversations, setConversations, threads, archivedConversations } = live
  const inboxSource = filter === 'Archived' ? archivedConversations : conversations

  const active = useMemo(() => {
    if (!activeId) return null
    return conversations.find(c => c.id === activeId)
      ?? archivedConversations.find(c => c.id === activeId)
      ?? null
  }, [activeId, conversations, archivedConversations])
  const messages = activeId ? (threads[activeId] ?? []) : []
  const activeTyping = activeId ? (live.typingUsers[activeId] ?? []) : []
  const showTyping = activeTyping.length > 0
  const cannotReply = active?.canReply === false

  const liveFilterOnly = !['All', 'Unread', 'Personal', 'Requests', 'Journeys', 'Archived'].includes(filter)

  const filtered = useMemo(() => {
    if (liveFilterOnly) return []
    return inboxSource.filter(c =>
      matchesFilter(c, filter)
      && (!query.trim()
        || c.name.toLowerCase().includes(query.toLowerCase())
        || c.preview.toLowerCase().includes(query.toLowerCase())
        || (c.bookingRef?.toLowerCase().includes(query.toLowerCase()) ?? false)),
    )
  }, [inboxSource, filter, query, liveFilterOnly])

  const requestCount = conversations.filter(c => c.isRequest).length
  const unreadCount = conversations.reduce((n, c) => n + c.unread, 0)

  function openConv(id: string) {
    setActiveId(id)
    setView('thread')
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c))
    setInput(conversations.find(c => c.id === id)?.draft ?? '')
    setMenuOpen(false)
    if (liveEnabled) void live.loadThread(id)
  }

  useEffect(() => {
    if (!liveEnabled || !openConversationId) return
    setActiveId(openConversationId)
    setView('thread')
    setConversations(prev => prev.map(c => c.id === openConversationId ? { ...c, unread: 0 } : c))
    void live.loadThread(openConversationId)
    onConversationOpened?.()
  }, [liveEnabled, openConversationId, live, onConversationOpened, setConversations])

  useEffect(() => {
    if (!liveEnabled || !openUserId) return
    void live.startWithUser(openUserId)
      .then(id => {
        setActiveId(id)
        setView('thread')
        setConversations(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c))
        void live.loadThread(id)
        onUserOpened?.()
      })
      .catch(err => {
        setToast(err instanceof Error ? err.message : 'Could not start conversation')
        onUserOpened?.()
      })
  }, [liveEnabled, openUserId, live, onUserOpened, setConversations, setToast])

  useEffect(() => {
    if (!liveEnabled || filter !== 'Archived') return
    void live.loadArchived()
  }, [liveEnabled, filter, live])

  useEffect(() => {
    if (view !== 'safety' || !liveEnabled) return
    setBlockedLoading(true)
    void listBlockedUsers()
      .then(rows => setBlockedUsers(rows.map(row => ({
        id: row.id,
        name: row.displayName || row.username,
        handle: formatUsername(row.username),
        when: relativeMessageTime(row.blockedAt) || new Date(row.blockedAt).toLocaleDateString(),
      }))))
      .catch(() => setBlockedUsers([]))
      .finally(() => setBlockedLoading(false))
  }, [view, liveEnabled])

  useEffect(() => {
    if (!liveEnabled || !openJourneyId) return
    void live.openJourneyChat(openJourneyId)
      .then(id => {
        setActiveId(id)
        setView('thread')
        setConversations(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c))
        void live.loadThread(id)
        onJourneyOpened?.()
      })
      .catch(err => {
        setToast(err instanceof Error ? err.message : 'Could not open journey chat')
        onJourneyOpened?.()
      })
  }, [liveEnabled, openJourneyId, live, onJourneyOpened, setConversations, setToast])

  function handleInputChange(value: string) {
    setInput(value)
    if (!liveEnabled || !activeId || cannotReply) return
    live.signalTyping(activeId, true)
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current)
    typingTimerRef.current = window.setTimeout(() => {
      live.signalTyping(activeId, false)
    }, 2000)
  }

  async function handleAttachReady(mediaId: string) {
    if (!activeId || !liveEnabled || cannotReply) return
    setSendBusy(true)
    try {
      await live.send(activeId, { mediaId, body: input.trim() || undefined })
      setInput('')
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not send attachment')
    } finally {
      setSendBusy(false)
    }
  }

  async function sendText() {
    if (!activeId || !input.trim() || !liveEnabled) return
    setSendBusy(true)
    try {
      await live.send(activeId, { body: input.trim() })
      setInput('')
      setReplyTo(null)
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not send message')
    } finally {
      setSendBusy(false)
    }
  }

  async function handleAcceptRequest() {
    if (!activeId || !liveEnabled) return
    try {
      await live.acceptRequest(activeId)
      setToast('Request accepted')
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not accept request')
    }
  }

  async function handleDeclineRequest() {
    if (!activeId || !liveEnabled) return
    try {
      await live.declineRequest(activeId)
      setView('inbox')
      setActiveId(null)
      setToast('Request declined')
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not decline request')
    }
  }

  async function handleBlockUser(alsoReport: boolean) {
    if (!active?.otherUserId || !liveEnabled) {
      setToast('Could not block this account')
      return
    }
    if (alsoReport && !MESSAGE_FEATURES.reports) {
      alsoReport = false
    }
    try {
      await live.blockOtherUser(active.otherUserId, active.id)
      setFlow(alsoReport ? 'report' : null)
      setToast(alsoReport ? 'Blocked — continue report' : 'Account blocked')
      if (!alsoReport) {
        setView('inbox')
        setActiveId(null)
      }
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not block account')
    }
  }

  async function handleArchive() {
    if (!active || !liveEnabled) return
    try {
      await live.archive(active.id)
      setToast('Moved to archive')
      setView('inbox')
      setActiveId(null)
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not archive conversation')
    }
  }

  async function handleUnarchive() {
    if (!active || !liveEnabled) return
    try {
      await live.unarchive(active.id)
      setToast('Restored to inbox')
      setFilter('All')
      setView('inbox')
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not restore conversation')
    }
  }

  async function handleMute(label: string) {
    if (!active || !liveEnabled) return
    try {
      await live.setMuted(active.id, true)
      setFlow(null)
      setToast(`Muted · ${label}`)
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not mute conversation')
    }
  }

  async function handleUnblock(userId: string) {
    if (!liveEnabled) return
    setUnblockBusyId(userId)
    try {
      await unblockUser(userId)
      setBlockedUsers(prev => prev.filter(b => b.id !== userId))
      setToast('Account unblocked')
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not unblock account')
    } finally {
      setUnblockBusyId(null)
    }
  }

  const conversationMenuItems = useMemo(() => {
    const items = [
      { label: 'Mute', action: () => setFlow('mute') },
      active?.archived
        ? { label: 'Unarchive', action: () => { void handleUnarchive() } }
        : { label: 'Archive', action: () => { void handleArchive() } },
      { label: 'Block…', action: () => setFlow('block') },
      { label: 'Safety Center', action: () => setView('safety') },
    ]
    if (MESSAGE_FEATURES.reports) {
      items.splice(2, 0, { label: 'Report message…', action: () => setFlow('report') })
    }
    if (MESSAGE_FEATURES.immediateSafetyEscalation) {
      items.splice(items.length - 1, 0, { label: 'Immediate safety…', action: () => setFlow('safety') })
    }
    return items
  }, [active?.archived])

  const detailActions = useMemo(() => {
    const actions: { label: string; icon: typeof BellOff; action: () => void }[] = [
      { label: 'Mute', icon: BellOff, action: () => setFlow('mute') },
      active?.archived
        ? { label: 'Unarchive', icon: Archive, action: () => { void handleUnarchive() } }
        : { label: 'Archive', icon: Archive, action: () => { void handleArchive() } },
      { label: 'Block', icon: Ban, action: () => setFlow('block') },
    ]
    if (MESSAGE_FEATURES.reports) {
      actions.splice(2, 0, { label: 'Report', icon: Flag, action: () => setFlow('report') })
    }
    return actions
  }, [active?.archived])

  const inboxPanel = (
    <div className="flex flex-col h-full min-h-0 w-full max-w-full min-w-0 overflow-hidden" style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
      <div className="px-3 pt-3 pb-2 flex items-center gap-2 min-w-0">
        <h1 className="text-xl font-bold flex-1 min-w-0 truncate" style={{ fontFamily: 'Syne, sans-serif' }}>Messages</h1>
        <button type="button" onClick={() => setView('safety')} className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl" style={{ color: 'var(--fg-muted)' }} aria-label="Safety Center">
          <Shield size={18} />
        </button>
        <button type="button" onClick={() => setView('new')} className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl" style={{ color: 'var(--primary)' }} aria-label="New message">
          <Plus size={20} />
        </button>
      </div>
      <div className="px-3 pb-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} aria-hidden />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search conversations or booking refs"
            className="w-full pl-9 pr-3 rounded-xl text-sm min-h-[44px]"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
            aria-label="Search conversations" />
        </div>
      </div>
      <div className="px-2 pb-2 min-w-0 overflow-hidden">
        <MobileTabRail
          ariaLabel="Inbox filters"
          mode="scroll"
          activeId={filter}
          onChange={id => setFilter(id as InboxFilter)}
          items={FILTERS.map(f => ({
            id: f,
            label: f === 'Requests' && requestCount ? `Requests (${requestCount})` : f === 'Unread' && unreadCount ? `Unread (${unreadCount})` : f,
          }))}
        />
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {live.loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 size={22} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />
          </div>
        ) : liveFilterOnly ? (
          <div className="p-6 text-center">
            <p className="text-sm font-semibold">Coming soon</p>
            <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
              Community, business, transport, and support chats are coming soon. Direct and journey messages work under All, Personal, or Journeys.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm font-semibold">No conversations here</p>
            <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
              {filter === 'Archived' ? 'Archive is empty.' : filter === 'Requests' ? 'No message requests.' : 'Try another filter or start a conversation.'}
            </p>
          </div>
        ) : filtered.map(c => (
          <ConversationListItem key={c.id} conv={c} selected={activeId === c.id} onOpen={() => openConv(c.id)} />
        ))}
      </div>
    </div>
  )

  const threadPanel = active ? (
    <div className="flex flex-col h-full min-h-0 w-full max-w-full min-w-0 overflow-x-hidden" style={{ background: 'var(--bg)' }}>
      <header className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 shrink-0 min-w-0 w-full max-w-full box-border" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button type="button" className="lg:hidden p-2.5 min-w-[44px] min-h-[44px] shrink-0" aria-label="Back to inbox" onClick={() => { setView('inbox'); setActiveId(null) }}>
          <ArrowLeft size={18} />
        </button>
        <button type="button" className="flex items-center gap-2 flex-1 min-w-0 text-left overflow-hidden" onClick={() => setView('details')}>
          <Avatar src={active.avatar} name={active.name} size={40} />
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-sm font-bold truncate">{active.name}</p>
              {active.verified && <CheckCircle size={12} className="shrink-0" style={{ color: 'var(--primary)' }} />}
            </div>
            <p className="text-[11px] truncate" style={{ color: 'var(--fg-muted)' }}>
              {active.type === 'business' ? 'Business conversation' : active.type === 'transport' ? active.transportMode : active.handle}
              {active.onlineAllowed ? ' · Active recently (privacy permitted)' : ''}
            </p>
          </div>
        </button>
        <div className="relative shrink-0">
          <button type="button" onClick={() => setMenuOpen(o => !o)} className="p-2.5 min-w-[44px] min-h-[44px]" aria-label="Conversation options" aria-expanded={menuOpen}>
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 rounded-xl p-1 z-20 shadow-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} role="menu">
              {conversationMenuItems.map(item => (
                <button key={item.label} type="button" role="menuitem" onClick={() => { setMenuOpen(false); item.action() }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm min-h-[44px]" style={{ background: 'transparent', border: 'none', color: 'var(--fg)', cursor: 'pointer' }}>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {(active.bookingRef || active.contextLabel || active.type === 'journey') && (
        <div className="px-3 py-2 flex flex-col gap-2" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(95,47,201,0.08)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
              {active.type === 'business' ? 'Booking context' : active.type === 'transport' ? 'Transport context' : active.type === 'journey' ? 'Journey chat' : 'Context'}
            </p>
            <p className="text-xs break-anywhere" style={{ color: 'var(--fg-muted)' }}>
              {active.contextLabel}
              {active.bookingRef ? ` · Ref ${active.bookingRef}` : ''}
              {active.supportCaseRef ? ` · ${active.supportCaseRef}` : ''}
            </p>
            {active.responseExpectation && <p className="text-[11px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>{active.responseExpectation}</p>}
          </div>
          {(active.type === 'business' || active.type === 'transport') && (
            <QuickActionRow>
              <PillButton>View booking</PillButton>
              {active.type === 'transport' && <PillButton>{"I'm at the pickup point"}</PillButton>}
              {active.type === 'transport' && <PillButton>My flight is delayed</PillButton>}
              <PillButton>Contact Delve Support</PillButton>
              {active.transportMode === 'Community ride' && <PillButton tone="danger">Ride safety</PillButton>}
            </QuickActionRow>
          )}
          {active.type === 'journey' && (
            <QuickActionRow>
              <PillButton onClick={() => active.journeyId && onOpenJourney?.(active.journeyId)}>Open Journey</PillButton>
              <PillButton>Itinerary</PillButton>
              <PillButton>Shared bookings</PillButton>
            </QuickActionRow>
          )}
        </div>
      )}

      {active.isRequest && (
        <div className="px-3 py-3 flex flex-col gap-2" style={{ background: 'rgba(183,104,8,0.08)', borderBottom: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold">Message request</p>
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Read receipts, online status and calls stay off until you accept. Unexpected media stays restricted.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="min-h-[44px] px-4 rounded-xl text-sm font-semibold" style={{ background: 'var(--primary)', color: '#fff' }}
              onClick={() => { void handleAcceptRequest() }}>
              Accept
            </button>
            <button type="button" className="min-h-[44px] px-4 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border)' }}
              onClick={() => { void handleDeclineRequest() }}>
              Decline
            </button>
            <button type="button" className="min-h-[44px] px-4 rounded-xl text-sm font-semibold" style={{ color: '#C83B3B' }} onClick={() => setFlow('block')}>Block</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 flex flex-col gap-3 min-h-0 w-full max-w-full box-border">
        <div className="text-center text-[11px] py-1" style={{ color: 'var(--fg-muted)' }}>Today</div>
        {messages.map(m => {
          if (m.kind === 'system' || m.from === 'system') {
            return <p key={m.id} className="text-center text-[11px] px-4 break-anywhere" style={{ color: 'var(--fg-muted)' }}>{m.text}</p>
          }
          const mine = m.from === 'me'
          return (
            <div
              key={m.id}
              className={`flex flex-col min-w-0 box-border ${mine ? 'self-end items-end' : 'self-start items-start'}`}
              style={{ maxWidth: 'min(85%, 100%)', width: 'fit-content' }}
            >
              {!mine && m.senderName && <span className="text-[11px] mb-0.5 px-1" style={{ color: 'var(--fg-muted)' }}>{m.senderName}</span>}
              <button type="button" onClick={() => setReplyTo(m)}
                className="rounded-2xl px-3 py-2 text-left text-sm break-anywhere min-w-0 max-w-full w-full box-border"
                style={{
                  background: mine ? 'var(--primary)' : 'var(--surface)',
                  color: mine ? '#fff' : 'var(--fg)',
                  border: mine ? 'none' : '1px solid var(--border)',
                }}>
                {m.replyTo && <p className="text-[11px] opacity-80 mb-1">Replying to a message</p>}
                {m.kind === 'text' && m.text}
                {m.kind === 'image' && m.mediaUrl && (
                  m.mediaResourceType === 'video'
                    ? <video src={m.mediaUrl} controls className="max-w-full rounded-xl" />
                    : <img src={m.mediaUrl} alt="" className="max-w-full rounded-xl object-cover" />
                )}
                {m.kind === 'image' && !m.mediaUrl && m.text}
                {m.kind === 'journey' && m.entity && <SharedCard entity={m.entity} />}
                {m.kind === 'deal' && m.entity && <SharedCard entity={m.entity} />}
                {m.kind === 'location' && (
                  <span className="inline-flex items-start gap-1 min-w-0"><MapPin size={14} className="mt-0.5 shrink-0" /><span className="break-anywhere">{m.locationLabel}</span></span>
                )}
                {m.kind === 'booking' && m.entity && <SharedCard entity={m.entity} />}
                {m.kind === 'transport' && m.entity && <SharedCard entity={m.entity} />}
                {m.edited && <span className="block text-[10px] mt-1 opacity-80">Edited</span>}
              </button>
              <div className="flex items-center gap-1 mt-0.5 px-1 text-[10px] flex-wrap max-w-full" style={{ color: 'var(--fg-muted)' }}>
                <span>{m.time}</span>
                {mine && active.readReceiptsAllowed !== false && <DeliveryIcon status={m.delivery} />}
                {m.reactions?.map(r => (
                  <button key={r.emoji} type="button" className="ml-1 px-1.5 py-0.5 rounded-full text-[11px]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    aria-label={`${r.emoji} ${r.count}`}>{r.emoji} {r.count}</button>
                ))}
              </div>
            </div>
          )
        })}
        {showTyping && (
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            {activeTyping.map(u => u.displayName || u.username).join(', ')} typing…
          </p>
        )}
        {active.typing && !showTyping && <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Typing…</p>}
      </div>

      {replyTo && (
        <div className="px-3 py-2 flex items-center gap-2 min-w-0 w-full max-w-full box-border" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
          <div className="flex-1 min-w-0 text-xs truncate" style={{ color: 'var(--fg-muted)' }}>
            Replying to: {replyTo.text ?? replyTo.kind}
          </div>
          <button type="button" className="min-h-[44px] px-2 text-xs font-semibold shrink-0" style={{ color: 'var(--primary)' }} onClick={() => setReplyTo(null)}>Cancel</button>
        </div>
      )}

      <div className="px-2 sm:px-3 py-2 flex items-end gap-0.5 sm:gap-1 shrink-0 w-full max-w-full min-w-0 box-border" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        <button type="button" className="p-2 sm:p-2.5 min-w-[40px] sm:min-w-[44px] min-h-[44px] shrink-0" aria-label="Attach"
          disabled={cannotReply || sendBusy}
          onClick={() => setAttachStudioOpen(true)}>
          <Paperclip size={18} style={{ color: 'var(--fg-muted)' }} />
        </button>
        {MESSAGE_FEATURES.locationShare && (
        <button type="button" className="p-2 sm:p-2.5 min-w-[40px] sm:min-w-[44px] min-h-[44px] shrink-0" aria-label="Share location" onClick={() => setFlow('location')}>
          <MapPin size={18} style={{ color: 'var(--fg-muted)' }} />
        </button>
        )}
        <button type="button" className="p-2 sm:p-2.5 min-w-[40px] sm:min-w-[44px] min-h-[44px] shrink-0" aria-label="Share Delve content" onClick={() => setFlow('share')}>
          <Share2 size={18} style={{ color: 'var(--fg-muted)' }} />
        </button>
        <textarea
          value={input}
          onChange={e => handleInputChange(e.target.value)}
          rows={1}
          placeholder={cannotReply ? 'Accept to reply' : 'Message'}
          disabled={cannotReply}
          className="flex-1 min-w-0 w-0 rounded-2xl px-3 py-2.5 text-sm resize-none max-h-28 box-border"
          style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          aria-label="Message"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText() } }}
        />
        <button type="button" onClick={sendText} disabled={!input.trim() || cannotReply || sendBusy}
          className="p-2 sm:p-2.5 min-w-[40px] sm:min-w-[44px] min-h-[44px] rounded-xl disabled:opacity-40 shrink-0" style={{ background: 'var(--primary)', color: '#fff' }} aria-label="Send">
          <Send size={16} />
        </button>
      </div>
    </div>
  ) : (
    <div className="hidden lg:flex flex-1 items-center justify-center p-8" style={{ background: 'var(--bg)' }}>
      <div className="text-center max-w-sm">
        <p className="text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Select a conversation</p>
        <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>Journey, booking and provider context stay visible when you open a thread.</p>
      </div>
    </div>
  )

  if (!authReady) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />
      </div>
    )
  }

  if (!signedIn) {
    return (
      <div className="px-6 py-16 text-center sm:rounded-2xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <p className="text-lg font-bold m-0 mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>Sign in to message</p>
        <p className="text-sm m-0 mb-4" style={{ color: 'var(--fg-muted)' }}>
          Direct messages between travelers are live. Sign in to start a conversation.
        </p>
        {onSignIn && (
          <button
            type="button"
            onClick={onSignIn}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
          >
            <LogIn size={16} /> Sign in
          </button>
        )}
      </div>
    )
  }

  if (view === 'safety') {
    return (
      <div className="sm:rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', height: 'min(80vh, 720px)' }}>
        <SafetyCenterView
          onBack={() => setView(activeId ? 'thread' : 'inbox')}
          onImmediate={() => setFlow('safety')}
          cases={[]}
          blocked={blockedUsers}
          blockedLoading={blockedLoading}
          onUnblock={userId => { void handleUnblock(userId) }}
          unblockBusyId={unblockBusyId}
        />
        {flow === 'safety' && MESSAGE_FEATURES.immediateSafetyEscalation && <ImmediateSafetyFlow bookingRef={active?.bookingRef} onClose={() => setFlow(null)} />}
        {toast && <Toast text={toast} />}
      </div>
    )
  }

  if (view === 'new') {
    return (
      <div className="sm:rounded-2xl overflow-hidden flex flex-col" style={{ border: '1px solid var(--border)', background: 'var(--bg)', minHeight: '70vh' }}>
        <header className="flex items-center gap-2 px-3 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <button type="button" onClick={() => setView('inbox')} className="p-2.5 min-w-[44px] min-h-[44px]" aria-label="Back"><ArrowLeft size={18} /></button>
          <h1 className="text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>New conversation</h1>
        </header>
        <div className="p-4 flex flex-col gap-2">
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
            <input
              value={newQuery}
              onChange={e => setNewQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  setNewSearching(true)
                  void searchTravelers(newQuery.trim())
                    .then(setNewHits)
                    .catch(() => setNewHits([]))
                    .finally(() => setNewSearching(false))
                }
              }}
              placeholder="Search travelers by name or @username"
              className="w-full pl-9 pr-3 rounded-xl text-sm min-h-[44px]"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
            />
          </div>
          {newSearching && (
            <p className="text-xs text-center" style={{ color: 'var(--fg-muted)' }}>Searching…</p>
          )}
          {newHits.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                void live.startWithUser(t.id).then(id => {
                  openConv(id)
                  setView('thread')
                  setNewQuery('')
                  setNewHits([])
                }).catch(err => {
                  setToast(err instanceof Error ? err.message : 'Could not start conversation')
                })
              }}
              className="text-left px-3 py-3 rounded-xl min-h-[44px] flex items-center gap-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              {t.avatarUrl ? (
                <img src={t.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(95,47,201,0.15)', color: 'var(--primary)' }}>
                  {(t.displayName || t.username).slice(0, 1)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold m-0 truncate">{t.displayName || formatUsername(t.username)}</p>
                <p className="text-xs m-0 truncate" style={{ color: 'var(--fg-muted)' }}>{formatUsername(t.username)}</p>
              </div>
            </button>
          ))}
          {!newSearching && newQuery.trim() && newHits.length === 0 && (
            <p className="text-xs text-center" style={{ color: 'var(--fg-muted)' }}>Press Enter to search</p>
          )}
        </div>
        {toast && <Toast text={toast} />}
      </div>
    )
  }

  if (view === 'details' && active) {
    return (
      <div className="sm:rounded-2xl overflow-hidden flex flex-col" style={{ border: '1px solid var(--border)', background: 'var(--bg)', minHeight: '70vh' }}>
        <header className="flex items-center gap-2 px-3 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <button type="button" onClick={() => setView('thread')} className="p-2.5 min-w-[44px] min-h-[44px]" aria-label="Back"><ArrowLeft size={18} /></button>
          <h1 className="text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Conversation details</h1>
        </header>
        <div className="p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-center gap-3">
            <Avatar src={active.avatar} name={active.name} size={56} />
            <div className="min-w-0">
              <p className="font-bold truncate">{active.name}</p>
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{TYPE_META[active.type].label} · {active.handle}</p>
            </div>
          </div>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{active.contextLabel}</p>
          <div className="grid grid-cols-2 gap-2">
            {detailActions.map(a => (
              <button key={a.label} type="button" onClick={a.action} className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold min-h-[44px]"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <a.icon size={16} /> {a.label}
              </button>
            ))}
          </div>
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            Removing from inbox is not the same as unsending a message, leaving a group, or blocking someone.
          </p>
        </div>
        {flow === 'mute' && <MuteSheet onClose={() => setFlow(null)} onMute={label => { void handleMute(label) }} />}
        {flow === 'block' && <BlockAccountFlow name={active.name} onClose={() => setFlow(null)} onBlocked={also => { void handleBlockUser(also) }} />}
        {flow === 'report' && MESSAGE_FEATURES.reports && <ReportMessageFlow onClose={() => setFlow(null)} onSubmitted={ref => { setFlow(null); setToast(`Report submitted · ${ref}`) }} />}
        {toast && <Toast text={toast} />}
      </div>
    )
  }

  return (
    <div className="sm:rounded-2xl overflow-hidden w-full max-w-full min-w-0" style={{ border: '1px solid var(--border)', height: 'min(82vh, 760px)' }}>
      <div className="grid h-full min-h-0 w-full max-w-full min-w-0 overflow-hidden lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className={`${view === 'thread' ? 'hidden lg:flex' : 'flex'} flex-col min-h-0 min-w-0 h-full overflow-hidden`}>
          {inboxPanel}
        </div>
        <div className={`${view === 'thread' ? 'flex' : 'hidden lg:flex'} flex-col min-h-0 min-w-0 h-full overflow-hidden`}>
          {threadPanel}
        </div>
      </div>

      {flow === 'block' && active && (
        <BlockAccountFlow name={active.name} onClose={() => setFlow(null)}
          onBlocked={also => { void handleBlockUser(also) }} />
      )}
      {flow === 'report' && MESSAGE_FEATURES.reports && (
        <ReportMessageFlow onClose={() => setFlow(null)} onSubmitted={ref => { setFlow(null); setToast(`Report submitted · ${ref}`) }} />
      )}
      {flow === 'safety' && MESSAGE_FEATURES.immediateSafetyEscalation && <ImmediateSafetyFlow bookingRef={active?.bookingRef} onClose={() => setFlow(null)} />}
      {flow === 'location' && MESSAGE_FEATURES.locationShare && (
        <ShareLocationFlow onClose={() => setFlow(null)} onShare={() => { setFlow(null); setToast('Location shared') }} />
      )}
      {flow === 'mute' && active && (
        <MuteSheet onClose={() => setFlow(null)} onMute={label => { void handleMute(label) }} />
      )}
      {flow === 'share' && (
        <Sheet title="Share Delve content" onClose={() => setFlow(null)}>
          {shareLoading ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--fg-muted)' }}>Loading…</p>
          ) : (
            <>
              {shareJourneys.length > 0 && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--fg-muted)' }}>Your journeys</p>
                  {shareJourneys.map(item => (
                    <button key={item.id} type="button" className="w-full text-left px-3 py-3 rounded-xl mb-2 min-h-[44px]"
                      style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
                      onClick={() => {
                        if (!activeId) return
                        void live.send(activeId, { sharedEntity: { type: 'journey', id: item.id } })
                          .then(() => { setFlow(null); setToast('Journey shared') })
                          .catch(err => setToast(err instanceof Error ? err.message : 'Could not share journey'))
                      }}>
                      <p className="text-sm font-semibold m-0">{item.title}</p>
                      <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>{item.subtitle}</p>
                    </button>
                  ))}
                </>
              )}
              {shareDeals.length > 0 && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2 mt-3" style={{ color: 'var(--fg-muted)' }}>Deals</p>
                  {shareDeals.map(item => (
                    <button key={item.id} type="button" className="w-full text-left px-3 py-3 rounded-xl mb-2 min-h-[44px]"
                      style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
                      onClick={() => {
                        if (!activeId) return
                        void live.send(activeId, { sharedEntity: { type: 'deal', id: item.id } })
                          .then(() => { setFlow(null); setToast('Deal shared') })
                          .catch(err => setToast(err instanceof Error ? err.message : 'Could not share deal'))
                      }}>
                      <p className="text-sm font-semibold m-0">{item.title}</p>
                      <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>{item.subtitle}</p>
                    </button>
                  ))}
                </>
              )}
              {!shareJourneys.length && !shareDeals.length && (
                <p className="text-sm text-center py-4" style={{ color: 'var(--fg-muted)' }}>No journeys or deals to share yet.</p>
              )}
            </>
          )}
        </Sheet>
      )}
      {toast && <Toast text={toast} />}
      <MediaStudio
        open={attachStudioOpen}
        onClose={() => setAttachStudioOpen(false)}
        initialContext="message"
        lockContext
        onMediaReady={assets => {
          const asset = assets[0]
          setAttachStudioOpen(false)
          if (asset) void handleAttachReady(asset.id)
        }}
      />
    </div>
  )
}
