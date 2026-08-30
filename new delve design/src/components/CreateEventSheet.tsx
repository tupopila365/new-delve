import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { MediaAssetDto } from '@delve/contracts'
import { createEvent } from '../api/socialClient'
import { coverPatchFromStudioAsset } from '../media-studio/publishPostMedia'
import MediaStudio from '../pages/MediaStudio'
import EventFormFields, {
  emptyEventForm,
  eventFormToBody,
  validateEventForm,
  type EventFormState,
} from './EventFormFields'

interface CreateEventSheetProps {
  open: boolean
  onClose: () => void
  onCreated?: (eventId: string) => void
}

export default function CreateEventSheet({ open, onClose, onCreated }: CreateEventSheetProps) {
  const [form, setForm] = useState<EventFormState>(emptyEventForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [coverStudioOpen, setCoverStudioOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      setForm(emptyEventForm())
      setError(null)
      setSubmitting(false)
      setCoverStudioOpen(false)
    }
  }, [open])

  if (!open) return null

  function patch(patch: Partial<EventFormState>) {
    setForm(prev => ({ ...prev, ...patch }))
  }

  async function submit(status: 'DRAFT' | 'PUBLISHED') {
    if (submitting) return
    const validation = validateEventForm(form)
    if (validation) {
      setError(validation)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const dto = await createEvent(eventFormToBody(form, status))
      onCreated?.(dto.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create event')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
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
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold tracking-tight text-white m-0">
              Create event
            </h1>
            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 rounded-xl inline-flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          <EventFormFields
            form={form}
            onChange={patch}
            onError={setError}
            onOpenCoverStudio={() => setCoverStudioOpen(true)}
          />

          {error && (
            <p className="text-sm mb-3 m-0" style={{ color: 'var(--auth-danger)' }} role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit('PUBLISHED')}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white"
              style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Saving…' : 'Publish event'}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit('DRAFT')}
              className="w-full rounded-xl py-3 text-sm font-semibold"
              style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', cursor: 'pointer' }}
            >
              Save as draft
            </button>
          </div>
        </div>
      </div>

      <MediaStudio
        open={coverStudioOpen}
        onClose={() => setCoverStudioOpen(false)}
        initialContext="event"
        lockContext
        onMediaReady={(assets: MediaAssetDto[]) => {
          const asset = assets[0]
          if (asset) patch(coverPatchFromStudioAsset(asset))
          setCoverStudioOpen(false)
        }}
      />
    </>
  )
}
