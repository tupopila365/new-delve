import { useState } from 'react'
import type { ListingMediaDto } from '@delve/contracts'
import SafeImage from '../components/mobile/SafeImage'

interface ListingMediaGalleryProps {
  media: ListingMediaDto[]
  /** Prefer cover first when present. */
  coverMediaId?: string | null
  className?: string
}

/**
 * Renders listing media safely: images via SafeImage (object-fit cover, lazy),
 * videos via <video>. Empty media is fine — nothing crashes.
 */
export default function ListingMediaGallery({
  media,
  coverMediaId = null,
  className = '',
}: ListingMediaGalleryProps) {
  const items = [...media].sort((a, b) => {
    if (a.id === coverMediaId) return -1
    if (b.id === coverMediaId) return 1
    if (a.isCover) return -1
    if (b.isCover) return 1
    return 0
  })

  if (items.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl ${className}`}
        style={{
          minHeight: 160,
          background: 'var(--surface-subtle)',
          border: '1px solid var(--border)',
          color: 'var(--fg-muted)',
        }}
      >
        <p className="text-sm m-0">No media yet</p>
      </div>
    )
  }

  const [hero, ...rest] = items
  if (!hero) return null

  return (
    <div className={`space-y-3 ${className}`}>
      <ListingMediaItem media={hero} priority />
      {rest.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {rest.map(item => (
            <ListingMediaItem key={item.id} media={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function ListingMediaItem({ media, priority = false }: { media: ListingMediaDto; priority?: boolean }) {
  const url = media.delivery?.url || ''
  const isVideo = media.resourceType === 'video'
  const [videoFailed, setVideoFailed] = useState(false)

  if (!url) {
    return (
      <div
        className="rounded-xl overflow-hidden"
        style={{ minHeight: priority ? 200 : 120, background: 'var(--surface-subtle)' }}
      />
    )
  }

  if (isVideo) {
    if (videoFailed) {
      return (
        <div
          className="rounded-xl flex items-center justify-center text-xs"
          style={{
            minHeight: priority ? 200 : 120,
            background: 'var(--surface-subtle)',
            color: 'var(--fg-muted)',
            border: '1px solid var(--border)',
          }}
        >
          Video unavailable
        </div>
      )
    }
    return (
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: '#000', minHeight: priority ? 200 : 120 }}
      >
        <video
          src={url}
          controls
          playsInline
          preload={priority ? 'metadata' : 'none'}
          className="w-full h-full object-cover"
          style={{ minHeight: priority ? 200 : 120, maxHeight: priority ? 360 : 180 }}
          onError={() => setVideoFailed(true)}
        >
          <track kind="captions" />
        </video>
      </div>
    )
  }

  return (
    <SafeImage
      src={url}
      alt={media.altText || ''}
      kind="listing"
      className="rounded-xl w-full"
      style={{ minHeight: priority ? 200 : 120, height: priority ? 240 : 140 }}
    />
  )
}
