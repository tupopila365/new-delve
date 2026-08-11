import type { MediaUploadPhase } from './useMediaUpload'

export interface MediaUploadProgressProps {
  phase: MediaUploadPhase
  progress: number
  error?: string | null
  onCancel?: () => void
  onRetry?: () => void
}

export default function MediaUploadProgress({
  phase,
  progress,
  error,
  onCancel,
  onRetry,
}: MediaUploadProgressProps) {
  if (phase === 'idle' || phase === 'preview' || phase === 'ready') {
    if (phase === 'ready') return null
    return null
  }

  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100)
  const label =
    phase === 'uploading'
      ? `Uploading ${percent}%`
      : phase === 'completing'
        ? 'Verifying upload…'
        : phase === 'processing'
          ? 'Processing'
          : error || 'Upload failed'

  return (
    <div className="flex flex-col gap-2" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs m-0" style={{ color: phase === 'error' ? 'var(--auth-danger)' : 'var(--fg-muted)' }}>
          {label}
        </p>
        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              className="text-xs font-semibold min-h-[44px] px-2"
              style={{ background: 'transparent', border: 'none', color: 'var(--fg)', cursor: 'pointer' }}
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
          {onRetry && (
            <button
              type="button"
              className="text-xs font-semibold min-h-[44px] px-2"
              style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
              onClick={onRetry}
            >
              Retry
            </button>
          )}
        </div>
      </div>
      {(phase === 'uploading' || phase === 'completing') && (
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: 'var(--border)' }}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          role="progressbar"
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${percent}%`, background: 'var(--primary)' }}
          />
        </div>
      )}
    </div>
  )
}
