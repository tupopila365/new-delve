export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl h-16"
          style={{ background: 'var(--elevated)', border: '1px solid var(--border)', opacity: 0.7 }}
        />
      ))}
    </div>
  )
}
