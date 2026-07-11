import { useState, type PointerEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { FONT_OPTIONS, type TextOverlay } from './types'

type Props = {
  overlays: TextOverlay[]
  onChange: (next: TextOverlay[]) => void
}

let _textIdCounter = 0
function nextTextId() {
  _textIdCounter += 1
  return `text_${_textIdCounter}`
}

const COLOR_OPTIONS = [
  '#ffffff', '#000000', '#ff4444', '#ff8c00', '#ffd700',
  '#44ff44', '#00d4ff', '#8a2be2', '#ff69b4', '#ff1493',
]

const BG_OPTIONS = [
  'transparent',
  'rgba(0,0,0,0.6)',
  'rgba(255,255,255,0.6)',
  'rgba(124,58,237,0.6)',
  'rgba(220,38,38,0.6)',
  'rgba(0,150,100,0.6)',
]

export function TextOverlayTool({ overlays, onChange }: Props) {
  const [text, setText] = useState('')
  const [font, setFont] = useState('sans')
  const [fontSize, setFontSize] = useState(28)
  const [color, setColor] = useState('#ffffff')
  const [bgColor, setBgColor] = useState('transparent')
  const [hasBg, setHasBg] = useState(false)
  const [shadow, setShadow] = useState(true)
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('center')
  const [editingId, setEditingId] = useState<string | null>(null)

  const addOverlay = () => {
    if (!text.trim()) return
    const overlay: TextOverlay = {
      id: nextTextId(),
      text: text.trim(),
      font,
      fontSize,
      color,
      bgColor: hasBg ? bgColor : 'transparent',
      hasBg,
      shadow,
      align,
      x: 50,
      y: 50,
    }
    onChange([...overlays, overlay])
    setText('')
    setEditingId(overlay.id)
  }

  const removeOverlay = (id: string) => {
    onChange(overlays.filter((o) => o.id !== id))
    if (editingId === id) setEditingId(null)
  }

  return (
    <div className="create-panel create-panel--text">
      <p className="create-panel__title">Text</p>

      {/* Existing overlays list */}
      {overlays.length > 0 ? (
        <div className="create-text-list">
          {overlays.map((o) => (
            <div key={o.id} className="create-text-item">
              <span
                className="create-text-item__preview"
                style={{ color: o.color, fontFamily: FONT_OPTIONS.find((f) => f.id === o.font)?.family }}
              >
                {o.text.slice(0, 20)}
              </span>
              <button
                type="button"
                className="create-text-item__edit"
                onClick={() => setEditingId(editingId === o.id ? null : o.id)}
              >
                Edit
              </button>
              <button
                type="button"
                className="create-text-item__remove"
                onClick={() => removeOverlay(o.id)}
                aria-label="Remove text"
              >
                <Trash2 size={14} strokeWidth={2.25} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Add new text */}
      <div className="create-text-composer">
        <input
          className="create-text-composer__input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type something…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              addOverlay()
            }
          }}
        />
        <button
          type="button"
          className="create-text-composer__add"
          onClick={addOverlay}
          disabled={!text.trim()}
        >
          Add
        </button>
      </div>

      {/* Font options */}
      <div className="create-text-fonts" role="group" aria-label="Font style">
        {FONT_OPTIONS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={font === f.id ? 'is-active' : ''}
            onClick={() => setFont(f.id)}
            style={{ fontFamily: f.family, fontWeight: (f as { weight?: number }).weight ?? 400 }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Size */}
      <label className="create-slider">
        <span>Size</span>
        <input
          type="range"
          min={12}
          max={72}
          step={1}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
        />
      </label>

      {/* Color */}
      <div className="create-text-colors" role="group" aria-label="Text color">
        <span className="create-text-colors__label">Color</span>
        <div className="create-text-colors__grid">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              className={color === c ? 'is-active' : ''}
              style={{ background: c, border: c === '#ffffff' ? '1px solid rgba(255,255,255,0.2)' : undefined }}
              onClick={() => setColor(c)}
              aria-label={`Text color ${c}`}
            />
          ))}
        </div>
      </div>

      {/* Background */}
      <div className="create-text-bg">
        <label className="create-text-bg__toggle">
          <input
            type="checkbox"
            checked={hasBg}
            onChange={(e) => setHasBg(e.target.checked)}
          />
          <span>Background</span>
        </label>
        {hasBg ? (
          <div className="create-text-colors__grid" role="group" aria-label="Background color">
            {BG_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                className={bgColor === c ? 'is-active' : ''}
                style={{
                  background: c,
                  border: c === 'transparent' ? '1px dashed rgba(255,255,255,0.2)' : undefined,
                }}
                onClick={() => setBgColor(c)}
                aria-label={`Background ${c}`}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Shadow toggle */}
      <label className="create-text-shadow">
        <input
          type="checkbox"
          checked={shadow}
          onChange={(e) => setShadow(e.target.checked)}
        />
        <span>Shadow</span>
      </label>

      {/* Alignment */}
      <div className="create-text-align" role="group" aria-label="Text alignment">
        {(['left', 'center', 'right'] as const).map((a) => (
          <button
            key={a}
            type="button"
            className={align === a ? 'is-active' : ''}
            onClick={() => setAlign(a)}
          >
            {a === 'left' ? 'Left' : a === 'center' ? 'Center' : 'Right'}
          </button>
        ))}
      </div>

      {editingId ? (
        <p className="create-panel__hint">
          Drag text on the preview to reposition it.
        </p>
      ) : null}
    </div>
  )
}

/** Renders text overlays on top of the media preview */
export function TextOverlayRenderer({
  overlays,
  onPointerDown,
}: {
  overlays: TextOverlay[]
  onPointerDown: (id: string, event: PointerEvent<HTMLDivElement>) => void
}) {
  return (
    <>
      {overlays.map((o) => {
        const fontDef = FONT_OPTIONS.find((f) => f.id === o.font)
        return (
          <div
            key={o.id}
            className="create-text-overlay"
            style={{
              left: `${o.x}%`,
              top: `${o.y}%`,
              color: o.color,
              fontFamily: fontDef?.family,
              fontWeight: (fontDef as { weight?: number })?.weight ?? 400,
              fontSize: o.fontSize,
              textAlign: o.align,
              background: o.hasBg ? o.bgColor : 'transparent',
              textShadow: o.shadow ? '0 1px 4px rgba(0,0,0,0.5)' : 'none',
              transform: 'translate(-50%, -50%)',
            }}
            onPointerDown={(e) => onPointerDown(o.id, e)}
          >
            {o.text}
          </div>
        )
      })}
    </>
  )
}