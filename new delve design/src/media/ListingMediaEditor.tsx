import type { ListingDto } from '@delve/contracts'
import { MediaUploader } from './index'
import ListingMediaGallery from './ListingMediaGallery'
import { fetchListing, updateListing } from '../api/listingClient'

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
          <MediaUploader
            purpose="listing"
            businessId={businessId}
            listingId={listing.id}
            label="Add listing media"
            chooseLabel="Upload cover, gallery, or video"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
            hint="Images and optional video via Cloudinary — metadata only in Postgres."
            onReady={() => {
              void refresh().catch(() => {
                /* keep current listing */
              })
            }}
          />

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
    </div>
  )
}
