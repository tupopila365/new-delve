import { useState } from 'react'
import type { Tok } from '../theme'

interface Props { t: Tok }

const CONVERSATIONS = [
  {
    id: 1, type: 'personal', name: 'Youssef M.', handle: '@youssef.m',
    avatar: 'https://images.unsplash.com/photo-1679486038087-40723e5bbf6b?w=56&h=56&fit=crop&auto=format',
    preview: 'Are you arriving Friday or Saturday?', time: '2m', unread: 2, muted: false, pinned: true, verified: false,
  },
  {
    id: 2, type: 'journey', name: 'Morocco Golden Route', handle: '4 travelers',
    avatar: 'https://images.unsplash.com/photo-1539239476882-b5cc2f18d7e0?w=56&h=56&fit=crop&auto=format',
    preview: 'Layla: I booked the hammam for Friday evening 🛁', time: '18m', unread: 3, muted: false, pinned: true, verified: false,
  },
  {
    id: 3, type: 'business', name: 'Riad Dar Zitoun', handle: 'Verified Host',
    avatar: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=56&h=56&fit=crop&auto=format',
    preview: 'Your early check-in for Aug 14 is confirmed ✓', time: '1h', unread: 0, muted: false, pinned: false, verified: true,
  },
  {
    id: 4, type: 'community', name: 'Morocco Travellers', handle: '2.4k members',
    avatar: 'https://images.unsplash.com/photo-1517256673644-36ad11246d21?w=56&h=56&fit=crop&auto=format',
    preview: 'Moderator pinned: Ramadan dates 2027', time: '3h', unread: 0, muted: true, pinned: false, verified: false,
  },
  {
    id: 5, type: 'support', name: 'Delve Support', handle: 'Response in ~2h',
    avatar: null,
    preview: 'Your refund of $42.00 has been processed.', time: '1d', unread: 0, muted: false, pinned: false, verified: true,
  },
]

const MESSAGES_1 = [
  { id: 1, from: 'other', text: 'Hey! So excited for Morocco 🇲🇦', time: '09:12' },
  { id: 2, from: 'other', text: 'Which riad did you book in the end?', time: '09:13' },
  { id: 3, from: 'me', text: 'Riad Dar Zitoun! The reviews are incredible', time: '09:16' },
  { id: 4, from: 'me', text: 'Early check-in confirmed too 🎉', time: '09:16' },
  { id: 5, from: 'other', text: 'Nice!! Are you arriving Friday or Saturday?', time: '11:04' },
]

const CATEGORIES = ['All', 'Unread', 'Personal', 'Journeys', 'Communities', 'Businesses', 'Support', 'Archived']

