import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { FilterStrip } from './FilterStrip'
import type { MediaFilter, MediaKind } from './types'
import { blobToDataUrl, filterClassName, renderEditedImage, videoPosterDataUrl } from './mediaUtils'
import { DEFAULT_CROP } from './types'
import './SocialCreateComposer.css'

export type StopMoment = {
  preview: string | null
  mediaKind: MediaKind | null
}

type Props = {
  value: StopMoment
  onChange: (moment: StopMoment) => void
}

export function JourneyStopMoment({ value, onChange }: Props) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const [filter, setFilter] = useState<MediaFilter>('original')
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [mediaKind, setMediaKind] = useState<MediaKind>('image')

  useEffect(() => {
    return () => {
      if (localPreview?.startsWith('blob:')) URL.revokeObjectURL(localPreview)
    }
  }, [localPreview])

  useEffect(() => {
    if (!file) return
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const url =
            mediaKind === 'image'
              ? await blobToDataUrl(await renderEditedImage(file, filter, DEFAULT_CROP))
              : await videoPosterDataUrl(file, 0)
          onChangeRef.current({ preview: url, mediaKind })
        } catch {
          onChange({ preview: null, mediaKind: null })
        }
      })()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [file, filter, mediaKind])

  const shown = localPreview || value.preview

  function clear() {
    if (localPreview?.startsWith('blob:')) URL.revokeObjectURL(localPreview)
    setLocalPreview(null)
    setFile(null)
    onChange({ preview: null, mediaKind: null })
  }

  function onPick(next: File | null) {
    if (!next) return
    if (localPreview?.startsWith('blob:')) URL.revokeObjectURL(localPreview)
    const kind: MediaKind = next.type.startsWith('video/') ? 'video' : 'image'
    setMediaKind(kind)
    setFile(next)
    setLocalPreview(URL.createObjectURL(next))
  }

  return (
    <div className="journey-stop-moment">
      <p className="journey-stop-moment__label">Photo or clip <span>(optional)</span></p>
      {shown ? (
        <div className="journey-stop-moment__preview">
          <img src={shown} alt="" className={filterClassName(filter)} />
          <button type="button" className="journey-stop-moment__clear" onClick={clear} aria-label="Remove media">
            <X size={14} strokeWidth={2.5} aria-hidden />
          </button>
        </div>
      ) : (
        <label className="journey-stop-moment__pick">
          <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
          <ImagePlus size={18} strokeWidth={2} aria-hidden />
          Add moment
        </label>
      )}
      {file && mediaKind === 'image' ? <FilterStrip value={filter} onChange={setFilter} /> : null}
    </div>
  )
}
