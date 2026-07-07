import { useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus, X } from 'lucide-react'
import { CommunityVideoEditor } from './CommunityVideoEditor'

type Props = {
  imagePreview: string | null
  videoPreview: string | null
  onImageChange: (file: File | null, preview: string | null) => void
  onVideoChange: (file: File | null, preview: string | null) => void
  embedded?: boolean
}

export function CommunityMediaAttach({
  imagePreview,
  videoPreview,
  onImageChange,
  onVideoChange,
  embedded = false,
}: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [editingVideo, setEditingVideo] = useState<{ file: File; preview: string } | null>(null)

  useEffect(() => {
    return () => {
      if (editingVideo?.preview) URL.revokeObjectURL(editingVideo.preview)
    }
  }, [editingVideo])

  const clearImage = () => onImageChange(null, null)
  const clearVideo = () => {
    onVideoChange(null, null)
    if (editingVideo?.preview) URL.revokeObjectURL(editingVideo.preview)
    setEditingVideo(null)
  }

  const startVideoEdit = (file: File) => {
    if (imagePreview) clearImage()
    if (editingVideo?.preview) URL.revokeObjectURL(editingVideo.preview)
    setEditingVideo({ file, preview: URL.createObjectURL(file) })
  }

  return (
    <div className={`create-ask__attach${embedded ? ' create-ask__attach--embedded' : ''}`}>
      {embedded ? null : (
        <span className="create-ask__attach-label">Add a photo or video (optional)</span>
      )}
      <div className="create-ask__attach-actions">
        <button type="button" className="create-ask__attach-btn" onClick={() => imageInputRef.current?.click()}>
          <ImagePlus size={16} strokeWidth={2.25} aria-hidden />
          Photo
        </button>
        <button type="button" className="create-ask__attach-btn" onClick={() => videoInputRef.current?.click()}>
          <Camera size={16} strokeWidth={2.25} aria-hidden />
          Video
        </button>
      </div>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          clearVideo()
          onImageChange(file, URL.createObjectURL(file))
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
          if (file) startVideoEdit(file)
          e.target.value = ''
        }}
      />

      {editingVideo ? (
        <CommunityVideoEditor
          file={editingVideo.file}
          previewUrl={editingVideo.preview}
          onCancel={clearVideo}
          onDone={(processed, nextPreview) => {
            if (editingVideo.preview) URL.revokeObjectURL(editingVideo.preview)
            setEditingVideo(null)
            onVideoChange(processed, nextPreview)
          }}
        />
      ) : null}

      {imagePreview ? (
        <div className="create-ask__attach-preview">
          <img src={imagePreview} alt="Attached photo preview" />
          <button type="button" className="create-ask__attach-remove" onClick={clearImage} aria-label="Remove photo">
            <X size={14} strokeWidth={2.5} aria-hidden />
          </button>
        </div>
      ) : null}

      {videoPreview && !editingVideo ? (
        <div className="create-ask__attach-preview">
          <video src={videoPreview} controls playsInline aria-label="Attached video preview" />
          <button type="button" className="create-ask__attach-remove" onClick={clearVideo} aria-label="Remove video">
            <X size={14} strokeWidth={2.5} aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  )
}
