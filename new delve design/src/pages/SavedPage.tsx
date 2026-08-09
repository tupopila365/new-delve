import { useState, type ReactNode } from 'react'
import {
  AlertTriangle, ChevronRight, Flame, MoreHorizontal, Plus, Star, TrendingDown, Users, X,
} from 'lucide-react'

const COLLECTIONS = [
  {
    id: 1, name: 'Morocco Trip', count: 14,
    cover: 'https://images.unsplash.com/photo-1539239476882-b5cc2f18d7e0?w=600&h=280&fit=crop&auto=format',
    privacy: 'Private', collab: false, members: 0,
  },
  {
    id: 2, name: 'Dream Stays', count: 8,
    cover: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=600&h=280&fit=crop&auto=format',
    privacy: 'Shared', collab: true, members: 3,
  },
  {
    id: 3, name: 'Budget Deals', count: 22,
    cover: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&h=280&fit=crop&auto=format',
    privacy: 'Private', collab: false, members: 0,
  },
]

const SAVED_ITEMS = [
  {
    id: 1, type: 'Deal', name: 'Sahara 3-Day Trek', provider: 'Atlas Expeditions', location: 'Merzouga, Morocco',
    img: 'https://images.unsplash.com/photo-1562671292-561df5bcbd7c?w=640&h=360&fit=crop&auto=format',
    price: 129, prevPrice: 189, priceBasis: 'per person',
    status: 'Deal ending soon', statusTone: 'warning' as const, availability: 'Limited — 3 left',
    rating: 4.8, savedDate: 'Aug 5',
  },
  {
    id: 2, type: 'Stay', name: 'Riad Dar Zitoun', provider: 'Verified Host', location: 'Marrakech, Morocco',
    img: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=640&h=360&fit=crop&auto=format',
    price: 98, prevPrice: null as number | null, priceBasis: 'per night',
    status: 'Available', statusTone: 'success' as const, availability: 'Available',
    rating: 4.9, savedDate: 'Jul 28',
  },
  {
    id: 3, type: 'Transport', name: 'CMN → RAK Train · 1st class', provider: 'ONCF Rail', location: 'Casablanca → Marrakech',
    img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=640&h=360&fit=crop&auto=format',
    price: 24, prevPrice: 31, priceBasis: 'one way',
    status: 'Price dropped', statusTone: 'success' as const, availability: 'Available',
    rating: 4.3, savedDate: 'Jul 30',
  },
]

const FILTER_TYPES = ['All', 'Deals', 'Stays', 'Transport', 'Activities', 'Places']

const ALERTS: { label: string; count: number; tone: 'warning' | 'success' | 'danger'; icon: ReactNode }[] = [
  { label: 'Ending soon', count: 2, tone: 'warning', icon: <Flame size={16} /> },
  { label: 'Price drops', count: 3, tone: 'success', icon: <TrendingDown size={16} /> },
  { label: 'Unavailable', count: 1, tone: 'danger', icon: <AlertTriangle size={16} /> },
]

function toneColor(tone: 'warning' | 'success' | 'danger') {
  if (tone === 'warning') return 'var(--auth-warning)'
  if (tone === 'danger') return 'var(--auth-danger)'
  return 'var(--auth-success)'
}

