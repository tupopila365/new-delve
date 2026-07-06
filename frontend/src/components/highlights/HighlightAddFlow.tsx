import { useState } from 'react'
import { ImagePlus, Play, X } from 'lucide-react'
import type { HighlightChannelInput } from './types'
import { emptyHighlightChannel, emptyHighlightSlide, filledHighlightSlides, normalizeHighlightsForSave } from './highlightFormUtils'
import { HighlightStudioSheet } from './HighlightStudioSheet'
import './highlights.css'

type Props = {
  open: boolean
  onClose: () => void
  onSave: (channel: HighlightChannelInput) => void | Promise<void>
  saving?: boolean
  title?: string
}

type StudioTarget = { mode: 'new' } | { mode: 'edit'; index: number } | null

export function HighlightAddFlow({ open, onClose, onSave, saving = false, title = 'Add highlight' }: Props) {
  const [label, setLabel] = useState('')
  const [slides, setSlides] = useState<HighlightChannelInput['slides']>([])
  const [studio, setStudio] = useState<StudioTarget>(null)
  const [error, setError] = useState('')

  if (!open) return null

  function reset() {
    setLabel('')
    setSlides([])
    setStudio(null)
    setError('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSaveRing() {
    const ringLabel = label.trim()
    if (!ringLabel) {
      setError('Name your highlight ring.')
      return
    }
    if (slides.length === 0) {
      setError('Add at least one slide with a photo or video.')
      return
    }
    setError('')
    const channel = normalizeHighlightsForSave([
      {
        ...emptyHighlightChannel(),
        label: ringLabel,
        slides,
      },
    ])[0]
    if (!channel) {
      setError('Could not save this highlight.')
      return
    }
    await onSave(channel)
    reset()
  }

  const filled = filledHighlightSlides(slides)
  const studioInitial = studio?.mode === 'edit' ? filled[studio.index] ?? null : null

  return (
    <div className="hl-add-flow" role="dialog" aria-modal="true" aria-labelledby="hl-add-flow-title">
      <button type="button" className="hl-add-flow__backdrop" aria-label="Close" onClick={handleClose} />
      <div className="hl-add-flow__sheet">
        <header className="hl-add-flow__head">
          <h2 id="hl-add-flow-title">{title}</h2>
          <button type="button" className="hl-add-flow__close" onClick={handleClose} aria-label="Close">
            <X size={18} strokeWidth={2.25} aria-hidden />
          </button>
        </header>

        <div className="hl-add-flow__ring-row">
          <div className="hl-channel-card__ring-preview hl-add-flow__ring-preview" aria-hidden>
            {filled[0]?.src ? <img src={filled[0].src} alt="" /> : <span className="hl-channel-card__ring-placeholder" />}
          </div>
          <input
            type="text"
            className="hl-channel-card__name hl-add-flow__name"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Name this ring"
            maxLength={80}
            aria-label="Ring name"
          />
        </div>

        <div className="hl-channel-card__filmstrip hl-add-flow__filmstrip" role="list" aria-label="Slides">
          {filled.map((slide, index) => (
            <div key={slide.id ?? `slide-${index}`} className="hl-slide-tile" role="listitem">
              <button
                type="button"
                className="hl-slide-tile__btn"
                onClick={() => setStudio({ mode: 'edit', index })}
                aria-label={`Edit slide: ${slide.headline}`}
              >
                <img src={slide.src} alt="" />
                {slide.kind === 'video' ? (
                  <span className="hl-slide-tile__play" aria-hidden>
                    <Play size={12} strokeWidth={2.5} fill="currentColor" />
                  </span>
                ) : null}
                <span className="hl-slide-tile__caption">{slide.headline}</span>
              </button>
              <button
                type="button"
                className="hl-slide-tile__delete"
                onClick={() => setSlides((prev) => filledHighlightSlides(prev).filter((_, i) => i !== index))}
                aria-label="Remove slide"
              >
                <X size={12} strokeWidth={2.5} aria-hidden />
              </button>
            </div>
          ))}

          {filled.length < 12 ? (
            <button
              type="button"
              className="hl-slide-tile hl-slide-tile--add"
              onClick={() => setStudio({ mode: 'new' })}
              aria-label="Add slide"
            >
              <ImagePlus size={22} strokeWidth={2} aria-hidden />
              <span>Add</span>
            </button>
          ) : null}
        </div>

        {error ? (
          <p className="hl-add-flow__error" role="alert">
            {error}
          </p>
        ) : null}

        <footer className="hl-add-flow__foot">
          <button type="button" className="btn btn-ghost" onClick={handleClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void handleSaveRing()} disabled={saving}>
            {saving ? 'Saving…' : 'Save highlight'}
          </button>
        </footer>
      </div>

      <HighlightStudioSheet
        open={studio !== null}
        title={studio?.mode === 'edit' ? 'Edit slide' : 'New slide'}
        submitLabel={studio?.mode === 'edit' ? 'Save changes' : 'Add to ring'}
        initialSlide={studioInitial}
        onClose={() => setStudio(null)}
        onSaved={(saved) => {
          const slide = {
            ...emptyHighlightSlide(filled.length),
            kind: saved.kind,
            src: saved.src,
            headline: saved.headline,
            sub: saved.sub,
            captionX: saved.captionX,
            captionY: saved.captionY,
          }
          if (studio?.mode === 'edit') {
            const list = filledHighlightSlides(slides)
            setSlides(
              list.map((s, i) =>
                i === studio.index ? { ...slide, id: s.id ?? slide.id } : s,
              ),
            )
          } else {
            setSlides((prev) => [...filledHighlightSlides(prev), slide])
          }
          setStudio(null)
        }}
      />
    </div>
  )
}
