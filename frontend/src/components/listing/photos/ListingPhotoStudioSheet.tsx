import { useState } from 'react'
import { X } from 'lucide-react'
import { MediaCoverEditor } from '../../create/MediaCoverEditor'
import type { ListingPhotoDraft } from './types'
import { newPhotoId } from './listingPhotoUtils'
import './listing-photos.css'

type Props = {
  open: boolean
  title: string
  initialPreview?: string | null
  submitLabel?: string
  onClose: () => void
  onSave: (photo: ListingPhotoDraft) => void
}

export function ListingPhotoStudioSheet({
  open,
  title,
  initialPreview = null,
  submitLabel = 'Add photo',
  onClose,
  onSave,
}: Props) {
  const [preview, setPreview] = useState<string | null>(initialPreview)
  const [file, setFile] = useState<File | null>(null)

  if (!open) return null

  function handleSave() {
    if (!preview?.trim()) return
    onSave({
      id: newPhotoId(),
      src: preview,
      file,
    })
    setPreview(null)
    setFile(null)
    onClose()
  }

  return (
    <div className="listing-photos-sheet" role="dialog" aria-modal="true" aria-labelledby="listing-photos-sheet-title">
      <button type="button" className="listing-photos-sheet__backdrop" aria-label="Close" onClick={onClose} />
      <div className="listing-photos-sheet__panel">
        <header className="listing-photos-sheet__head">
          <h2 id="listing-photos-sheet-title">{title}</h2>
          <button type="button" className="listing-photos-sheet__close" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2.25} aria-hidden />
          </button>
        </header>

        <MediaCoverEditor
          label=""
          value={preview}
          onChange={setPreview}
          onFileReady={setFile}
          defaultAspect="16:9"
        />

        <footer className="listing-photos-sheet__foot">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={!preview?.trim()}>
            {submitLabel}
          </button>
        </footer>
      </div>
    </div>
  )
}
