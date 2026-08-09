import { useState } from 'react'
import type { Tok } from '../theme'

interface Props { t: Tok }

const NOTIFS = [
  {
    id: 1, category: 'Deals', icon: '💸', read: false, time: '2m ago', requiresAck: false,
    title: 'Price dropped on Sahara Trek',
    desc: 'Atlas Expeditions dropped the price from $189 to $129 · Ends in 6h',
    action: 'View deal',
    preview: 'https://images.unsplash.com/photo-1562671292-561df5bcbd7c?w=60&h=60&fit=crop&auto=format',
  },
  {
    id: 2, category: 'Bookings', icon: '✅', read: false, time: '1h ago', requiresAck: false,
    title: 'Booking confirmed',
    desc: 'Riad Dar Zitoun · Aug 14–18 · DLV-83421',
    action: 'View booking',
    preview: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=60&h=60&fit=crop&auto=format',
  },
  {
    id: 3, category: 'Security', icon: '🔒', read: false, time: '2h ago', requiresAck: true,
    title: 'New sign-in detected',
    desc: 'Signed in from Dakar, Senegal · iPhone 15 · If this was not you, secure your account now.',
    action: 'Review activity',
    preview: null,
  },
  {
    id: 4, category: 'Journeys', icon: '✈️', read: true, time: '3h ago', requiresAck: false,
    title: 'Layla added a booking to Morocco Golden Route',
    desc: 'Hammam Ziani — Friday evening 19:00',
    action: 'Open Journey',
    preview: 'https://images.unsplash.com/photo-1552699611-e2c208d5d9cf?w=60&h=60&fit=crop&auto=format',
  },
  {
    id: 5, category: 'Followers', icon: '👤', read: true, time: '5h ago', requiresAck: false,
    title: '3 people followed you',
    desc: 'Kwame A., Fatima L. and 1 other',
    action: 'See followers',
    preview: null,
  },
  {
    id: 6, category: 'Transport', icon: '🚂', read: true, time: 'Yesterday', requiresAck: false,
    title: 'Departure reminder',
    desc: 'CMN → RAK · Tomorrow 08:40 · Coach 4, Seat 12A · Platform 3',
    action: 'View ticket',
    preview: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=60&h=60&fit=crop&auto=format',
  },
  {
    id: 7, category: 'Payments', icon: '💳', read: true, time: 'Yesterday', requiresAck: false,
    title: 'Refund processed',
    desc: '$42.00 refunded to your Visa ending 4242 · Sahara Trek cancellation',
    action: 'View receipt',
    preview: null,
  },
]

const CATEGORIES = ['All', 'Bookings', 'Transport', 'Deals', 'Journeys', 'Messages', 'Followers', 'Payments', 'Security']

const CATEGORY_COLORS: Record<string, string> = {
  Deals: '#B76808',
  Bookings: '#16845B',
  Security: '#C83B3B',
  Journeys: '#8C52FF',
  Followers: '#2769C7',
  Transport: '#5F2FC9',
  Payments: '#16845B',
  Messages: '#8C52FF',
}

