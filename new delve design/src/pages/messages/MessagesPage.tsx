import { useMemo, useState } from 'react'
import {
  ArrowLeft, BellOff, Building2, CheckCircle, HelpCircle,
  MapPin, MoreVertical, Navigation, Paperclip, Pin, Plus, Search, Send,
  Share2, Shield, Users, Car, AlertTriangle, Archive, Flag, Ban,
} from 'lucide-react'
import MobileTabRail from '../../components/mobile/MobileTabRail'
import SafeImage from '../../components/mobile/SafeImage'
import { BLOCKED_ACCOUNTS, CONVERSATIONS, NEW_MESSAGE_TARGETS, SAFETY_CASES, THREADS } from './data'
import type { ChatMessage, Conversation, ConversationType, InboxFilter } from './types'
import {
  BlockAccountFlow, DeliveryIcon, ImmediateSafetyFlow, MuteSheet, PillButton,
  QuickActionRow, ReportMessageFlow, SafetyCenterView, ShareLocationFlow,
  Sheet, SpamWarning, useToast,
} from './flows'

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

export default function MessagesPage() {
  const [view, setView] = useState<View>('inbox')
  const [filter, setFilter] = useState<InboxFilter>('All')
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [conversations, setConversations] = useState(CONVERSATIONS)
  const [threads, setThreads] = useState(THREADS)
  const [input, setInput] = useState('')
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [flow, setFlow] = useState<'block' | 'report' | 'safety' | 'location' | 'spam' | 'mute' | 'share' | null>(null)
  const [offline, setOffline] = useState(false)
  const { toast, setToast } = useToast()

  const active = conversations.find(c => c.id === activeId) ?? null
  const messages = activeId ? (threads[activeId] ?? []) : []

  const filtered = useMemo(() => conversations.filter(c =>
    matchesFilter(c, filter)
    && (!query.trim()
      || c.name.toLowerCase().includes(query.toLowerCase())
      || c.preview.toLowerCase().includes(query.toLowerCase())
      || (c.bookingRef?.toLowerCase().includes(query.toLowerCase()) ?? false)),
  ), [conversations, filter, query])

  const requestCount = conversations.filter(c => c.isRequest).length
  const unreadCount = conversations.reduce((n, c) => n + c.unread, 0)

  function openConv(id: string) {
    setActiveId(id)
    setView('thread')
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c))
    setInput(conversations.find(c => c.id === id)?.draft ?? '')
    setMenuOpen(false)
  }

  function sendText() {
    if (!activeId || !input.trim()) return
    if (offline) {
      const queued: ChatMessage = {
        id: `q-${Date.now()}`, conversationId: activeId, from: 'me', kind: 'text', text: input.trim(),
        time: 'Now', delivery: 'queued', replyTo: replyTo?.id,
      }
      setThreads(t => ({ ...t, [activeId]: [...(t[activeId] ?? []), queued] }))
      setInput('')
      setReplyTo(null)
      setToast('Message queued — will send when connected')
      return
    }
    const msg: ChatMessage = {
      id: `m-${Date.now()}`, conversationId: activeId, from: 'me', kind: 'text', text: input.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), delivery: 'sending', replyTo: replyTo?.id,
    }
    setThreads(t => ({ ...t, [activeId]: [...(t[activeId] ?? []), msg] }))
    setInput('')
    setReplyTo(null)
    window.setTimeout(() => {
      setThreads(t => ({
        ...t,
        [activeId]: (t[activeId] ?? []).map(m => m.id === msg.id ? { ...m, delivery: 'sent' } : m),
      }))
    }, 400)
  }

  function addSystemish(kind: ChatMessage['kind'], partial: Partial<ChatMessage>) {
    if (!activeId) return
    const msg: ChatMessage = {
      id: `x-${Date.now()}`, conversationId: activeId, from: 'me', kind, time: 'Now', delivery: 'sent', ...partial,
    }
    setThreads(t => ({ ...t, [activeId]: [...(t[activeId] ?? []), msg] }))
  }

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
      {offline && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: 'rgba(183,104,8,0.12)', color: '#B76808' }} role="status">
          Offline — showing cached conversations. Queued messages are not delivered yet.
        </div>
      )}
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
        {filtered.length === 0 ? (
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
      <div className="p-3 flex gap-2" style={{ borderTop: '1px solid var(--border)' }}>
        <button type="button" onClick={() => setOffline(o => !o)} className="flex-1 min-h-[40px] rounded-xl text-xs font-semibold" style={{ border: '1px solid var(--border)' }}>
          {offline ? 'Go online (demo)' : 'Simulate offline'}
        </button>
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
        <button type="button" onClick={() => setFlow('spam')} className="p-2.5 min-w-[44px] min-h-[44px] shrink-0" aria-label="Safety warning demo" style={{ color: '#B76808' }}>
          <AlertTriangle size={18} />
        </button>
        <div className="relative shrink-0">
          <button type="button" onClick={() => setMenuOpen(o => !o)} className="p-2.5 min-w-[44px] min-h-[44px]" aria-label="Conversation options" aria-expanded={menuOpen}>
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 rounded-xl p-1 z-20 shadow-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} role="menu">
              {[
                { label: 'Mute', action: () => setFlow('mute') },
                { label: 'Archive', action: () => { setConversations(p => p.map(c => c.id === active.id ? { ...c, archived: true } : c)); setToast('Moved to archive'); setView('inbox') } },
                { label: 'Report message…', action: () => setFlow('report') },
                { label: 'Block…', action: () => setFlow('block') },
                { label: 'Immediate safety…', action: () => setFlow('safety') },
                { label: 'Safety Center', action: () => setView('safety') },
              ].map(item => (
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
              <PillButton>Open Journey</PillButton>
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
              onClick={() => { setConversations(p => p.map(c => c.id === active.id ? { ...c, isRequest: false, type: 'personal', handle: c.handle.replace(' · Request', '') } : c)); setToast('Request accepted') }}>
              Accept
            </button>
            <button type="button" className="min-h-[44px] px-4 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border)' }}
              onClick={() => { setConversations(p => p.filter(c => c.id !== active.id)); setView('inbox'); setToast('Request declined') }}>
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
                {m.kind === 'location' && (
                  <span className="inline-flex items-start gap-1 min-w-0"><MapPin size={14} className="mt-0.5 shrink-0" /><span className="break-anywhere">{m.locationLabel}</span></span>
                )}
                {m.kind === 'removed' && <span className="italic opacity-80">Message removed</span>}
                {m.entity && <SharedCard entity={m.entity} />}
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
        {active.typing && <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Typing…</p>}
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
        <button type="button" className="p-2 sm:p-2.5 min-w-[40px] sm:min-w-[44px] min-h-[44px] shrink-0" aria-label="Attach" onClick={() => addSystemish('text', { text: 'Media attachment (example — upload uses Media Studio rules)' })}>
          <Paperclip size={18} style={{ color: 'var(--fg-muted)' }} />
        </button>
        <button type="button" className="p-2 sm:p-2.5 min-w-[40px] sm:min-w-[44px] min-h-[44px] shrink-0" aria-label="Share location" onClick={() => setFlow('location')}>
          <MapPin size={18} style={{ color: 'var(--fg-muted)' }} />
        </button>
        <button type="button" className="p-2 sm:p-2.5 min-w-[40px] sm:min-w-[44px] min-h-[44px] shrink-0" aria-label="Share Delve content" onClick={() => setFlow('share')}>
          <Share2 size={18} style={{ color: 'var(--fg-muted)' }} />
        </button>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={1}
          placeholder={active.isRequest ? 'Accept to reply' : 'Message'}
          disabled={!!active.isRequest}
          className="flex-1 min-w-0 w-0 rounded-2xl px-3 py-2.5 text-sm resize-none max-h-28 box-border"
          style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          aria-label="Message"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText() } }}
        />
        <button type="button" onClick={sendText} disabled={!input.trim() || !!active.isRequest}
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

  if (view === 'safety') {
    return (
      <div className="sm:rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', height: 'min(80vh, 720px)' }}>
        <SafetyCenterView
          onBack={() => setView(activeId ? 'thread' : 'inbox')}
          onImmediate={() => setFlow('safety')}
          cases={SAFETY_CASES}
          blocked={BLOCKED_ACCOUNTS}
        />
        {flow === 'safety' && <ImmediateSafetyFlow bookingRef={active?.bookingRef} onClose={() => setFlow(null)} />}
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
          {NEW_MESSAGE_TARGETS.map(t => (
            <button key={t.id} type="button" disabled={t.status === 'cannot_message'}
              onClick={() => {
                if (t.status === 'cannot_message') return
                setToast(t.status === 'request_required' ? 'Request required — not opened as a full chat' : t.status === 'booking_required' ? 'Open via booking channel' : 'Conversation ready (example)')
                if (t.status === 'can_message') openConv('c1')
              }}
              className="text-left px-3 py-3 rounded-xl min-h-[44px]"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', opacity: t.status === 'cannot_message' ? 0.55 : 1 }}>
              <p className="text-sm font-semibold">{t.name}</p>
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{t.handle} · {t.note}</p>
            </button>
          ))}
          <button type="button" onClick={() => openConv('c7')} className="min-h-[44px] rounded-xl text-sm font-semibold mt-2" style={{ background: 'var(--primary)', color: '#fff' }}>
            Contact Delve Support
          </button>
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
            {[
              { label: 'Mute', icon: BellOff, action: () => setFlow('mute') },
              { label: 'Archive', icon: Archive, action: () => setToast('Archived') },
              { label: 'Report', icon: Flag, action: () => setFlow('report') },
              { label: 'Block', icon: Ban, action: () => setFlow('block') },
            ].map(a => (
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
        {flow === 'mute' && <MuteSheet onClose={() => setFlow(null)} onMute={label => { setConversations(p => p.map(c => c.id === active.id ? { ...c, muted: true } : c)); setFlow(null); setToast(`Muted · ${label}`) }} />}
        {flow === 'block' && <BlockAccountFlow name={active.name} onClose={() => setFlow(null)} onBlocked={() => { setFlow(null); setToast('Account blocked'); setView('inbox') }} />}
        {flow === 'report' && <ReportMessageFlow onClose={() => setFlow(null)} onSubmitted={ref => { setFlow(null); setToast(`Report submitted · ${ref}`) }} />}
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
          onBlocked={also => { setFlow(also ? 'report' : null); setToast(also ? 'Blocked — continue report' : 'Account blocked'); if (!also) setView('inbox') }} />
      )}
      {flow === 'report' && (
        <ReportMessageFlow onClose={() => setFlow(null)} onSubmitted={ref => { setFlow(null); setToast(`Report submitted · ${ref}`) }} />
      )}
      {flow === 'safety' && <ImmediateSafetyFlow bookingRef={active?.bookingRef} onClose={() => setFlow(null)} />}
      {flow === 'location' && (
        <ShareLocationFlow onClose={() => setFlow(null)} onShare={label => { addSystemish('location', { locationLabel: label }); setFlow(null); setToast('Location shared once (example)') }} />
      )}
      {flow === 'spam' && <SpamWarning onClose={() => setFlow(null)} onBlock={() => setFlow('block')} />}
      {flow === 'mute' && active && (
        <MuteSheet onClose={() => setFlow(null)} onMute={label => { setConversations(p => p.map(c => c.id === active.id ? { ...c, muted: true } : c)); setFlow(null); setToast(`Muted · ${label}`) }} />
      )}
      {flow === 'share' && (
        <Sheet title="Share Delve content" onClose={() => setFlow(null)}>
          {[
            { kind: 'deal' as const, title: 'Guided Medina walk', subtitle: 'Example deal' },
            { kind: 'journey' as const, title: 'Morocco Golden Route', subtitle: 'Shared Journey card' },
            { kind: 'transport' as const, title: 'RAK → Medina transfer', subtitle: 'Example route' },
            { kind: 'booking' as const, title: 'Your stay summary', subtitle: 'Payment details stay private' },
          ].map(item => (
            <button key={item.title} type="button" className="w-full text-left px-3 py-3 rounded-xl mb-2 min-h-[44px]"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
              onClick={() => {
                addSystemish(item.kind === 'deal' ? 'deal' : item.kind === 'journey' ? 'journey' : item.kind === 'transport' ? 'transport' : 'booking', {
                  entity: { type: item.kind, title: item.title, subtitle: item.subtitle, status: 'Available' },
                })
                setFlow(null)
              }}>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{item.subtitle}</p>
            </button>
          ))}
        </Sheet>
      )}
      {toast && <Toast text={toast} />}
    </div>
  )
}
