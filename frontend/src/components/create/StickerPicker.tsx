import { useEffect, useRef, useState } from 'react'
import { STICKER_PACK, type StickerOverlay } from './types'

type Props = {
  stickers: StickerOverlay[]
  onChange: (next: StickerOverlay[]) => void
}

let _stickerIdCounter = 0
function nextStickerId() {
  _stickerIdCounter += 1
  return `sticker_${_stickerIdCounter}`
}

export function StickerPicker({ stickers, onChange }: Props) {
  const [search, setSearch] = useState('')

  const addSticker = (emoji: string) => {
    const overlay: StickerOverlay = {
      id: nextStickerId(),
      emoji,
      size: 48,
      x: 50,
      y: 50,
      rotation: 0,
    }
    onChange([...stickers, overlay])
  }

  const removeSticker = (id: string) => {
    onChange(stickers.filter((s) => s.id !== id))
  }

  const filtered = search.trim()
    ? STICKER_PACK.filter((s) => s.label.toLowerCase().includes(search.toLowerCase()))
    : STICKER_PACK

  return (
    <div className="create-panel create-panel--stickers">
      <p className="create-panel__title">Stickers & Emoji</p>

      {/* Search */}
      <input
        className="create-sticker-search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search stickers…"
      />

      {/* Grid */}
      <div className="create-sticker-grid" role="list" aria-label="Sticker pack">
        {filtered.map((s) => (
          <button
            key={s.emoji}
            type="button"
            className="create-sticker-grid__item"
            onClick={() => addSticker(s.emoji)}
            aria-label={`Add ${s.label} sticker`}
            title={s.label}
          >
            <span className="create-sticker-grid__emoji">{s.emoji}</span>
            <span className="create-sticker-grid__label">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Active stickers */}
      {stickers.length > 0 ? (
        <div className="create-sticker-active">
          <p className="create-panel__hint">
            On the preview: drag to move, pinch or scroll to resize and rotate. Tap below to remove.
          </p>
          <div className="create-sticker-active__list">
            {stickers.map((s) => (
              <button
                key={s.id}
                type="button"
                className="create-sticker-active__item"
                onClick={() => removeSticker(s.id)}
                aria-label={`Remove ${s.emoji}`}
              >
                <span style={{ fontSize: `${s.size}px` }}>{s.emoji}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** Renders sticker overlays on top of the media preview */
export function StickerRenderer({
  stickers,
  onPointerDown,
  onWheel,
}: {
  stickers: StickerOverlay[]
  onPointerDown: (id: string, event: React.PointerEvent<HTMLDivElement>) => void
  onWheel?: (id: string, event: WheelEvent) => void
}) {
  return (
    <>
      {stickers.map((s) => (
        <StickerItem key={s.id} sticker={s} onPointerDown={onPointerDown} onWheel={onWheel} />
      ))}
    </>
  )
}

function StickerItem({
  sticker: s,
  onPointerDown,
  onWheel,
}: {
  sticker: StickerOverlay
  onPointerDown: (id: string, event: React.PointerEvent<HTMLDivElement>) => void
  onWheel?: (id: string, event: WheelEvent) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onWheelRef = useRef(onWheel)
  onWheelRef.current = onWheel

  // React binds onWheel passively, so attach a non-passive listener to allow preventDefault.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handler = (event: WheelEvent) => onWheelRef.current?.(s.id, event)
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [s.id])

  return (
    <div
      ref={ref}
      className="create-sticker-overlay"
      style={{
        left: `${s.x}%`,
        top: `${s.y}%`,
        fontSize: `${s.size}px`,
        transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
      }}
      onPointerDown={(e) => onPointerDown(s.id, e)}
    >
      {s.emoji}
    </div>
  )
}