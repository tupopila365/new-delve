import { useState } from 'react'
import type { ListingDto } from '@delve/contracts'
import ListingMediaGallery from './ListingMediaGallery'
import { fetchListing, updateListing } from '../api/listingClient'
import MediaStudio from '../pages/MediaStudio'

interface ListingMediaEditorProps {
  listing: ListingDto
  businessId: string
  onChanged: (listing: ListingDto) => void
  editable?: boolean
}

export default function ListingMediaEditor({
  listing,
  businessId,
  onChanged,
  editable = true,
}: ListingMediaEditorProps) {
  const [studioOpen, setStudioOpen] = useState(false)

  async function refresh() {
    const fresh = await fetchListing(listing.id)
    onChanged(fresh)
  }

  async function setAsCover(mediaId: string) {
    const updated = await updateListing(listing.id, { coverMediaId: mediaId })
    onChanged(updated)
  }

  return (
    <div className="space-y-4">
      <ListingMediaGallery media={listing.media} coverMediaId={listing.coverMediaId} />

      {editable && (
        <>
          <button
            type="button"
            onClick={() => setStudioOpen(true)}
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white"
            style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
          >
            Add media in Media Studio
          </button>
          <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
            Photos and optional video upload to Cloudinary and attach to this listing.
          </p>

          {listing.media.filter(m => m.resourceType === 'image').length > 0 && (
            <div className="flex flex-wrap gap-2">
              {listing.media
                .filter(m => m.resourceType === 'image')
                .map(m => (
                  <button
                    key={m.id}
                    type="button"
                    disabled={m.isCover || m.id === listing.coverMediaId}
                    onClick={() => void setAsCover(m.id)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                    style={{
                      background:
                        m.isCover || m.id === listing.coverMediaId
                          ? 'rgba(140,82,255,0.16)'
                          : 'var(--bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--fg)',
                      cursor: m.isCover || m.id === listing.coverMediaId ? 'default' : 'pointer',
                    }}
                  >
                    {m.isCover || m.id === listing.coverMediaId ? 'Cover' : 'Set as cover'}
                  </button>
                ))}
            </div>
          )}
        </>
      )}

      <MediaStudio
        open={studioOpen}
        onClose={() => setStudioOpen(false)}
        initialContext="listing"
        businessId={businessId}
        listingId={listing.id}
        lockContext
        onMediaReady={() => {
          setStudioOpen(false)
          void refresh().catch(() => {
            /* keep current listing */
          })
        }}
      />
    </div>
  )
}
