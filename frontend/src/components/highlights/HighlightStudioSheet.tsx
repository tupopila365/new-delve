import { useEffect } from 'react'
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
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="hl-studio-sheet hl-studio-sheet--fullscreen"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
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
  )
}
