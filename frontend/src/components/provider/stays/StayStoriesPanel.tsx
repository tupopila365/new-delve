import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { apiFetch } from '../../../api/client'
import { friendlyApiMessage } from '../../../utils/friendlyError'
import { HighlightChannelEditor } from '../../highlights/HighlightChannelEditor'
import {
  ensureHighlightChannelsMediaUrls,
  normalizeHighlightsForSave,
  type HighlightChannelInput,
} from '../../highlights'
import type { ProviderStayListing } from './stayListingTypes'

type Props = {
  listings: ProviderStayListing[]
  canManage?: boolean
  /** Prefill selected listing (e.g. from detail page deep-link). */
  initialListingId?: number | null
}

function channelsFromListing(listing: ProviderStayListing | null): HighlightChannelInput[] {
  if (!listing) return []
  return (listing.listing_stories ?? []).map((ch) => ({
    id: ch.id,
    label: ch.label,
    coverSrc: ch.coverSrc,
    slides: (ch.slides ?? []).map((s) => ({ ...s })),
  }))
}

export function StayStoriesPanel({ listings, canManage = true, initialListingId = null }: Props) {
  const qc = useQueryClient()
  const defaultId =
    initialListingId && listings.some((l) => l.id === initialListingId)
      ? initialListingId
      : listings[0]?.id ?? null
  const [selectedId, setSelectedId] = useState<number | null>(defaultId)
  const [channels, setChannels] = useState<HighlightChannelInput[]>(() =>
    channelsFromListing(listings.find((l) => l.id === defaultId) ?? null),
  )
  const [error, setError] = useState('')
  const [savedFlash, setSavedFlash] = useState('')

  const selected = useMemo(
    () => listings.find((l) => l.id === selectedId) ?? null,
    [listings, selectedId],
  )

  useEffect(() => {
    if (initialListingId && listings.some((l) => l.id === initialListingId)) {
      setSelectedId(initialListingId)
    }
  }, [initialListingId, listings])

  useEffect(() => {
    setChannels(channelsFromListing(selected))
    setError('')
  }, [selected])

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Select a property first.')
      const listing_stories = await ensureHighlightChannelsMediaUrls(
        normalizeHighlightsForSave(channels),
      )
      return apiFetch<ProviderStayListing>(`/api/accommodation/provider-listings/${selected.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ listing_stories }),
      })
    },
    onSuccess: async (saved) => {
      setError('')
      setChannels(channelsFromListing(saved))
      setSavedFlash('Highlights saved')
      window.setTimeout(() => setSavedFlash(''), 2200)
      await qc.invalidateQueries({ queryKey: ['provider-stays'] })
      await qc.invalidateQueries({ queryKey: ['acc'] })
      await qc.invalidateQueries({ queryKey: ['accommodation'] })
    },
    onError: (e) => setError(friendlyApiMessage(e, 'Could not save highlights.')),
  })

  if (listings.length === 0) {
    return (
      <div className="stay-stories">
        <header className="stay-stories__head">
          <div>
            <h2 className="stay-stories__title">Highlights</h2>
            <p className="stay-stories__sub">
              Organize photos and videos travellers see on each stay detail page.
            </p>
          </div>
        </header>
        <div className="stay-stories__empty">
          <strong>Add a property first</strong>
          <p>Highlights are managed per listing — create a stay, then come back here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="stay-stories">
      <header className="stay-stories__head">
        <div>
          <h2 className="stay-stories__title">Highlights</h2>
          <p className="stay-stories__sub">
            Organize photos and videos travellers can tap through on your stay pages — not social posts.
          </p>
        </div>
        {canManage && selected ? (
          <button
            type="button"
            className="prov-ui__btn prov-ui__btn--primary"
            disabled={saveMut.isPending}
            onClick={() => saveMut.mutate()}
          >
            {saveMut.isPending ? 'Saving…' : 'Save highlights'}
          </button>
        ) : null}
      </header>

      <div className="stay-stories__listing-picks">
        <label className="stay-stories__label" htmlFor="stay-highlights-listing">
          Property
        </label>
        <select
          id="stay-highlights-listing"
          className="stay-stories__select"
          value={selectedId ?? ''}
          onChange={(e) => {
            const next = Number(e.target.value)
            setSelectedId(Number.isFinite(next) ? next : null)
          }}
        >
          {listings.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
              {(l.listing_stories?.length ?? 0) > 0
                ? ` · ${l.listing_stories!.length} ring${l.listing_stories!.length === 1 ? '' : 's'}`
                : ' · no highlights'}
            </option>
          ))}
        </select>
        {selected ? (
          <p className="stay-stories__pick-meta">
            Public page: <Link to={`/accommodation/${selected.id}`}>{selected.title}</Link>
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="stay-stories__error" role="alert">
          {error}
        </p>
      ) : null}
      {savedFlash ? (
        <p className="stay-stories__saved" role="status">
          {savedFlash}
        </p>
      ) : null}

      {selected && canManage ? (
        <HighlightChannelEditor
          channels={channels}
          onChange={setChannels}
          hint="Highlight rings on this stay page — rooms, amenities, location, or behind-the-scenes. Organize media travellers can tap through."
          emptyCopy="No custom highlights yet. Auto-generated rings still use your cover and gallery photos."
        />
      ) : selected ? (
        <p className="stay-stories__empty">View only — you cannot edit highlights for this listing.</p>
      ) : null}

      {canManage && selected && channels.length === 0 ? (
        <p className="stay-stories__hint">
          <Plus size={14} aria-hidden /> Tip: create a ring like “Rooms” or “The property”, then add slides.
        </p>
      ) : null}
    </div>
  )
}
