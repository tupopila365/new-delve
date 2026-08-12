import { useEffect, useState } from 'react'
import { List, Plus } from 'lucide-react'
import type { ListingDto } from '@delve/contracts'
import { createListing, fetchBusinessListings, fetchListing, updateListing } from '../../api/listingClient'
import ListingMediaEditor from '../../media/ListingMediaEditor'
import ListingMediaGallery from '../../media/ListingMediaGallery'

interface ProviderListingsViewProps {
  businessId: string
}

export default function ProviderListingsView({ businessId }: ProviderListingsViewProps) {
  const [listings, setListings] = useState<ListingDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  async function reload() {
    const rows = await fetchBusinessListings(businessId)
    setListings(rows)
    return rows
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const rows = await reload()
        if (!cancelled && rows[0] && !selectedId) setSelectedId(rows[0].id)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load listings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [businessId])

  const selected = listings.find(l => l.id === selectedId) ?? null

  useEffect(() => {
    if (!selected) {
      setEditTitle('')
      setEditDescription('')
      return
    }
    setEditTitle(selected.title)
    setEditDescription(selected.description ?? '')
  }, [selected?.id, selected?.title, selected?.description])

  async function handleCreate() {
    const trimmed = title.trim()
    if (trimmed.length < 2 || creating) return
    setCreating(true)
    setError(null)
    try {
      const created = await createListing(businessId, { title: trimmed })
      setTitle('')
      const rows = await reload()
      setListings(rows)
      setSelectedId(created.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create listing')
    } finally {
      setCreating(false)
    }
  }

  async function onListingChanged(listing: ListingDto) {
    setListings(prev => prev.map(l => (l.id === listing.id ? listing : l)))
    try {
      const fresh = await fetchListing(listing.id)
      setListings(prev => prev.map(l => (l.id === fresh.id ? fresh : l)))
    } catch {
      /* keep local */
    }
  }

  async function handleSaveDetails() {
    if (!selected || saving) return
    const nextTitle = editTitle.trim()
    if (nextTitle.length < 2) {
      setError('Title must be at least 2 characters.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const updated = await updateListing(selected.id, {
        title: nextTitle,
        description: editDescription.trim() ? editDescription.trim() : null,
      })
      await onListingChanged(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save listing')
    } finally {
      setSaving(false)
    }
  }

  async function handleSetStatus(status: 'DRAFT' | 'PUBLISHED' | 'PAUSED') {
    if (!selected || saving) return
    setSaving(true)
    setError(null)
    try {
      const updated = await updateListing(selected.id, { status })
      await onListingChanged(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update listing status')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 h-full overflow-y-auto space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold m-0" style={{ color: 'var(--fg)' }}>
            Listings
          </h1>
          <p className="text-sm m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>
            Create drafts, add media, then publish when ready for travelers.
          </p>
        </div>
      </div>

      <div
        className="rounded-2xl px-4 py-4 flex flex-col sm:flex-row gap-2"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="New listing title"
          className="flex-1 rounded-xl px-3 py-2.5 text-sm"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
        />
        <button
          type="button"
          disabled={creating || title.trim().length < 2}
          onClick={() => void handleCreate()}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white"
          style={{
            background: 'var(--primary)',
            border: 'none',
            cursor: creating ? 'wait' : 'pointer',
            opacity: creating || title.trim().length < 2 ? 0.6 : 1,
          }}
        >
          <Plus size={15} />
          {creating ? 'Creating…' : 'Create listing'}
        </button>
      </div>

      {error && (
        <p className="text-sm m-0" style={{ color: 'var(--auth-danger)' }} role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Loading listings…
        </p>
      ) : listings.length === 0 ? (
        <div
          className="rounded-2xl px-6 py-14 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <List size={28} style={{ color: 'var(--fg-muted)', margin: '0 auto 12px' }} />
          <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>
            No listings yet
          </p>
          <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
            Create a draft listing, then add media and publish.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
          <div className="space-y-2">
            {listings.map(l => {
              const cover = l.media.find(m => m.id === l.coverMediaId) || l.media.find(m => m.isCover)
              const active = l.id === selectedId
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setSelectedId(l.id)}
                  className="w-full text-left rounded-xl overflow-hidden"
                  style={{
                    border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                    background: active ? 'rgba(140,82,255,0.08)' : 'var(--surface)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ height: 72 }}>
                    {cover?.delivery?.url && cover.resourceType !== 'video' ? (
                      <img
                        src={cover.delivery.url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        onError={e => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-xs"
                        style={{ background: 'var(--surface-subtle)', color: 'var(--fg-muted)' }}
                      >
                        No cover
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--fg)' }}>
                      {l.title}
                    </p>
                    <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
                      {l.media.length} media · {l.status}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          <div
            className="rounded-2xl px-4 py-4 space-y-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            {selected ? (
              <>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <p className="text-xs font-semibold m-0" style={{ color: 'var(--fg-muted)' }}>
                      Status: {selected.status}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selected.status !== 'PUBLISHED' && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void handleSetStatus('PUBLISHED')}
                          className="rounded-xl px-3 py-2 text-xs font-semibold text-white"
                          style={{ background: '#0F8A52', border: 'none', cursor: saving ? 'wait' : 'pointer' }}
                        >
                          Publish
                        </button>
                      )}
                      {selected.status === 'PUBLISHED' && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void handleSetStatus('PAUSED')}
                          className="rounded-xl px-3 py-2 text-xs font-semibold"
                          style={{
                            background: 'var(--surface-subtle)',
                            border: '1px solid var(--border)',
                            color: 'var(--fg)',
                            cursor: saving ? 'wait' : 'pointer',
                          }}
                        >
                          Pause
                        </button>
                      )}
                      {selected.status !== 'DRAFT' && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void handleSetStatus('DRAFT')}
                          className="rounded-xl px-3 py-2 text-xs font-semibold"
                          style={{
                            background: 'var(--surface-subtle)',
                            border: '1px solid var(--border)',
                            color: 'var(--fg)',
                            cursor: saving ? 'wait' : 'pointer',
                          }}
                        >
                          Revert to draft
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                    aria-label="Listing title"
                  />
                  <textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    rows={3}
                    placeholder="Description"
                    className="w-full rounded-xl px-3 py-2.5 text-sm resize-y"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                    aria-label="Listing description"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSaveDetails()}
                    className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white"
                    style={{ background: 'var(--primary)', border: 'none', cursor: saving ? 'wait' : 'pointer' }}
                  >
                    {saving ? 'Saving…' : 'Save details'}
                  </button>
                </div>
                <ListingMediaEditor
                  listing={selected}
                  businessId={businessId}
                  onChanged={onListingChanged}
                />
              </>
            ) : (
              <ListingMediaGallery media={[]} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
