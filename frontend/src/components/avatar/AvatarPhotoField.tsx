import { Camera } from 'lucide-react'
import { UserAvatar } from '../UserAvatar'
import { AvatarCropModal } from './AvatarCropModal'
import type { AvatarPhotoEditorState } from './useAvatarPhotoEditor'
import './AvatarPhotoField.css'

type Props = {
  editor: AvatarPhotoEditorState
  displayName: string
  hasSavedAvatar?: boolean
}

export function AvatarPhotoField({ editor, displayName, hasSavedAvatar = false }: Props) {
  const showRemove =
    Boolean(editor.pendingFile) ||
    editor.removeOnSave ||
    (hasSavedAvatar && !editor.removeOnSave)

  return (
    <>
      <div className="avatar-field">
        <div className="avatar-field__wrap">
          <UserAvatar
            src={editor.previewSrc}
            name={displayName}
            size="lg"
            shape="circle"
            className="avatar-field__avatar"
            fill
          />
          <button
            type="button"
            className="avatar-field__edit"
            aria-label="Change profile photo"
            onClick={editor.openPicker}
          >
            <Camera size={14} strokeWidth={2.5} aria-hidden />
          </button>
        </div>
        <div className="avatar-field__copy">
          <button type="button" className="btn btn-ghost avatar-field__btn" onClick={editor.openPicker}>
            Change photo
          </button>
          {showRemove ? (
            <button
              type="button"
              className="avatar-field__remove"
              onClick={editor.markRemove}
            >
              Remove photo
            </button>
          ) : null}
          <p className="avatar-field__hint">JPG or PNG. You can crop and zoom before saving.</p>
        </div>
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
        onConfirm={async () => {
          await editor.confirmCrop()
        }}
        onCancel={editor.cancelCrop}
      />
    </>
  )
}