export default function Notifications({ t }: Props) {
  const [notifs, setNotifs] = useState(NOTIFS)
  const [activeCategory, setActiveCategory] = useState('All')

  const filtered = activeCategory === 'All' ? notifs : notifs.filter(n => n.category === activeCategory)
  const todayNotifs = filtered.filter(n => !['Yesterday'].includes(n.time))
  const yesterdayNotifs = filtered.filter(n => n.time === 'Yesterday')

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  const markRead = (id: number) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  const dismiss = (id: number) => setNotifs(prev => prev.filter(n => n.id !== id))

  return (
    <div style={{ background: t.canvas, minHeight: '100vh', paddingBottom: 80 }}>
      {/* Toolbar */}
      <div style={{ background: t.surface, borderBottom: `1px solid ${t.border}`, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: t.muted }}>{notifs.filter(n => !n.read).length} unread</span>
        <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: t.brand, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Mark all read</button>
      </div>

      {/* Categories */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 16px', scrollbarWidth: 'none', background: t.surface, borderBottom: `1px solid ${t.border}` }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={{
            flexShrink: 0, padding: '6px 14px', borderRadius: 20,
            border: `1px solid ${activeCategory === cat ? t.brand : t.border}`,
            background: activeCategory === cat ? t.brand : 'transparent',
            color: activeCategory === cat ? '#fff' : t.text, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>{cat}</button>
        ))}
      </div>

      {/* Notification groups */}
      {todayNotifs.length > 0 && (
        <div>
          <div style={{ padding: '14px 16px 6px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Today</span>
          </div>
          {todayNotifs.map(n => <NotifItem key={n.id} n={n} t={t} onRead={markRead} onDismiss={dismiss} />)}
        </div>
      )}

      {yesterdayNotifs.length > 0 && (
        <div>
          <div style={{ padding: '14px 16px 6px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Yesterday</span>
          </div>
          {yesterdayNotifs.map(n => <NotifItem key={n.id} n={n} t={t} onRead={markRead} onDismiss={dismiss} />)}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <p style={{ fontSize: 36, margin: '0 0 12px' }}>🔔</p>
          <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: t.text, margin: '0 0 6px' }}>All caught up</p>
          <p style={{ fontSize: 14, color: t.muted, margin: 0 }}>No notifications in this category.</p>
        </div>
      )}
    </div>
  )
}

function NotifItem({ n, t, onRead, onDismiss }: {
  n: typeof NOTIFS[0]; t: Tok;
  onRead: (id: number) => void;
  onDismiss: (id: number) => void;
}) {
  const catColor = CATEGORY_COLORS[n.category] || t.brand
  const isSecurity = n.category === 'Security'

  return (
    <div
      onClick={() => onRead(n.id)}
      style={{
        background: n.read ? t.surface : isSecurity ? `${n.read ? '' : '#C83B3B0D'}` : `${t.brand}0A`,
        borderLeft: isSecurity ? `3px solid #C83B3B` : `3px solid ${n.read ? 'transparent' : t.brand}`,
        borderBottom: `1px solid ${t.border}`,
        padding: '14px 16px',
        display: 'flex', gap: 12, cursor: 'pointer',
        position: 'relative',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 42, height: 42, borderRadius: '50%',
        background: `${catColor}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: 19,
      }}>
        {n.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
          <p style={{ fontWeight: n.read ? 500 : 700, fontSize: 14, color: t.text, margin: 0, flex: 1, paddingRight: 8 }}>{n.title}</p>
          <span style={{ fontSize: 11, color: t.muted, flexShrink: 0 }}>{n.time}</span>
        </div>
        <p style={{ fontSize: 13, color: t.muted, margin: '0 0 8px', lineHeight: 1.4 }}>{n.desc}</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={{
            background: isSecurity ? '#C83B3B' : t.brand,
            border: 'none', borderRadius: 8, padding: '6px 12px',
            color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            {n.action}
          </button>
          {n.requiresAck && (
            <span style={{ fontSize: 11, color: '#C83B3B', fontWeight: 700 }}>⚠ Action required</span>
          )}
          {!n.requiresAck && (
            <button onClick={e => { e.stopPropagation(); onDismiss(n.id) }} style={{
              background: 'none', border: 'none', color: t.muted, fontSize: 12, cursor: 'pointer', padding: '4px 8px',
            }}>Dismiss</button>
          )}
        </div>
      </div>

      {n.preview && (
        <div style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: t.canvas }}>
          <img src={n.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {!n.read && (
        <div style={{ position: 'absolute', top: 18, right: n.preview ? 76 : 16, width: 8, height: 8, borderRadius: '50%', background: t.brand }} />
      )}
    </div>
  )
}
