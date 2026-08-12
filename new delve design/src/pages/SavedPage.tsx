import { useEffect, useState } from 'react'
import { Bookmark, Calendar, Image as ImageIcon } from 'lucide-react'
import type { SaveDto } from '@delve/contracts'
import { fetchSaves, unsaveItem } from '../api/socialClient'

interface SavedPageProps {
  onOpenPostAuthor?: (username: string) => void
  onOpenEvent?: (eventId: string) => void
}

export default function SavedPage({ onOpenEvent }: SavedPageProps) {
  const [items, setItems] = useState<SaveDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'POST' | 'EVENT'>('ALL')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const data = await fetchSaves()
        if (!cancelled) {
          setItems(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load saves')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const visible = items.filter(i => (filter === 'ALL' ? true : i.targetType === filter))

  async function remove(item: SaveDto) {
    try {
      await unsaveItem({ targetType: item.targetType, targetId: item.targetId })
      setItems(list => list.filter(x => x.id !== item.id))
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="pb-4">
      <div className="px-3 sm:px-0 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <h1 className="font-display text-xl font-extrabold m-0 mb-3" style={{ color: 'var(--fg)' }}>
          Saved
        </h1>
        <div className="flex gap-2">
          {([
            { key: 'ALL' as const, label: 'All' },
            { key: 'POST' as const, label: 'Posts' },
            { key: 'EVENT' as const, label: 'Events' },
          ]).map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className="rounded-xl px-3.5 py-2 text-sm font-semibold"
              style={{
                border: `1px solid ${filter === tab.key ? 'var(--primary)' : 'var(--border)'}`,
                background: filter === tab.key ? 'var(--primary)' : 'transparent',
                color: filter === tab.key ? '#fff' : 'var(--fg)',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p className="px-4 py-8 text-sm" style={{ color: 'var(--fg-muted)' }}>Loading saves…</p>
      )}
      {error && (
        <p className="px-4 py-8 text-sm" style={{ color: 'var(--auth-danger)' }} role="alert">{error}</p>
      )}
      {!loading && !error && visible.length === 0 && (
        <div className="px-6 py-14 text-center">
          <Bookmark size={28} style={{ color: 'var(--fg-muted)', margin: '0 auto 10px' }} />
          <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>Nothing saved yet</p>
          <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
            Save Delvers posts and events to find them here later.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 p-3 sm:p-0 sm:pt-4">
        {visible.map(item => {
          const title = item.preview?.title || `${item.targetType} · ${item.targetId.slice(0, 8)}`
          const subtitle = item.preview?.subtitle
          const img = item.preview?.imageUrl
          return (
            <div
              key={item.id}
              className="flex gap-3 overflow-hidden rounded-2xl p-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div
                className="h-16 w-16 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--surface-subtle)' }}
              >
                {img ? (
                  <img src={img} alt="" className="h-full w-full object-cover" />
                ) : item.targetType === 'EVENT' ? (
                  <Calendar size={20} style={{ color: 'var(--fg-muted)' }} />
                ) : (
                  <ImageIcon size={20} style={{ color: 'var(--fg-muted)' }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--fg)' }}>{title}</p>
                {subtitle && (
                  <p className="text-xs m-0 mt-0.5 truncate" style={{ color: 'var(--fg-muted)' }}>{subtitle}</p>
                )}
                <p className="text-[11px] m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>
                  {item.targetType} · {new Date(item.createdAt).toLocaleDateString()}
                </p>
                <div className="flex gap-3 mt-2">
                  {item.targetType === 'EVENT' && onOpenEvent && (
                    <button
                      type="button"
                      onClick={() => onOpenEvent(item.targetId)}
                      className="text-xs font-semibold"
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}
                    >
                      Open
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void remove(item)}
                    className="text-xs font-semibold"
                    style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 0 }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
