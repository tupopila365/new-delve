import { useState } from 'react'
import type { Tok } from '../theme'

interface Props { t: Tok }

const COLLECTIONS = [
  { id: 1, name: 'Morocco Trip', count: 14, cover: 'https://images.unsplash.com/photo-1539239476882-b5cc2f18d7e0?w=300&h=200&fit=crop&auto=format', privacy: 'Private', collab: false },
  { id: 2, name: 'Dream Stays', count: 8, cover: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=300&h=200&fit=crop&auto=format', privacy: 'Shared', collab: true, members: 3 },
  { id: 3, name: 'Budget Deals', count: 22, cover: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=300&h=200&fit=crop&auto=format', privacy: 'Private', collab: false },
]

const SAVED_ITEMS = [
  {
    id: 1, type: 'Deal', name: 'Sahara 3-Day Trek', provider: 'Atlas Expeditions', location: 'Merzouga, Morocco',
    img: 'https://images.unsplash.com/photo-1562671292-561df5bcbd7c?w=300&h=200&fit=crop&auto=format',
    price: 129, prevPrice: 189, currency: 'USD', priceBasis: 'per person',
    status: 'Deal ending soon', statusColor: '#B76808', availability: 'Limited — 3 left',
    rating: 4.8, savedDate: 'Aug 5',
  },
  {
    id: 2, type: 'Stay', name: 'Riad Dar Zitoun', provider: 'Verified Host', location: 'Marrakech, Morocco',
    img: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=300&h=200&fit=crop&auto=format',
    price: 98, prevPrice: null, currency: 'USD', priceBasis: 'per night',
    status: 'Available', statusColor: '#16845B', availability: 'Available',
    rating: 4.9, savedDate: 'Jul 28',
  },
  {
    id: 3, type: 'Transport', name: 'CMN → RAK Train · 1st class', provider: 'ONCF Rail', location: 'Casablanca → Marrakech',
    img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=300&h=200&fit=crop&auto=format',
    price: 24, prevPrice: 31, currency: 'USD', priceBasis: 'one way',
    status: 'Price dropped', statusColor: '#16845B', availability: 'Available',
    rating: 4.3, savedDate: 'Jul 30',
  },
]

const FILTER_TYPES = ['All', 'Deals', 'Stays', 'Transport', 'Activities', 'Places']

export default function Saved({ t }: Props) {
  const [view, setView] = useState<'overview' | 'items'>('overview')
  const [filterType, setFilterType] = useState('All')

  return (
    <div style={{ background: t.canvas, minHeight: '100vh', paddingBottom: 80 }}>
      {/* Header toggle */}
      <div style={{ background: t.surface, borderBottom: `1px solid ${t.border}`, padding: '12px 16px', display: 'flex', gap: 8 }}>
        {['Collections', 'All Saved'].map((v, i) => (
          <button key={v} onClick={() => setView(i === 0 ? 'overview' : 'items')} style={{
            flex: 1, padding: '9px 0', borderRadius: 10,
            border: `1px solid ${(i === 0 ? view === 'overview' : view === 'items') ? t.brand : t.border}`,
            background: (i === 0 ? view === 'overview' : view === 'items') ? t.brand : 'transparent',
            color: (i === 0 ? view === 'overview' : view === 'items') ? '#fff' : t.text,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>{v}</button>
        ))}
      </div>

      {view === 'overview' ? (
        <div style={{ padding: '16px' }}>
          {/* Alerts row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {[
              { icon: '🔥', label: 'Ending soon', count: 2, color: '#B76808' },
              { icon: '💸', label: 'Price drops', count: 3, color: '#16845B' },
              { icon: '⚠️', label: 'Unavailable', count: 1, color: '#C83B3B' },
            ].map(a => (
              <button key={a.label} style={{
                flexShrink: 0, background: t.surface, border: `1.5px solid ${a.color}33`, borderRadius: 12,
                padding: '10px 14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3, cursor: 'pointer',
              }}>
                <span style={{ fontSize: 18 }}>{a.icon}</span>
                <span style={{ fontSize: 12, color: a.color, fontWeight: 700 }}>{a.count} {a.label}</span>
              </button>
            ))}
          </div>

          {/* Collections */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 17, color: t.text, margin: 0 }}>Collections</h2>
            <button style={{ background: t.brand, border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ New</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {COLLECTIONS.map(col => (
              <div key={col.id} style={{ background: t.surface, borderRadius: 16, overflow: 'hidden', border: `1px solid ${t.border}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                <div style={{ position: 'relative' }}>
                  <img src={col.cover} alt={col.name} style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)' }} />
                  <span style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>
                    {col.privacy}
                  </span>
                  {col.collab && (
                    <span style={{ position: 'absolute', top: 10, left: 10, background: t.brand, color: '#fff', fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>
                      👥 Collab
                    </span>
                  )}
                </div>
                <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15, color: t.text, margin: '0 0 2px' }}>{col.name}</p>
                    <p style={{ fontSize: 12, color: t.muted, margin: 0 }}>{col.count} items{col.collab ? ` · ${col.members} members` : ''}</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.muted} strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 16px', scrollbarWidth: 'none', background: t.surface, borderBottom: `1px solid ${t.border}` }}>
            {FILTER_TYPES.map(f => (
              <button key={f} onClick={() => setFilterType(f)} style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 20,
                border: `1px solid ${filterType === f ? t.brand : t.border}`,
                background: filterType === f ? t.brand : 'transparent',
                color: filterType === f ? '#fff' : t.text, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>{f}</button>
            ))}
          </div>

          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {SAVED_ITEMS.map(item => (
              <div key={item.id} style={{ background: t.surface, borderRadius: 16, overflow: 'hidden', border: `1px solid ${t.border}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                <div style={{ position: 'relative' }}>
                  <img src={item.img} alt={item.name} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                  <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 700 }}>{item.type}</span>
                  {item.prevPrice && (
                    <span style={{ position: 'absolute', top: 10, right: 10, background: item.statusColor, color: '#fff', fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 700 }}>
                      {item.status}
                    </span>
                  )}
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: t.text, margin: '0 0 2px' }}>{item.name}</h3>
                      <p style={{ fontSize: 12, color: t.muted, margin: 0 }}>{item.location} · {item.provider}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
                      <p style={{ fontWeight: 700, fontSize: 16, color: t.text, margin: 0 }}>${item.price}</p>
                      {item.prevPrice && <p style={{ fontSize: 11, color: t.muted, margin: 0, textDecoration: 'line-through' }}>${item.prevPrice}</p>}
                      <p style={{ fontSize: 11, color: t.muted, margin: 0 }}>{item.priceBasis}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ color: '#F59E0B', fontSize: 12 }}>★</span>
                      <span style={{ fontSize: 12, color: t.text, fontWeight: 600 }}>{item.rating}</span>
                      <span style={{ fontSize: 12, color: item.statusColor, fontWeight: 600, marginLeft: 6 }}>{item.availability}</span>
                    </div>
                    <span style={{ fontSize: 11, color: t.muted }}>Saved {item.savedDate}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{ flex: 1, padding: '8px 0', background: t.brand, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Book now</button>
                    <button style={{ padding: '8px 12px', background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, cursor: 'pointer', fontSize: 16 }}>⋯</button>
                    <button style={{ padding: '8px 12px', background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 8, color: t.error, cursor: 'pointer', fontSize: 14 }}>✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
