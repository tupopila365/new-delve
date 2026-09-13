import { useEffect, useState } from 'react'
import { Bookmark, Calendar, Image as ImageIcon, MapPin, MessageCircle } from 'lucide-react'
import type { SaveDto } from '@delve/contracts'
import { fetchSaves, unsaveItem } from '../api/socialClient'
import { SectionHeader, ScrollRail, SectionEmpty, SaveButton } from '../components/shared'

interface SavedPageProps {
  onOpenPostAuthor?: (username: string) => void
  onOpenEvent?: (eventId: string) => void
  onOpenJourney?: (journeyId: string) => void
  onOpenCommunityThread?: (threadId: string) => void
  onOpenDeal?: (dealId: string) => void
  authReady?: boolean
  signedIn?: boolean
}

export default function SavedPage({
  onOpenEvent,
  onOpenJourney,
  onOpenCommunityThread,
  onOpenDeal,
  authReady = true,
  signedIn = true,
}: SavedPageProps) {
  const [items, setItems] = useState<SaveDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'POST' | 'EVENT' | 'JOURNEY' | 'COMMUNITY_THREAD' | 'DEAL'>('ALL')

  useEffect(() => {
    if (!authReady) {
      setLoading(true)
      setError(null)
      return
    }
    if (!signedIn) {
      setLoading(false)
      setItems([])
      setError('Sign in required')
      return
    }

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
  }, [authReady, signedIn])

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
    <div className="pb-8">
      <div className="px-3 sm:px-0 pt-4 pb-2">
        <SectionHeader
          title="Saved Items"
          subtitle="Your personal collection of saved journeys, community threads, deals, and events."
          icon={<Bookmark size={20} />}
        />

        <ScrollRail gap="sm" fadeEdges className="mt-2">
          {([
            { key: 'ALL' as const, label: 'All' },
            { key: 'POST' as const, label: 'Posts' },
            { key: 'COMMUNITY_THREAD' as const, label: 'Community' },
            { key: 'EVENT' as const, label: 'Events' },
            { key: 'JOURNEY' as const, label: 'Journeys' },
            { key: 'DEAL' as const, label: 'Deals' },
          ]).map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className="rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95"
              style={{
                border: `1px solid ${filter === tab.key ? 'var(--primary)' : 'var(--border)'}`,
                background: filter === tab.key ? 'var(--primary)' : 'var(--surface)',
                color: filter === tab.key ? '#fff' : 'var(--fg)',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </ScrollRail>
      </div>

      {loading && (
        <p className="px-4 py-8 text-sm" style={{ color: 'var(--fg-muted)' }}>Loading saves…</p>
      )}
      {error && !loading && (
        <p className="px-4 py-8 text-sm" style={{ color: 'var(--auth-danger)' }} role="alert">{error}</p>
      )}
      {!loading && !error && visible.length === 0 && (
        <div className="px-3 sm:px-0 py-6">
          <SectionEmpty
            icon={<Bookmark size={26} />}
            title="Nothing saved yet"
            description="Save Delvers posts, community threads, events, journeys, and deals to find them here later."
          />
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
              className="flex items-start gap-3 overflow-hidden rounded-2xl p-3"
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
                ) : item.targetType === 'JOURNEY' ? (
                  <MapPin size={20} style={{ color: 'var(--fg-muted)' }} />
                ) : item.targetType === 'COMMUNITY_THREAD' ? (
                  <MessageCircle size={20} style={{ color: 'var(--fg-muted)' }} />
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
                  {item.targetType === 'JOURNEY'
                    ? 'Journey'
                    : item.targetType === 'COMMUNITY_THREAD'
                      ? 'Community thread'
                      : item.targetType === 'DEAL'
                        ? 'Deal'
                        : item.targetType}{' '}
                  · {new Date(item.createdAt).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  {item.targetType === 'COMMUNITY_THREAD' && onOpenCommunityThread && (
                    <button
                      type="button"
                      onClick={() => onOpenCommunityThread(item.targetId)}
                      className="text-xs font-semibold hover:underline"
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}
                    >
                      Open
                    </button>
                  )}
                  {item.targetType === 'EVENT' && onOpenEvent && (
                    <button
                      type="button"
                      onClick={() => onOpenEvent(item.targetId)}
                      className="text-xs font-semibold hover:underline"
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}
                    >
                      Open
                    </button>
                  )}
                  {item.targetType === 'JOURNEY' && onOpenJourney && (
                    <button
                      type="button"
                      onClick={() => onOpenJourney(item.targetId)}
                      className="text-xs font-semibold hover:underline"
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}
                    >
                      Open
                    </button>
                  )}
                  {item.targetType === 'DEAL' && onOpenDeal && (
                    <button
                      type="button"
                      onClick={() => onOpenDeal(item.targetId)}
                      className="text-xs font-semibold hover:underline"
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}
                    >
                      Open
                    </button>
                  )}
                </div>
              </div>
              <SaveButton
                isSaved={true}
                onClick={() => void remove(item)}
                size="sm"
                variant="ghost"
                ariaLabel="Remove from saved"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
