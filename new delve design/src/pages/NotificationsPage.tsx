import { useState, type ReactNode } from 'react'
import {
  AlertTriangle, Bell, Bus, CalendarCheck, CreditCard, Lock,
  Navigation, Tag, UserPlus, X,
} from 'lucide-react'

type NotifCategory = 'Deals' | 'Bookings' | 'Security' | 'Journeys' | 'Followers' | 'Transport' | 'Payments' | 'Messages'

interface Notif {
  id: number
  category: NotifCategory
  read: boolean
  time: string
  requiresAck: boolean
  title: string
  desc: string
  action: string
  preview: string | null
}

const INITIAL: Notif[] = [
  {
    id: 1, category: 'Deals', read: false, time: '2m ago', requiresAck: false,
    title: 'Price dropped on Sahara Trek',
    desc: 'Atlas Expeditions dropped the price from $189 to $129 · Ends in 6h',
    action: 'View deal',
    preview: 'https://images.unsplash.com/photo-1562671292-561df5bcbd7c?w=120&h=120&fit=crop&auto=format',
  },
  {
    id: 2, category: 'Bookings', read: false, time: '1h ago', requiresAck: false,
    title: 'Booking confirmed',
    desc: 'Riad Dar Zitoun · Aug 14–18 · DLV-83421',
    action: 'View booking',
    preview: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=120&h=120&fit=crop&auto=format',
  },
  {
    id: 3, category: 'Security', read: false, time: '2h ago', requiresAck: true,
    title: 'New sign-in detected',
    desc: 'Signed in from Dakar, Senegal · iPhone 15 · If this was not you, secure your account now.',
    action: 'Review activity',
    preview: null,
  },
  {
    id: 4, category: 'Journeys', read: true, time: '3h ago', requiresAck: false,
    title: 'Layla added a booking to Morocco Golden Route',
    desc: 'Hammam Ziani — Friday evening 19:00',
    action: 'Open Journey',
    preview: 'https://images.unsplash.com/photo-1552699611-e2c208d5d9cf?w=120&h=120&fit=crop&auto=format',
  },
  {
    id: 5, category: 'Followers', read: true, time: '5h ago', requiresAck: false,
    title: '3 people followed you',
    desc: 'Kwame A., Fatima L. and 1 other',
    action: 'See followers',
    preview: null,
  },
  {
    id: 6, category: 'Transport', read: true, time: 'Yesterday', requiresAck: false,
    title: 'Departure reminder',
    desc: 'CMN → RAK · Tomorrow 08:40 · Coach 4, Seat 12A · Platform 3',
    action: 'View ticket',
    preview: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=120&h=120&fit=crop&auto=format',
  },
  {
    id: 7, category: 'Payments', read: true, time: 'Yesterday', requiresAck: false,
    title: 'Refund processed',
    desc: '$42.00 refunded to your Visa ending 4242 · Sahara Trek cancellation',
    action: 'View receipt',
    preview: null,
  },
]

const CATEGORIES = ['All', 'Bookings', 'Transport', 'Deals', 'Journeys', 'Messages', 'Followers', 'Payments', 'Security']

