import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { createEvent } from '../api/socialClient'
import { useMediaUpload } from '../media/useMediaUpload'

interface CreateEventSheetProps {
  open: boolean
  onClose: () => void
  onCreated?: (eventId: string) => void
}

export default function CreateEventSheet({ open, onClose, onCreated }: CreateEventSheetProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startAt, setStartAt] = useState('')
  const [city, setCity] = useState('')
  const [locationName, setLocationName] = useState('')
  const [coverMediaId, setCoverMediaId] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const upload = useMediaUpload('post')

  useEffect(() => {
    if (!open) {
      setTitle('')
      setDescription('')
      setStartAt('')
      setCity('')
      setLocationName('')
      setCoverMediaId(null)
      setPreview(null)
      setError(null)
      setSubmitting(false)
      upload.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  async function publish() {
    if (submitting) return
    if (title.trim().length < 2) {
      setError('Add a title for your event.')
      return
    }
    if (!startAt) {
      setError('Choose a start date and time.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const dto = await createEvent({
        title: title.trim(),
        description: description.trim(),
        startAt: new Date(startAt).toISOString(),
        city: city.trim() || null,
        locationName: locationName.trim() || null,
        coverMediaId,
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      })
      onCreated?.(dto.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create event')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(20,12,40,0.55)' }}
      role="dialog"
      aria-modal
      aria-label="Create event"
    >
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none' }} />
      <div
        className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-extrabold m-0" style={{ color: 'var(--fg)' }}>
            Create event
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-xl inline-flex items-center justify-center"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Event title"
          maxLength={120}
          className="w-full rounded-xl px-3 py-2.5 text-sm mb-3"
          style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--fg)' }}
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What is this meetup about?"
          rows={3}
          maxLength={4000}
          className="w-full rounded-xl px-3 py-2.5 text-sm mb-3 resize-none"
          style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--fg)' }}
        />
        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>
          Starts
        </label>
        <input
          type="datetime-local"
          value={startAt}
          onChange={e => setStartAt(e.target.value)}
          className="w-full rounded-xl px-3 py-2.5 text-sm mb-3"
          style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--fg)' }}
        />
        <input
          value={locationName}
          onChange={e => setLocationName(e.target.value)}
          placeholder="Venue or meeting point"
          className="w-full rounded-xl px-3 py-2.5 text-sm mb-3"
          style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--fg)' }}
        />
        <input
          value={city}
          onChange={e => setCity(e.target.value)}
          placeholder="City"
          className="w-full rounded-xl px-3 py-2.5 text-sm mb-3"
          style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--fg)' }}
        />

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={e => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            void upload.start(file).then(saved => {
              if (!saved) {
                setError(upload.error || 'Cover upload failed')
                return
              }
              setCoverMediaId(saved.id)
              setPreview(saved.delivery.url)
            })
          }}
        />

        {preview ? (
          <div className="relative mb-3 overflow-hidden rounded-xl">
            <img src={preview} alt="" className="w-full max-h-40 object-cover" />
          </div>
        ) : (
          <button
            type="button"
            disabled={upload.busy}
            onClick={() => fileRef.current?.click()}
            className="mb-3 w-full rounded-xl py-6 inline-flex flex-col items-center gap-2 text-sm font-semibold"
            style={{
              border: '1px dashed var(--border)',
              background: 'var(--surface-subtle)',
              color: 'var(--fg-muted)',
              cursor: upload.busy ? 'wait' : 'pointer',
            }}
          >
            <ImagePlus size={20} />
            {upload.busy ? 'Uploading…' : 'Add cover (optional)'}
          </button>
        )}

        {error && (
          <p className="text-sm mb-3 m-0" style={{ color: 'var(--auth-danger)' }} role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={submitting || upload.busy}
          onClick={() => void publish()}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white"
          style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? 'Publishing…' : 'Publish event'}
        </button>
      </div>
    </div>
  )
}
