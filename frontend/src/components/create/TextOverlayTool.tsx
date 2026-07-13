import { useEffect, useRef, useState, type PointerEvent } from 'react'

import { Trash2, X } from 'lucide-react'

import { FONT_OPTIONS, type TextOverlay } from './types'



type Props = {

  overlays: TextOverlay[]

  onChange: (next: TextOverlay[]) => void

  /** Called when the user finishes editing (Done, switch overlay, close tool). */

  onCommit?: () => void

  onActiveOverlayChange?: (id: string | null) => void

}



type FormState = {

  text: string

  font: string

  fontSize: number

  color: string

  bgColor: string

  hasBg: boolean

  shadow: boolean

  align: 'left' | 'center' | 'right'

}



const DEFAULT_FORM: FormState = {

  text: '',

  font: 'sans',

  fontSize: 28,

  color: '#ffffff',

  bgColor: 'transparent',

  hasBg: false,

  shadow: true,

  align: 'center',

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



function buildOverlay(id: string, form: FormState, existing?: TextOverlay): TextOverlay {

  return {

    id,

    text: form.text,

    font: form.font,

    fontSize: form.fontSize,

    color: form.color,

    bgColor: form.hasBg ? form.bgColor : 'transparent',

    hasBg: form.hasBg,

    shadow: form.shadow,

    align: form.align,

    x: existing?.x ?? 50,

    y: existing?.y ?? 50,

  }

}



export function TextOverlayTool({ overlays, onChange, onCommit, onActiveOverlayChange }: Props) {

  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  const [editingId, setEditingId] = useState<string | null>(null)

  const overlaysRef = useRef(overlays)

  const editingIdRef = useRef<string | null>(null)

  overlaysRef.current = overlays

  editingIdRef.current = editingId



  const setActiveId = (id: string | null) => {

    editingIdRef.current = id

    setEditingId(id)

    onActiveOverlayChange?.(id)

  }



  const resetForm = () => {

    setForm(DEFAULT_FORM)

    setActiveId(null)

  }



  const finishEditing = (commit = true) => {

    const currentEditingId = editingIdRef.current

    if (!currentEditingId) {

      if (form.text.trim()) {

        const id = nextTextId()

        const overlay = buildOverlay(id, { ...form, text: form.text.trim() })

        onChange([...overlaysRef.current, overlay])

        if (commit) onCommit?.()

      }

      resetForm()

      return

    }



    const trimmed = form.text.trim()

    if (trimmed) {

      onChange(

        overlaysRef.current.map((o) =>

          o.id === currentEditingId ? buildOverlay(currentEditingId, { ...form, text: trimmed }, o) : o,

        ),

      )

    } else {

      onChange(overlaysRef.current.filter((o) => o.id !== currentEditingId))

    }

    if (commit) onCommit?.()

    resetForm()

  }



  const finishRef = useRef(finishEditing)

  finishRef.current = finishEditing

  useEffect(() => () => finishRef.current(true), [])



  const startEditing = (overlay: TextOverlay) => {

    setActiveId(overlay.id)

    setForm({

      text: overlay.text,

      font: overlay.font,

      fontSize: overlay.fontSize,

      color: overlay.color,

      bgColor: overlay.bgColor,

      hasBg: overlay.hasBg,

      shadow: overlay.shadow,

      align: overlay.align,

    })

  }



  const syncLive = (nextForm: FormState) => {

    setForm(nextForm)

    const currentEditingId = editingIdRef.current

    if (!nextForm.text && !currentEditingId) return



    if (!currentEditingId) {

      const id = nextTextId()

      const overlay = buildOverlay(id, nextForm)

      setActiveId(id)

      onChange([...overlaysRef.current, overlay])

      return

    }



    onChange(

      overlaysRef.current.map((o) =>

        o.id === currentEditingId ? buildOverlay(currentEditingId, nextForm, o) : o,

      ),

    )

  }



  const removeOverlay = (id: string) => {

    onChange(overlays.filter((o) => o.id !== id))

    if (editingId === id) resetForm()

    onCommit?.()

  }



  const updateForm = (patch: Partial<FormState>) => {

    syncLive({ ...form, ...patch })

  }



  return (

    <div className="create-panel create-panel--text">

      <p className="create-panel__title">Text</p>

      <p className="create-panel__hint">Changes appear on your photo or video as you type.</p>



      {overlays.length > 0 ? (

        <div className="create-text-list">

          {overlays.map((o) => (

            <div key={o.id} className={`create-text-item${editingId === o.id ? ' is-active' : ''}`}>

              <span

                className="create-text-item__preview"

                style={{ color: o.color, fontFamily: FONT_OPTIONS.find((f) => f.id === o.font)?.family }}

              >

                {o.text.slice(0, 20) || '…'}

              </span>

              <button

                type="button"

                className="create-text-item__edit"

                onClick={() => {

                  if (editingId === o.id) {

                    finishEditing()

                    return

                  }

                  if (editingId) finishEditing(false)

                  startEditing(o)

                }}

              >

                {editingId === o.id ? 'Done' : 'Edit'}

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



      <div className="create-text-composer">

        <input

          className="create-text-composer__input"

          value={form.text}

          onChange={(e) => updateForm({ text: e.target.value })}

          placeholder="Type something…"

          onKeyDown={(e) => {

            if (e.key === 'Enter' && !e.shiftKey) {

              e.preventDefault()

              finishEditing()

            }

          }}

        />

        <button

          type="button"

          className="create-text-composer__add"

          onClick={() => finishEditing()}

          disabled={!form.text.trim() && !editingId}

        >

          Done

        </button>

      </div>



      <div className="create-text-fonts" role="group" aria-label="Font style">

        {FONT_OPTIONS.map((f) => (

          <button

            key={f.id}

            type="button"

            className={form.font === f.id ? 'is-active' : ''}

            onClick={() => updateForm({ font: f.id })}

            style={{ fontFamily: f.family, fontWeight: (f as { weight?: number }).weight ?? 400 }}

          >

            {f.label}

          </button>

        ))}

      </div>



      <label className="create-slider">

        <span>Size</span>

        <input

          type="range"

          min={12}

          max={72}

          step={1}

          value={form.fontSize}

          onChange={(e) => updateForm({ fontSize: Number(e.target.value) })}

        />

      </label>



      <div className="create-text-colors" role="group" aria-label="Text color">

        <span className="create-text-colors__label">Color</span>

        <div className="create-text-colors__grid">

          {COLOR_OPTIONS.map((c) => (

            <button

              key={c}

              type="button"

              className={form.color === c ? 'is-active' : ''}

              style={{ background: c, border: c === '#ffffff' ? '1px solid rgba(255,255,255,0.2)' : undefined }}

              onClick={() => updateForm({ color: c })}

              aria-label={`Text color ${c}`}

            />

          ))}

        </div>

      </div>



      <div className="create-text-bg">

        <label className="create-text-bg__toggle">

          <input

            type="checkbox"

            checked={form.hasBg}

            onChange={(e) => updateForm({ hasBg: e.target.checked })}

          />

          <span>Background</span>

        </label>

        {form.hasBg ? (

          <div className="create-text-colors__grid" role="group" aria-label="Background color">

            {BG_OPTIONS.map((c) => (

              <button

                key={c}

                type="button"

                className={form.bgColor === c ? 'is-active' : ''}

                style={{

                  background: c,

                  border: c === 'transparent' ? '1px dashed rgba(255,255,255,0.2)' : undefined,

                }}

                onClick={() => updateForm({ bgColor: c })}

                aria-label={`Background ${c}`}

              />

            ))}

          </div>

        ) : null}

      </div>



      <label className="create-text-shadow">

        <input

          type="checkbox"

          checked={form.shadow}

          onChange={(e) => updateForm({ shadow: e.target.checked })}

        />

        <span>Shadow</span>

      </label>



      <div className="create-text-align" role="group" aria-label="Text alignment">

        {(['left', 'center', 'right'] as const).map((a) => (

          <button

            key={a}

            type="button"

            className={form.align === a ? 'is-active' : ''}

            onClick={() => updateForm({ align: a })}

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

  activeId,

  onPointerDown,

  onRemove,

}: {

  overlays: TextOverlay[]

  activeId?: string | null

  onPointerDown: (id: string, event: PointerEvent<HTMLDivElement>) => void

  onRemove?: (id: string) => void

}) {

  return (

    <>

      {overlays.map((o) => {

        const fontDef = FONT_OPTIONS.find((f) => f.id === o.font)

        return (

          <div

            key={o.id}

            className={`create-text-overlay${activeId === o.id ? ' is-editing' : ''}`}

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

            {onRemove ? (

              <button

                type="button"

                className="create-text-overlay__remove"

                aria-label="Remove text"

                onPointerDown={(e) => e.stopPropagation()}

                onClick={(e) => {

                  e.stopPropagation()

                  onRemove(o.id)

                }}

              >

                <X size={13} strokeWidth={2.25} aria-hidden />

              </button>

            ) : null}

          </div>

        )

      })}

    </>

  )

}


