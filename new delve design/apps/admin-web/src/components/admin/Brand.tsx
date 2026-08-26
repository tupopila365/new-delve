export function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <img src="/DELVE.png" alt="" width={40} height={40} className="rounded-lg shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-[0.18em] uppercase m-0" style={{ color: 'var(--primary)' }}>
          Delve Admin
        </p>
        {compact ? null : (
          <p className="text-sm m-0" style={{ color: 'var(--muted)' }}>
            Operations console
          </p>
        )}
      </div>
    </div>
  )
}
