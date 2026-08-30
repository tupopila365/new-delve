import { useState } from 'react'
import type { EventMediaDto } from '@delve/contracts'
import { Maximize2, Trash2, Loader2 } from 'lucide-react'
import SafeImage from '../components/mobile/SafeImage'
import MediaLightbox, { LightboxMediaItem } from '../components/media/MediaLightbox'

interface EventMediaGalleryProps {
  media: EventMediaDto[]
  coverMediaId?: string | null
  className?: string
  isOwner?: boolean
  onDeleteMedia?: (mediaId: string) => Promise<void>
  onOpenProfile?: (username: string) => void
}

export default function EventMediaGallery({
  media,
  coverMediaId = null,
  className = '',
  isOwner = false,
  onDeleteMedia,
  onOpenProfile,
}: EventMediaGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

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
          minHeight: 140,
          background: 'var(--surface-subtle)',
          border: '1px solid var(--border)',
          color: 'var(--fg-muted)',
        }}
      >
        <p className="text-sm m-0">No photos or videos yet</p>
      </div>
    )
  }

  const lightboxItems: LightboxMediaItem[] = items.map(m => ({
    id: m.id,
    url: m.delivery?.url || '',
    type: m.resourceType || 'image',
    alt: m.altText || undefined,
    canDelete: Boolean(isOwner || m.isMine),
    uploadedBy: m.uploadedBy,
  }))

  const [hero, ...rest] = items
  if (!hero) return null

  return (
    <div className={`space-y-3 ${className}`}>
      <EventMediaItem
        media={hero}
        priority
        canDelete={Boolean(isOwner || hero.isMine)}
        onDelete={onDeleteMedia ? () => onDeleteMedia(hero.id) : undefined}
        onOpenProfile={onOpenProfile}
        onClick={() => setLightboxIndex(0)}
      />
      {rest.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {rest.map((item, idx) => (
            <EventMediaItem
              key={item.id}
              media={item}
              canDelete={Boolean(isOwner || item.isMine)}
              onDelete={onDeleteMedia ? () => onDeleteMedia(item.id) : undefined}
              onOpenProfile={onOpenProfile}
              onClick={() => setLightboxIndex(idx + 1)}
            />
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <MediaLightbox
          items={lightboxItems}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onDelete={onDeleteMedia}
          onOpenProfile={onOpenProfile}
        />
      )}
    </div>
  )
}

function EventMediaItem({
  media,
  priority = false,
  canDelete = false,
  onDelete,
  onOpenProfile,
  onClick,
}: {
  media: EventMediaDto
  priority?: boolean
  canDelete?: boolean
  onDelete?: () => Promise<void>
  onOpenProfile?: (username: string) => void
  onClick?: () => void
}) {
  const url = media.delivery?.url || ''
  const isVideo = media.resourceType === 'video'
  const [videoFailed, setVideoFailed] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!url) {
    return (
      <div
        className="rounded-xl overflow-hidden"
        style={{ minHeight: priority ? 200 : 120, background: 'var(--surface-subtle)' }}
      />
    )
  }

  const renderDeleteControl = () => {
    if (!canDelete || !onDelete) return null

    if (confirmDelete) {
      return (
        <div
          className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-red-950/90 border border-red-500/50 rounded-xl px-2 py-1 shadow-lg backdrop-blur-md"
          onClick={e => e.stopPropagation()}
        >
          <span className="text-[10px] text-red-200 font-semibold">Delete?</span>
          <button
            type="button"
            disabled={deleting}
            onClick={async e => {
              e.stopPropagation()
              setDeleting(true)
              try {
                await onDelete()
              } catch {
                setDeleting(false)
                setConfirmDelete(false)
              }
            }}
            className="px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-500 text-[10px] font-bold text-white transition-all"
          >
            {deleting ? <Loader2 size={10} className="animate-spin" /> : 'Yes'}
          </button>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              setConfirmDelete(false)
            }}
            className="px-1 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-neutral-300 transition-all"
          >
            No
          </button>
        </div>
      )
    }

    return (
      <button
        type="button"
        aria-label="Delete media"
        onClick={e => {
          e.stopPropagation()
          setConfirmDelete(true)
        }}
        className="absolute top-2 left-2 z-10 p-1.5 rounded-lg bg-black/60 hover:bg-red-600/80 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all border border-white/10"
        title="Delete media"
      >
        <Trash2 size={13} />
      </button>
    )
  }

  const renderAuthorBadge = () => {
    if (!media.uploadedBy) return null

    return (
      <div
        onClick={e => {
          if (onOpenProfile) {
            e.stopPropagation()
            onOpenProfile(media.uploadedBy!.username)
          }
        }}
        className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/15 text-white transition-all shadow-md max-w-[85%]"
        title={`Uploaded by ${media.uploadedBy.displayName} (@${media.uploadedBy.username})`}
      >
        {media.uploadedBy.avatarUrl ? (
          <img
            src={media.uploadedBy.avatarUrl}
            alt={media.uploadedBy.displayName}
            className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-3.5 h-3.5 rounded-full bg-neutral-700 flex items-center justify-center text-[8px] font-bold text-white shrink-0">
            {media.uploadedBy.displayName.charAt(0)}
          </div>
        )}
        <span className="text-[10px] font-medium text-white/90 truncate">
          @{media.uploadedBy.username}
        </span>
      </div>
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
        className="rounded-xl overflow-hidden relative group cursor-pointer"
        style={{ background: '#000', minHeight: priority ? 200 : 120 }}
      >
        {renderDeleteControl()}
        {renderAuthorBadge()}
        <video
          src={url}
          playsInline
          muted
          preload={priority ? 'metadata' : 'none'}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          style={{ minHeight: priority ? 200 : 120, maxHeight: priority ? 360 : 180 }}
          onError={() => setVideoFailed(true)}
          onClick={onClick}
        />
        <button
          type="button"
          onClick={onClick}
          aria-label="Expand video"
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity border border-white/10"
        >
          <Maximize2 size={14} />
        </button>
      </div>
    )
  }

  return (
    <div
      className="relative group cursor-pointer overflow-hidden rounded-xl"
      onClick={onClick}
    >
      {renderDeleteControl()}
      {renderAuthorBadge()}
      <SafeImage
        src={url}
        alt={media.altText || ''}
        kind="listing"
        className="rounded-xl w-full transition-transform duration-300 group-hover:scale-[1.03]"
        style={{ minHeight: priority ? 200 : 120, height: priority ? 240 : 140 }}
      />
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="p-2 rounded-xl bg-black/60 text-white backdrop-blur-sm border border-white/10 shadow-lg scale-90 group-hover:scale-100 transition-transform">
          <Maximize2 size={16} />
        </div>
      </div>
    </div>
  )
}
