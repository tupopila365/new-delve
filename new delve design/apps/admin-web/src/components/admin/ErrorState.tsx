export function ErrorState({ title, detail, onRetry }: { title: string; detail?: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl p-4" style={{ border: '1px solid var(--border)', background: 'rgba(200,59,59,0.08)' }}>
      <p className="text-sm font-semibold m-0" style={{ color: '#ffb4b4' }}>
        {title}
      </p>
      {detail ? (
        <p className="text-sm m-0 mt-1" style={{ color: 'var(--muted)' }}>
          {detail}
        </p>
      ) : null}
      {onRetry ? (
        <button type="button" className="admin-btn-secondary mt-3" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  )
}
