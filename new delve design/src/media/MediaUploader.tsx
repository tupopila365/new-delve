import type { MediaPurpose } from '@delve/contracts'
import { useMediaUpload } from './useMediaUpload'
import MediaPreview from './MediaPreview'
import MediaUploadProgress from './MediaUploadProgress'

export interface MediaUploaderProps {
  purpose?: MediaPurpose
  label?: string
  disabled?: boolean
  onReady?: (mediaId: string, deliveryUrl: string) => void
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
}: MediaUploaderProps) {
  const upload = useMediaUpload(purpose)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <MediaPreview
          previewUrl={upload.previewUrl}
          deliveryUrl={upload.asset?.delivery.url}
          alt={upload.asset?.altText || 'Selected media'}
        />
        <div className="flex flex-col gap-2 min-w-0">
          <label className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
            {label}
          </label>
          <input
            type="file"
            accept={purpose === 'avatar' ? 'image/jpeg,image/png,image/webp' : 'image/*,video/*'}
            disabled={disabled || upload.busy}
            className="text-sm max-w-full"
            style={{ minHeight: 44 }}
            onChange={e => {
              const file = e.target.files?.[0]
              if (!file) return
              void upload.start(file).then(saved => {
                if (saved) onReady?.(saved.id, saved.delivery.url)
              })
            }}
          />
        </div>
      </div>

      <MediaUploadProgress
        phase={upload.phase}
        progress={upload.progress}
        error={upload.error}
        onCancel={upload.busy ? upload.cancel : undefined}
        onRetry={upload.phase === 'error' ? () => void upload.retry() : undefined}
      />

      {upload.phase === 'ready' && upload.asset && (
        <p className="text-xs" style={{ color: 'var(--fg-muted)' }} role="status">
          Upload verified and saved.
        </p>
      )}
    </div>
  )
}