const CATEGORY_META: Record<NotifCategory, { color: string; icon: ReactNode }> = {
  Deals:      { color: 'var(--auth-warning)', icon: <Tag size={18} /> },
  Bookings:   { color: 'var(--auth-success)', icon: <CalendarCheck size={18} /> },
  Security:   { color: 'var(--auth-danger)', icon: <Lock size={18} /> },
  Journeys:   { color: '#8C52FF', icon: <Navigation size={18} /> },
  Followers:  { color: '#2769C7', icon: <UserPlus size={18} /> },
  Transport:  { color: 'var(--primary)', icon: <Bus size={18} /> },
  Payments:   { color: 'var(--auth-success)', icon: <CreditCard size={18} /> },
  Messages:   { color: '#8C52FF', icon: <Bell size={18} /> },
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState(INITIAL)
  const [activeCategory, setActiveCategory] = useState('All')

  const filtered = activeCategory === 'All'
    ? notifs
    : notifs.filter(n => n.category === activeCategory)
  const todayNotifs = filtered.filter(n => n.time !== 'Yesterday')
  const yesterdayNotifs = filtered.filter(n => n.time === 'Yesterday')
  const unreadCount = notifs.filter(n => !n.read).length

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  const markRead = (id: number) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  const dismiss = (id: number) => setNotifs(prev => prev.filter(n => n.id !== id))

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between px-4 sm:px-0 py-2.5"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          {unreadCount} unread
        </span>
        <button
          type="button"
          onClick={markAllRead}
          className="text-sm font-semibold active:opacity-70"
          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
        >
          Mark all read
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto px-3 sm:px-0 py-3"
        style={{ scrollbarWidth: 'none', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className="flex-shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap active:scale-95"
            style={{
              border: `1px solid ${activeCategory === cat ? 'var(--primary)' : 'var(--border)'}`,
              background: activeCategory === cat ? 'var(--primary)' : 'transparent',
              color: activeCategory === cat ? '#fff' : 'var(--fg)',
              cursor: 'pointer',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {todayNotifs.length > 0 && (
        <section>
          <div className="px-4 sm:px-1 pt-4 pb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>
              Today
            </span>
          </div>
          <div className="sm:rounded-2xl overflow-hidden sm:border" style={{ borderColor: 'var(--border)' }}>
            {todayNotifs.map(n => (
              <NotifItem key={n.id} n={n} onRead={markRead} onDismiss={dismiss} />
            ))}
          </div>
        </section>
      )}

      {yesterdayNotifs.length > 0 && (
        <section>
          <div className="px-4 sm:px-1 pt-4 pb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>
              Yesterday
            </span>
          </div>
          <div className="sm:rounded-2xl overflow-hidden sm:border" style={{ borderColor: 'var(--border)' }}>
            {yesterdayNotifs.map(n => (
              <NotifItem key={n.id} n={n} onRead={markRead} onDismiss={dismiss} />
            ))}
          </div>
        </section>
      )}

      {filtered.length === 0 && (
        <div className="px-6 py-16 text-center">
          <span
            className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
            style={{ background: 'rgba(140,82,255,0.1)', color: 'var(--primary)' }}
          >
            <Bell size={24} />
          </span>
          <p className="font-display text-lg font-bold mb-1" style={{ color: 'var(--fg)' }}>All caught up</p>
          <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>No notifications in this category.</p>
        </div>
      )}
    </div>
  )
}

function NotifItem({
  n,
  onRead,
  onDismiss,
}: {
  n: Notif
  onRead: (id: number) => void
  onDismiss: (id: number) => void
}) {
  const meta = CATEGORY_META[n.category]
  const isSecurity = n.category === 'Security'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onRead(n.id)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onRead(n.id) }}
      className="relative flex gap-3 px-4 py-3.5 cursor-pointer"
      style={{
        background: n.read
          ? 'var(--surface)'
          : isSecurity
            ? 'color-mix(in srgb, var(--auth-danger) 8%, var(--surface))'
            : 'color-mix(in srgb, var(--primary) 6%, var(--surface))',
        borderLeft: `3px solid ${isSecurity ? 'var(--auth-danger)' : n.read ? 'transparent' : 'var(--primary)'}`,
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
        style={{
          background: `color-mix(in srgb, ${meta.color} 16%, transparent)`,
          color: meta.color,
        }}
      >
        {meta.icon}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p
            className="text-sm m-0 flex-1 pr-2"
            style={{ color: 'var(--fg)', fontWeight: n.read ? 500 : 700 }}
          >
            {n.title}
          </p>
          <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--fg-muted)' }}>{n.time}</span>
        </div>
        <p className="text-sm leading-snug m-0 mb-2" style={{ color: 'var(--fg-muted)' }}>{n.desc}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={e => e.stopPropagation()}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white active:opacity-90"
            style={{
              background: isSecurity ? 'var(--auth-danger)' : 'var(--primary)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {n.action}
          </button>
          {n.requiresAck && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: 'var(--auth-danger)' }}>
              <AlertTriangle size={11} />
              Action required
            </span>
          )}
          {!n.requiresAck && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onDismiss(n.id) }}
              className="inline-flex items-center gap-1 text-xs px-2 py-1"
              style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}
            >
              <X size={12} />
              Dismiss
            </button>
          )}
        </div>
      </div>

      {n.preview && (
        <div className="h-13 w-13 flex-shrink-0 overflow-hidden rounded-xl"
          style={{ width: 52, height: 52, background: 'var(--bg)' }}>
          <img src={n.preview} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      {!n.read && (
        <span
          className="absolute top-4 rounded-full"
          style={{
            right: n.preview ? 76 : 16,
            width: 8,
            height: 8,
            background: 'var(--primary)',
          }}
        />
      )}
    </div>
  )
}