export default function SavedPage() {
  const [view, setView] = useState<'overview' | 'items'>('overview')
  const [filterType, setFilterType] = useState('All')

  const filteredItems = SAVED_ITEMS.filter(item => {
    if (filterType === 'All') return true
    if (filterType === 'Deals') return item.type === 'Deal'
    if (filterType === 'Stays') return item.type === 'Stay'
    if (filterType === 'Transport') return item.type === 'Transport'
    return false
  })

  return (
    <div className="pb-4">
      <div className="flex gap-2 px-3 sm:px-0 py-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        {([
          { key: 'overview' as const, label: 'Collections' },
          { key: 'items' as const, label: 'All Saved' },
        ]).map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setView(tab.key)}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold active:scale-[0.98]"
            style={{
              border: `1px solid ${view === tab.key ? 'var(--primary)' : 'var(--border)'}`,
              background: view === tab.key ? 'var(--primary)' : 'transparent',
              color: view === tab.key ? '#fff' : 'var(--fg)',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'overview' ? (
        <div className="px-3 sm:px-0 pt-4">
          <div className="flex gap-2.5 overflow-x-auto mb-5" style={{ scrollbarWidth: 'none' }}>
            {ALERTS.map(alert => {
              const color = toneColor(alert.tone)
              return (
                <button
                  key={alert.label}
                  type="button"
                  onClick={() => setView('items')}
                  className="flex-shrink-0 flex flex-col items-start gap-1 rounded-xl px-3.5 py-2.5 active:scale-95"
                  style={{
                    background: 'var(--surface)',
                    border: `1.5px solid color-mix(in srgb, ${color} 35%, var(--border))`,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ color }}>{alert.icon}</span>
                  <span className="text-xs font-bold whitespace-nowrap" style={{ color }}>
                    {alert.count} {alert.label}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between mb-3 px-0.5">
            <h2 className="font-display text-lg font-bold m-0" style={{ color: 'var(--fg)' }}>Collections</h2>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white active:opacity-90"
              style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
            >
              <Plus size={13} />
              New
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {COLLECTIONS.map(col => (
              <button
                key={col.id}
                type="button"
                onClick={() => setView('items')}
                className="overflow-hidden rounded-2xl text-left active:scale-[0.99] transition-transform"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <div className="relative h-28 overflow-hidden">
                  <img src={col.cover} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)' }} />
                  <span className="absolute top-2.5 right-2.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                    style={{ background: 'rgba(0,0,0,0.5)' }}>
                    {col.privacy}
                  </span>
                  {col.collab && (
                    <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                      style={{ background: 'var(--primary)' }}>
                      <Users size={11} />
                      Collab
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between px-3.5 py-3">
                  <div>
                    <p className="text-[15px] font-bold m-0 mb-0.5" style={{ color: 'var(--fg)' }}>{col.name}</p>
                    <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
                      {col.count} items{col.collab ? ` · ${col.members} members` : ''}
                    </p>
                  </div>
                  <ChevronRight size={18} style={{ color: 'var(--fg-muted)' }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex gap-2 overflow-x-auto px-3 sm:px-0 py-3"
            style={{ scrollbarWidth: 'none', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            {FILTER_TYPES.map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilterType(f)}
                className="flex-shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium active:scale-95"
                style={{
                  border: `1px solid ${filterType === f ? 'var(--primary)' : 'var(--border)'}`,
                  background: filterType === f ? 'var(--primary)' : 'transparent',
                  color: filterType === f ? '#fff' : 'var(--fg)',
                  cursor: 'pointer',
                }}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 px-3 sm:px-0 pt-3">
            {filteredItems.length === 0 ? (
              <div className="py-16 text-center">
                <p className="font-display text-lg font-bold mb-1" style={{ color: 'var(--fg)' }}>Nothing saved here</p>
                <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>Try another filter or save something from the feed.</p>
              </div>
            ) : filteredItems.map(item => {
              const color = toneColor(item.statusTone)
              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-2xl"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <div className="relative h-36 overflow-hidden">
                    <img src={item.img} alt="" className="h-full w-full object-cover" />
                    <span className="absolute top-2.5 left-2.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
                      style={{ background: 'rgba(0,0,0,0.6)' }}>
                      {item.type}
                    </span>
                    {item.prevPrice != null && (
                      <span className="absolute top-2.5 right-2.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
                        style={{ background: color }}>
                        {item.status}
                      </span>
                    )}
                  </div>
                  <div className="p-3.5">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-[15px] font-bold m-0 mb-0.5" style={{ color: 'var(--fg)' }}>
                          {item.name}
                        </h3>
                        <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
                          {item.location} · {item.provider}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-bold m-0 tabular-nums" style={{ color: 'var(--fg)' }}>${item.price}</p>
                        {item.prevPrice != null && (
                          <p className="text-[11px] m-0 line-through tabular-nums" style={{ color: 'var(--fg-muted)' }}>
                            ${item.prevPrice}
                          </p>
                        )}
                        <p className="text-[11px] m-0" style={{ color: 'var(--fg-muted)' }}>{item.priceBasis}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1">
                        <Star size={12} fill="#F59E0B" style={{ color: '#F59E0B' }} />
                        <span className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>{item.rating}</span>
                        <span className="text-xs font-semibold ml-1.5" style={{ color }}>{item.availability}</span>
                      </div>
                      <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>Saved {item.savedDate}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="flex-1 rounded-xl py-2 text-sm font-semibold text-white active:opacity-90"
                        style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
                      >
                        Book now
                      </button>
                      <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--fg)', cursor: 'pointer' }}
                        aria-label="More options"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--auth-danger)', cursor: 'pointer' }}
                        aria-label="Remove from saved"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
