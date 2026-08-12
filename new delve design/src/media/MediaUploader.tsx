import { useId, useRef } from 'react'
import type { MediaPurpose } from '@delve/contracts'
import { useMediaUpload } from './useMediaUpload'
import MediaPreview from './MediaPreview'
import MediaUploadProgress from './MediaUploadProgress'

export interface MediaUploaderProps {
  purpose?: MediaPurpose
  label?: string
  disabled?: boolean
  onReady?: (mediaId: string, deliveryUrl: string) => void
  /** Existing saved URL from profile (e.g. avatarUrl). */
  currentUrl?: string | null
  /** Initials source when no photo is set. */
  placeholderName?: string
  /** Parent is still loading the profile record. */
  profileLoading?: boolean
  chooseLabel?: string
}

/**
 * Shared Delve media uploader. All traveler/provider features should use this
 * instead of inventing per-feature upload paths.
 */
export default function MediaUploader({
  purpose = 'avatar',
  label = 'Upload image',
  disabled = false,
  onReady,
  currentUrl = null,
  placeholderName,
  profileLoading = false,
  chooseLabel = 'Choose photo',
}: MediaUploaderProps) {
  const upload = useMediaUpload(purpose)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const showSelectedPreview = Boolean(upload.previewUrl || (upload.phase !== 'idle' && upload.asset?.delivery.url))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <MediaPreview
          previewUrl={upload.previewUrl}
          deliveryUrl={upload.asset?.delivery.url}
          currentUrl={showSelectedPreview ? null : currentUrl}
          alt={upload.asset?.altText || (currentUrl ? 'Profile photo' : 'Profile photo placeholder')}
          loading={profileLoading || upload.busy}
          placeholderName={placeholderName}
        />
        <div className="flex flex-col gap-2 min-w-0">
          <p className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }} id={`${inputId}-label`}>
            {label}
          </p>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={purpose === 'avatar' ? 'image/jpeg,image/png,image/webp' : 'image/*,video/*'}
            disabled={disabled || upload.busy || profileLoading}
            className="sr-only"
            aria-labelledby={`${inputId}-label`}
            onChange={e => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              void upload.start(file).then(saved => {
                if (saved) {
                  onReady?.(saved.id, saved.delivery.url)
                  upload.reset()
                }
              })
            }}
          />
          <button
            type="button"
            disabled={disabled || upload.busy || profileLoading}
            className="min-h-[44px] w-fit rounded-xl px-3.5 py-2 text-sm font-semibold active:scale-[0.98] transition-transform"
            style={{
              background: disabled || upload.busy ? 'var(--surface-subtle)' : 'rgba(140,82,255,0.16)',
              color: disabled || upload.busy ? 'var(--fg-muted)' : 'var(--primary)',
              border: '1px solid var(--border)',
              cursor: disabled || upload.busy ? 'not-allowed' : 'pointer',
            }}
            onClick={() => inputRef.current?.click()}
          >
            {upload.busy ? 'Uploading…' : chooseLabel}
          </button>
          {upload.selectedFileName && (upload.previewUrl || upload.phase === 'error') && (
            <p className="text-xs m-0 truncate" style={{ color: 'var(--fg-muted)' }}>
              {upload.selectedFileName}
            </p>
          )}
          <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
            JPG, PNG, or WebP
          </p>
        </div>
      </div>

      <MediaUploadProgress
        phase={upload.phase}
        progress={upload.progress}
        error={upload.error}
        onCancel={upload.busy ? upload.cancel : undefined}
        onRetry={upload.phase === 'error' ? () => void upload.retry() : undefined}
      />
    </div>
  )
}