export default function Messages({ t }: Props) {
  const [activeConv, setActiveConv] = useState<number | null>(null)
  const [activeCategory, setActiveCategory] = useState('All')
  const [input, setInput] = useState('')

  const conv = CONVERSATIONS.find(c => c.id === activeConv)

  if (activeConv && conv) {
    return (
      <div style={{ background: t.canvas, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Conversation header */}
        <div style={{
          background: t.surface,
          borderBottom: `1px solid ${t.border}`,
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
        }}>
          <button onClick={() => setActiveConv(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: t.text }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: t.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {conv.avatar
              ? <img src={conv.avatar} alt={conv.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>D</span>
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: t.text }}>{conv.name}</span>
              {conv.verified && <span style={{ fontSize: 14 }}>✓</span>}
            </div>
            <span style={{ fontSize: 12, color: t.muted }}>{conv.handle}</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
          </button>
        </div>

        {conv.type === 'business' && (
          <div style={{ background: `${t.brand}12`, borderBottom: `1px solid ${t.border}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13 }}>🏡</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: t.brand, margin: 0 }}>Booking DLV-83421 · Check-in Aug 14</p>
              <p style={{ fontSize: 11, color: t.muted, margin: 0 }}>Business · Verified host · Responds in ~1h</p>
            </div>
            <button style={{ marginLeft: 'auto', background: t.brand, border: 'none', borderRadius: 8, padding: '5px 10px', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Booking</button>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ textAlign: 'center', margin: '8px 0' }}>
            <span style={{ fontSize: 11, color: t.muted, background: t.surface, padding: '3px 10px', borderRadius: 20, border: `1px solid ${t.border}` }}>Today</span>
          </div>
          {MESSAGES_1.map(msg => (
            <div key={msg.id} style={{ display: 'flex', justifyContent: msg.from === 'me' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%',
                background: msg.from === 'me' ? t.msgSent : t.msgReceived,
                color: msg.from === 'me' ? t.msgSentText : t.msgReceivedText,
                borderRadius: msg.from === 'me' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                padding: '10px 14px',
                border: msg.from === 'me' ? 'none' : `1px solid ${t.border}`,
              }}>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>{msg.text}</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, opacity: 0.65, textAlign: 'right' }}>{msg.time}</p>
              </div>
            </div>
          ))}
          {/* Typing indicator */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden' }}>
              <img src={conv.avatar || ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ background: t.msgReceived, border: `1px solid ${t.border}`, borderRadius: '18px 18px 18px 4px', padding: '10px 16px', display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: t.muted, opacity: 0.5 + i * 0.2 }} />
              ))}
            </div>
          </div>
        </div>

        {/* Composer */}
        <div style={{
          background: t.surface,
          borderTop: `1px solid ${t.border}`,
          padding: '10px 12px',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)',
          display: 'flex', gap: 10, alignItems: 'flex-end',
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {['📎', '📍', '✈️'].map(icon => (
              <button key={icon} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: 2 }}>{icon}</button>
            ))}
          </div>
          <div style={{ flex: 1, background: t.canvas, border: `1px solid ${t.border}`, borderRadius: 20, padding: '10px 14px' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Message…"
              style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: t.text, fontSize: 14 }}
            />
          </div>
          <button style={{
            width: 40, height: 40, borderRadius: '50%',
            background: input.trim() ? t.brand : t.border,
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s', flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: t.canvas, minHeight: '100vh', paddingBottom: 80 }}>
      {/* Search */}
      <div style={{ padding: '12px 16px', background: t.surface, borderBottom: `1px solid ${t.border}` }}>
        <div style={{ background: t.canvas, border: `1px solid ${t.border}`, borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.muted} strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input placeholder="Search messages…" style={{ background: 'none', border: 'none', outline: 'none', color: t.text, fontSize: 14, flex: 1 }} />
        </div>
      </div>

      {/* Categories */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 16px', scrollbarWidth: 'none' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              flexShrink: 0,
              padding: '6px 14px',
              borderRadius: 20,
              border: `1px solid ${activeCategory === cat ? t.brand : t.border}`,
              background: activeCategory === cat ? t.brand : t.surface,
              color: activeCategory === cat ? '#fff' : t.text,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >{cat}</button>
        ))}
      </div>

      {/* Conversation list */}
      <div>
        {CONVERSATIONS.map(conv => (
          <button
            key={conv.id}
            onClick={() => setActiveConv(conv.id)}
            style={{
              width: '100%', display: 'flex', gap: 12, padding: '14px 16px', background: t.surface,
              borderBottom: `1px solid ${t.border}`, alignItems: 'center', textAlign: 'left', cursor: 'pointer', border: 'none',
              borderBottomColor: t.border, borderBottomStyle: 'solid', borderBottomWidth: 1,
            }}
          >
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', background: t.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {conv.avatar
                  ? <img src={conv.avatar} alt={conv.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: '#fff', fontWeight: 700 }}>D</span>
                }
              </div>
              {/* Type badge */}
              <div style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 18, height: 18, borderRadius: '50%',
                background: conv.type === 'journey' ? '#F59E0B' : conv.type === 'community' ? '#16845B' : conv.type === 'support' ? t.brand : conv.type === 'business' ? '#2769C7' : t.surface,
                border: `2px solid ${t.canvas}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9,
              }}>
                {conv.type === 'journey' ? '✈' : conv.type === 'community' ? '◆' : conv.type === 'support' ? '?' : conv.type === 'business' ? '★' : ''}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {conv.pinned && <span style={{ fontSize: 11, color: t.brand }}>📌</span>}
                  <span style={{ fontWeight: conv.unread ? 700 : 500, fontSize: 15, color: t.text }}>{conv.name}</span>
                  {conv.verified && <span style={{ color: t.brand, fontSize: 13, fontWeight: 700 }}>✓</span>}
                  {conv.muted && <span style={{ fontSize: 12, color: t.muted }}>🔇</span>}
                </div>
                <span style={{ fontSize: 12, color: t.muted, flexShrink: 0 }}>{conv.time}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 13, color: conv.unread ? t.text : t.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%', fontWeight: conv.unread ? 500 : 400 }}>
                  {conv.preview}
                </p>
                {conv.unread > 0 && (
                  <div style={{ background: t.brand, color: '#fff', borderRadius: 10, minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, padding: '0 5px', flexShrink: 0 }}>
                    {conv.unread}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* FAB */}
      <button style={{
        position: 'fixed', bottom: 90, right: 20,
        width: 52, height: 52, borderRadius: '50%',
        background: t.brand, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 20px ${t.brand}55`,
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
      </button>
    </div>
  )
}
