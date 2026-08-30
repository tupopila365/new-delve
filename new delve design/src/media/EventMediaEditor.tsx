import { useState } from 'react'
import type { EventDto } from '@delve/contracts'
import EventMediaGallery from './EventMediaGallery'
import { fetchEvent, updateEvent, deleteEventMedia } from '../api/socialClient'
import MediaStudio from '../pages/MediaStudio'

interface EventMediaEditorProps {
  event: EventDto
  onChanged: (event: EventDto) => void
  editable?: boolean
  onOpenProfile?: (username: string) => void
}

export default function EventMediaEditor({
  event,
  onChanged,
  editable = true,
  onOpenProfile,
}: EventMediaEditorProps) {
  const [studioOpen, setStudioOpen] = useState(false)
  const media = event.media ?? []

  async function refresh() {
    const fresh = await fetchEvent(event.id)
    onChanged(fresh)
  }

  async function setAsCover(mediaId: string) {
    const updated = await updateEvent(event.id, { coverMediaId: mediaId })
    onChanged(updated)
  }

  async function handleDeleteMedia(mediaId: string) {
    const updated = await deleteEventMedia(event.id, mediaId)
    onChanged(updated)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-bold tracking-tight text-white m-0">
          Event media
        </h3>
        {media.length > 0 && (
          <span className="text-xs text-neutral-400">
            {media.length} item{media.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <EventMediaGallery
        media={media}
        coverMediaId={event.coverMediaId ?? null}
        isOwner={event.isOwner}
        onDeleteMedia={handleDeleteMedia}
        onOpenProfile={onOpenProfile}
      />

      {editable ? (
        <>
          <button
            type="button"
            onClick={() => setStudioOpen(true)}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition-all shadow-lg shadow-indigo-600/20"
          >
            Add photos or videos
          </button>
          <p className="text-xs m-0 text-neutral-400">
            Keep adding images and clips from this event. Hosts and Going guests can upload.
          </p>
        </>
      ) : (
        <p className="text-xs m-0 text-neutral-500 italic">
          RSVP &quot;Going&quot; to contribute photos and videos to this event gallery.
        </p>
      )}

          {event.isOwner && media.filter(m => m.resourceType === 'image').length > 0 && (
            <div className="flex flex-wrap gap-2">
              {media
                .filter(m => m.resourceType === 'image')
                .map(m => (
                  <button
                    key={m.id}
                    type="button"
                    disabled={m.isCover || m.id === event.coverMediaId}
                    onClick={() => void setAsCover(m.id)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                    style={{
                      background:
                        m.isCover || m.id === event.coverMediaId
                          ? 'rgba(140,82,255,0.16)'
                          : 'var(--bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--fg)',
                      cursor: m.isCover || m.id === event.coverMediaId ? 'default' : 'pointer',
                    }}
                  >
                    {m.isCover || m.id === event.coverMediaId ? 'Cover' : 'Set as cover'}
                  </button>
                ))}
            </div>
          )}

      <MediaStudio
        open={studioOpen}
        onClose={() => setStudioOpen(false)}
        initialContext="event"
        eventId={event.id}
        lockContext
        onMediaReady={() => {
          setStudioOpen(false)
          void refresh().catch(() => {
            /* keep current event */
          })
        }}
      />
    </div>
  )
}
