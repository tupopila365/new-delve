import { Skeleton } from '../skeletons'

export default function JourneysPageSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4 sm:p-0 sm:pt-4" aria-busy="true">
      <span className="sr-only" role="status">
        Loading journeys
      </span>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Skeleton rounded={0} style={{ width: '100%', aspectRatio: '16/10' }} />
          <div className="p-4 space-y-2">
            <Skeleton style={{ height: 16, width: '72%' }} />
            <Skeleton style={{ height: 11, width: '48%' }} />
            <Skeleton style={{ height: 11, width: '62%' }} />
            <div className="flex gap-3 pt-2">
              <Skeleton style={{ height: 14, width: 40 }} />
              <Skeleton style={{ height: 14, width: 40 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
