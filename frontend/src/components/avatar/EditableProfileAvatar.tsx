import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Camera, Loader2 } from 'lucide-react'
import { mediaUrl } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { UserAvatar } from '../UserAvatar'
import { AvatarCropModal } from './AvatarCropModal'
import { clearProfileAvatar, invalidateAvatarCaches, uploadProfileAvatar } from './profileAvatarApi'
import { useAvatarPhotoEditor } from './useAvatarPhotoEditor'
import './EditableProfileAvatar.css'

type Props = {
  avatar: string | null
  displayName: string
  username: string
}

export function EditableProfileAvatar({ avatar, displayName, username }: Props) {
  const { refreshProfile } = useAuth()
  const qc = useQueryClient()
  const editor = useAvatarPhotoEditor(mediaUrl(avatar))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCropConfirm() {
    setError(null)
    const file = await editor.confirmCrop()
    if (!file) return
    setSaving(true)
    try {
      await uploadProfileAvatar(file)
      await refreshProfile()
      await invalidateAvatarCaches(qc, username)
      editor.clearPending()
    } catch {
      setError('Could not update profile photo. Try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    if (!window.confirm('Remove your profile photo?')) return
    setSaving(true)
    setError(null)
    try {
      await clearProfileAvatar()
      await refreshProfile()
      await invalidateAvatarCaches(qc, username)
      editor.clearPending()
    } catch {
      setError('Could not remove profile photo. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="profile-editable-avatar">
        <button
          type="button"
          className="profile-editable-avatar__btn"
          onClick={editor.openPicker}
          disabled={saving}
          aria-label="Change profile photo"
        >
          <UserAvatar
            src={editor.previewSrc ?? avatar}
            name={displayName}
            size="xl"
            shape="circle"
            className="profile-bio__avatar"
            fill
          />
          <span className="profile-editable-avatar__badge" aria-hidden>
            {saving ? (
              <Loader2 size={14} strokeWidth={2.25} className="profile-editable-avatar__spin" />
            ) : (
              <Camera size={14} strokeWidth={2.5} />
            )}
          </span>
        </button>
        {avatar || editor.previewSrc ? (
          <button
            type="button"
            className="profile-editable-avatar__remove"
            onClick={() => void handleRemove()}
            disabled={saving}
          >
            Remove photo
          </button>
        ) : null}
        {error ? (
          <p className="profile-editable-avatar__error" role="alert">
            {error}
          </p>
        ) : null}
        <input
          ref={editor.inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          className="visually-hidden"
          aria-label="Profile photo"
          onChange={(event) => editor.onFileSelected(event.target.files?.[0] ?? null)}
        />
      </div>

      <AvatarCropModal
        open={editor.cropOpen}
        imageSrc={editor.cropSrc}
        zoom={editor.cropZoom}
        crop={editor.cropPosition}
        onZoomChange={editor.setCropZoom}
        onCropChange={editor.setCropPosition}
        onCropComplete={editor.onCropComplete}
        onConfirm={handleCropConfirm}
        onCancel={editor.cancelCrop}
      />
    </>
  )
}
