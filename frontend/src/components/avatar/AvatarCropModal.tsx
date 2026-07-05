import { useEffect } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { Loader2, X, ZoomIn } from 'lucide-react'
import { useState } from 'react'
import './AvatarCropModal.css'

type Props = {
  open: boolean
  imageSrc: string | null
  zoom: number
  crop: { x: number; y: number }
  onZoomChange: (value: number) => void
  onCropChange: (value: { x: number; y: number }) => void
  onCropComplete: (area: Area, areaPixels: Area) => void
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export function AvatarCropModal({
  open,
  imageSrc,
  zoom,
  crop,
  onZoomChange,
  onCropChange,
  onCropComplete,
  onConfirm,
  onCancel,
}: Props) {
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onCancel])

  if (!open || !imageSrc) return null

  async function handleConfirm() {
    setSaving(true)
    try {
      await onConfirm()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="avatar-crop" role="dialog" aria-modal="true" aria-labelledby="avatar-crop-title">
      <button type="button" className="avatar-crop__backdrop" aria-label="Cancel crop" onClick={onCancel} />
      <div className="avatar-crop__panel">
        <header className="avatar-crop__head">
          <h2 id="avatar-crop-title">Crop profile photo</h2>
          <button type="button" className="avatar-crop__close" onClick={onCancel} aria-label="Close">
            <X size={18} strokeWidth={2.25} aria-hidden />
          </button>
        </header>

        <div className="avatar-crop__stage">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropComplete}
          />
        </div>

        <label className="avatar-crop__zoom">
          <ZoomIn size={16} strokeWidth={2.25} aria-hidden />
          <span className="visually-hidden">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => onZoomChange(Number(event.target.value))}
          />
        </label>

        <div className="avatar-crop__actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void handleConfirm()} disabled={saving}>
            {saving ? (
              <>
                <Loader2 size={16} strokeWidth={2.25} className="avatar-crop__spin" aria-hidden />
                Saving…
              </>
            ) : (
              'Use photo'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
