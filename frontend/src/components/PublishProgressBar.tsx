import './PublishProgressBar.css'

export type PublishProgressJob = {
  id: string
  status: 'uploading' | 'posting' | 'done' | 'failed'
  progress: number
  message: string
  error?: string
}

type Props = {
  jobs: PublishProgressJob[]
  onRetry: (jobId: string) => void
  onDismiss: (jobId: string) => void
}

/** Global Instagram-style posting strip — visible while background publish runs. */
export function PublishProgressBar({ jobs, onRetry, onDismiss }: Props) {
  const active = jobs.filter((j) => j.status !== 'done')
  if (active.length === 0) return null

  const primary = active[0]
  const failed = primary.status === 'failed'
  const pct = Math.max(4, Math.round((primary.progress || 0) * 100))

  return (
    <div
      className={`publish-progress${failed ? ' publish-progress--failed' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="publish-progress__track" aria-hidden>
        {!failed ? (
          <div className="publish-progress__fill" style={{ width: `${pct}%` }} />
        ) : (
          <div className="publish-progress__fill publish-progress__fill--failed" style={{ width: '100%' }} />
        )}
      </div>
      <div className="publish-progress__row">
        <p className="publish-progress__label">
          {failed ? primary.error || primary.message : primary.message}
          {active.length > 1 ? ` · ${active.length} in progress` : ''}
        </p>
        <div className="publish-progress__actions">
          {failed ? (
            <>
              <button type="button" onClick={() => onRetry(primary.id)}>
                Retry
              </button>
              <button type="button" onClick={() => onDismiss(primary.id)}>
                Dismiss
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
