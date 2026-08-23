import { Skeleton } from '../skeletons'

export default function EventsPageSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-3 sm:p-0 sm:pt-4" aria-busy="true">
      <span className="sr-only" role="status">
        Loading events
      </span>
      <div
        className="overflow-hidden rounded-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <Skeleton rounded={0} style={{ height: 200, width: '100%' }} />
        <div className="p-4 space-y-2">
          <Skeleton style={{ height: 18, width: '70%' }} />
          <Skeleton style={{ height: 12, width: '45%' }} />
          <div className="flex gap-2 pt-2">
            <Skeleton style={{ height: 36, width: '48%' }} rounded={12} />
            <Skeleton style={{ height: 36, width: '48%' }} rounded={12} />
          </div>
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Skeleton rounded={0} style={{ height: 128, width: '100%' }} />
          <div className="p-3.5 space-y-2">
            <Skeleton style={{ height: 14, width: '65%' }} />
            <Skeleton style={{ height: 11, width: '40%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
