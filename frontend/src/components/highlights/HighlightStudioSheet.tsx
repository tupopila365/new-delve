import { X } from 'lucide-react'
import { HighlightMediaStudio } from './HighlightMediaStudio'
import type { HighlightChannelInput } from './types'
import './highlights.css'

type SlideInput = HighlightChannelInput['slides'][number]

type SavedSlide = {
  src: string
  kind: 'image' | 'video'
  headline: string
  sub?: string
  captionX?: number
  captionY?: number
}

type Props = {
  open: boolean
  title: string
  submitLabel?: string
  initialSlide?: SlideInput | null
  onClose: () => void
  onSaved: (saved: SavedSlide) => void
}

export function HighlightStudioSheet({
  open,
  title,
  submitLabel = 'Save slide',
  initialSlide = null,
  onClose,
  onSaved,
}: Props) {
  if (!open) return null

  return (
    <div className="hl-studio-sheet" role="dialog" aria-modal="true" aria-labelledby="hl-studio-sheet-title">
      <button type="button" className="hl-studio-sheet__backdrop" aria-label="Close" onClick={onClose} />
      <div className="hl-studio-sheet__panel">
        <header className="hl-studio-sheet__head">
          <h2 id="hl-studio-sheet-title">{title}</h2>
          <button type="button" className="hl-studio-sheet__close" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2.25} aria-hidden />
          </button>
        </header>

        <HighlightMediaStudio
          key={initialSlide?.id ?? 'new-slide'}
          initialSlide={initialSlide}
          submitLabel={submitLabel}
          onCancel={onClose}
          onSaved={(saved) => {
            onSaved(saved)
            onClose()
          }}
        />
      </div>
    </div>
  )
}
