import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { createPost } from '../api/socialClient'
import { useMediaUpload } from '../media/useMediaUpload'

interface CreatePostSheetProps {
  open: boolean
  onClose: () => void
  onCreated?: () => void
}

export default function CreatePostSheet({ open, onClose, onCreated }: CreatePostSheetProps) {
  const [caption, setCaption] = useState('')
  const [location, setLocation] = useState('')
  const [mediaId, setMediaId] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const upload = useMediaUpload('post')

  useEffect(() => {
    if (!open) {
      setCaption('')
      setLocation('')
      setMediaId(null)
      setPreview(null)
      setError(null)
      setSubmitting(false)
      upload.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when sheet closes/opens
  }, [open])

  if (!open) return null

  async function onPick(file: File | undefined) {
    if (!file) return
    setError(null)
    const saved = await upload.start(file)
    if (!saved) {
      setError(upload.error || 'Upload failed')
      return
    }
    setMediaId(saved.id)
    setPreview(saved.delivery.url)
  }

  async function publish() {
    if (submitting) return
    if (!caption.trim() && !mediaId) {
      setError('Add a caption or photo to post.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await createPost({
        caption: caption.trim(),
        location: location.trim() || null,
        mediaIds: mediaId ? [mediaId] : [],
        visibility: 'PUBLIC',
      })
      onCreated?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish')
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
      aria-label="Create post"
    >
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none' }} />
      <div
        className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-extrabold m-0" style={{ color: 'var(--fg)' }}>
            New Delver
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-xl inline-flex items-center justify-center"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', cursor: 'pointer' }}
            aria-label="Close composer"
          >
            <X size={18} />
          </button>
        </div>

        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Share a moment from the road…"
          rows={4}
          maxLength={2000}
          className="w-full rounded-xl px-3 py-2.5 text-sm mb-3 resize-none"
          style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--fg)' }}
        />

        <input
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="Location (optional)"
          maxLength={120}
          className="w-full rounded-xl px-3 py-2.5 text-sm mb-3"
          style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--fg)' }}
        />

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
          className="sr-only"
          onChange={e => {
            const file = e.target.files?.[0]
            e.target.value = ''
            void onPick(file)
          }}
        />

        {preview ? (
          <div className="relative mb-3 overflow-hidden rounded-xl" style={{ border: '1px solid var(--border)' }}>
            <img src={preview} alt="" className="w-full max-h-64 object-cover" />
            <button
              type="button"
              onClick={() => {
                setMediaId(null)
                setPreview(null)
                upload.reset()
              }}
              className="absolute top-2 right-2 h-8 w-8 rounded-lg inline-flex items-center justify-center text-white"
              style={{ background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={upload.busy}
            onClick={() => fileRef.current?.click()}
            className="mb-3 w-full rounded-xl py-8 inline-flex flex-col items-center justify-center gap-2 text-sm font-semibold"
            style={{
              border: '1px dashed var(--border)',
              background: 'var(--surface-subtle)',
              color: 'var(--fg-muted)',
              cursor: upload.busy ? 'wait' : 'pointer',
            }}
          >
            <ImagePlus size={22} />
            {upload.busy ? 'Uploading…' : 'Add photo or video'}
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
          style={{
            background: 'var(--primary)',
            border: 'none',
            cursor: submitting || upload.busy ? 'wait' : 'pointer',
            opacity: submitting || upload.busy ? 0.7 : 1,
          }}
        >
          {submitting ? 'Publishing…' : 'Publish'}
        </button>
      </div>
    </div>
  )
}
