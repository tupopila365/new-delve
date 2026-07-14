import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { HighlightChannelInput } from './types'
import { MAX_HIGHLIGHT_CHANNELS, normalizeHighlightsForSave } from './highlightFormUtils'
import { HighlightChannelEditor } from './HighlightChannelEditor'
import './highlights.css'

type Props = {
  open: boolean
  channels: HighlightChannelInput[]
  onClose: () => void
  onSave: (channels: HighlightChannelInput[]) => void | Promise<void>
  saving?: boolean
  title?: string
}

export function HighlightManageSheet({
  open,
  channels,
  onClose,
  onSave,
  saving = false,
  title = 'Manage highlights',
}: Props) {
  const [draft, setDraft] = useState<HighlightChannelInput[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setDraft(channels.map((ch) => ({ ...ch, slides: ch.slides.map((s) => ({ ...s })) })))
    setError('')
  }, [open, channels])

  if (!open) return null

  async function handleSave() {
    const next = normalizeHighlightsForSave(draft)
    if (draft.length > 0 && next.length === 0) {
      setError('Each ring needs a name and at least one slide with a photo/video and caption.')
      return
    }
    if (next.length > MAX_HIGHLIGHT_CHANNELS) {
      setError(`You can keep up to ${MAX_HIGHLIGHT_CHANNELS} highlight rings.`)
      return
    }
    // Empty save is allowed — clearing all rings.
    if (draft.some((ch) => ch.label.trim() || ch.slides.some((s) => s.src.trim()))) {
      const incomplete = draft.filter((ch) => {
        const named = Boolean(ch.label.trim())
        const hasSlide = ch.slides.some((s) => s.src.trim() && s.headline.trim())
        return (named && !hasSlide) || (!named && hasSlide)
      })
      if (incomplete.length > 0) {
        setError('Finish or remove incomplete rings before saving.')
        return
      }
    }
    setError('')
    await onSave(next)
  }

  return (
    <div className="hl-add-flow" role="dialog" aria-modal="true" aria-labelledby="hl-manage-title">
      <button type="button" className="hl-add-flow__backdrop" aria-label="Close" onClick={onClose} />
      <div className="hl-add-flow__sheet hl-manage-sheet">
        <header className="hl-add-flow__head">
          <h2 id="hl-manage-title">{title}</h2>
          <button type="button" className="hl-add-flow__close" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2.25} aria-hidden />
          </button>
        </header>

        <HighlightChannelEditor
          channels={draft}
          onChange={setDraft}
          hint="Rename rings, delete a ring, or add and remove slides. Changes save when you tap Save."
          emptyCopy="No highlight rings yet. Create one to share route moments."
        />

        {error ? (
          <p className="hl-add-flow__error" role="alert">
            {error}
          </p>
        ) : null}

        <footer className="hl-add-flow__foot">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save highlights'}
          </button>
        </footer>
      </div>
    </div>
  )
}
