import { useRef } from 'react'
import { Camera, ImagePlus, X } from 'lucide-react'
import './group-chat.css'

type Props = {
  imagePreview: string | null
  videoPreview: string | null
  onImagePick: (file: File | null, preview: string | null) => void
  onVideoPick: (file: File | null, preview: string | null) => void
  onClear: () => void
}

export function GroupChatMediaAttach({
  imagePreview,
  videoPreview,
  onImagePick,
  onVideoPick,
  onClear,
}: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="group-chat__attach">
      <button type="button" className="group-chat__attach-btn" onClick={() => imageInputRef.current?.click()} aria-label="Add photo">
        <ImagePlus size={18} strokeWidth={2.25} aria-hidden />
      </button>
      <button type="button" className="group-chat__attach-btn" onClick={() => videoInputRef.current?.click()} aria-label="Add video">
        <Camera size={18} strokeWidth={2.25} aria-hidden />
      </button>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          onImagePick(file, URL.createObjectURL(file))
          e.target.value = ''
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          onVideoPick(file, URL.createObjectURL(file))
          e.target.value = ''
        }}
      />
      {imagePreview || videoPreview ? (
        <div className="group-chat__attach-preview">
          {imagePreview ? <img src={imagePreview} alt="" /> : null}
          {videoPreview ? <video src={videoPreview} muted playsInline /> : null}
          <button type="button" onClick={onClear} aria-label="Remove attachment">
            <X size={14} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  )
}
