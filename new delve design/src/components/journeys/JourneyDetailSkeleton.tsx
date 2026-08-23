import { Skeleton } from '../skeletons'

export default function JourneyDetailSkeleton() {
  return (
    <div className="pb-10" aria-busy="true">
      <span className="sr-only" role="status">
        Loading journey
      </span>
      <div className="px-4 sm:px-0 pt-3 pb-3 flex items-center justify-between">
        <Skeleton style={{ height: 20, width: 72 }} />
        <div className="flex gap-2">
          <Skeleton style={{ height: 36, width: 64, borderRadius: 12 }} />
          <Skeleton style={{ height: 36, width: 64, borderRadius: 12 }} />
        </div>
      </div>
      <Skeleton rounded={0} className="sm:rounded-2xl" style={{ width: '100%', height: 224 }} />
      <div className="px-4 sm:px-0 pt-4 space-y-3">
        <Skeleton style={{ height: 28, width: '78%' }} />
        <Skeleton style={{ height: 12, width: 96 }} />
        <Skeleton style={{ height: 14, width: '92%' }} />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton style={{ height: 32, width: 32, borderRadius: 9999 }} />
          <Skeleton style={{ height: 14, width: 120 }} />
        </div>
      </div>
      <div className="px-4 sm:px-0 pt-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4" style={{ border: '1px solid var(--border)' }}>
            <Skeleton style={{ height: 12, width: 56, marginBottom: 8 }} />
            <Skeleton style={{ height: 18, width: '55%' }} />
            <Skeleton style={{ height: 12, width: '80%', marginTop: 8 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
