import type { CSSProperties } from 'react'

/** Shared shimmer block — animation via global `ShimmerStyle` in App. */
export function Skeleton({
  className = '',
  style,
  rounded = 8,
}: {
  className?: string
  style?: CSSProperties
  rounded?: number | string
}) {
  return (
    <div
      className={`delve-skeleton ${className}`}
      aria-hidden
      style={{
        background:
          'linear-gradient(90deg, var(--border) 25%, var(--surface-subtle) 50%, var(--border) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
        borderRadius: rounded,
        ...style,
      }}
    />
  )
}

/** Full profile-shaped skeleton matching ProfilePage layout. */
export function ProfileSkeleton() {
  return (
    <div className="pb-4" aria-busy="true">
      <span className="sr-only" role="status">
        Loading traveler profile
      </span>

      {/* Cover */}
      <div className="relative h-44 sm:h-52 overflow-hidden sm:rounded-t-2xl">
        <Skeleton className="absolute inset-0" rounded={0} style={{ height: '100%', width: '100%' }} />
      </div>

      <div
        className="px-4 pb-4 -mt-1"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-end justify-between gap-3 -mt-9 mb-3">
          <Skeleton
            rounded="9999px"
            style={{
              height: 80,
              width: 80,
              border: '3px solid var(--surface)',
              flexShrink: 0,
            }}
          />
          <div className="flex gap-2 pb-1">
            <Skeleton style={{ height: 40, width: 72 }} rounded={12} />
            <Skeleton style={{ height: 40, width: 96 }} rounded={12} />
          </div>
        </div>

        <Skeleton style={{ height: 22, width: '42%', maxWidth: 200, marginBottom: 8 }} />
        <Skeleton style={{ height: 14, width: '55%', maxWidth: 240, marginBottom: 12 }} />
        <Skeleton style={{ height: 12, width: '88%', marginBottom: 6 }} />
        <Skeleton style={{ height: 12, width: '70%', marginBottom: 14 }} />
        <Skeleton style={{ height: 24, width: 72, marginBottom: 14 }} rounded={999} />

        <div
          className="grid grid-cols-3 overflow-hidden rounded-xl"
          style={{ gap: 1, background: 'var(--border)' }}
        >
          {[0, 1, 2].map(i => (
            <div key={i} className="py-3 flex flex-col items-center gap-1.5" style={{ background: 'var(--surface)' }}>
              <Skeleton style={{ height: 18, width: 36 }} />
              <Skeleton style={{ height: 10, width: 52 }} />
            </div>
          ))}
        </div>
      </div>

      <div
        className="flex gap-1 px-2 overflow-x-auto"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 14, width: 64, margin: '14px 8px' }} />
        ))}
      </div>

      <DelversListSkeleton count={3} compact />
    </div>
  )
}

/** Single Delver/post card skeleton (profile list or feed). */
export function DelverCardSkeleton({ feed = false }: { feed?: boolean }) {
  return (
    <article
      aria-hidden
      style={{ borderBottom: '1px solid var(--border)' }}
      className={feed ? '' : 'px-3 sm:px-4 py-4'}
    >
      {feed && (
        <div className="flex items-center gap-2.5 px-4 py-3">
          <Skeleton rounded="9999px" style={{ height: 40, width: 40, flexShrink: 0 }} />
          <div className="flex-1 min-w-0">
            <Skeleton style={{ height: 13, width: '40%', marginBottom: 6 }} />
            <Skeleton style={{ height: 10, width: '28%' }} />
          </div>
          <Skeleton style={{ height: 10, width: 28 }} />
        </div>
      )}

      <Skeleton
        rounded={feed ? 0 : 12}
        style={{
          width: '100%',
          height: feed ? 280 : 220,
          minHeight: feed ? 240 : 180,
          marginBottom: feed ? 0 : 12,
        }}
      />

      <div className={feed ? 'px-4 py-3' : ''}>
        <div className="flex items-center gap-4 mb-2">
          <Skeleton rounded="9999px" style={{ height: 22, width: 22 }} />
          <Skeleton rounded="9999px" style={{ height: 22, width: 22 }} />
          <Skeleton rounded="9999px" style={{ height: 22, width: 22, marginLeft: 'auto' }} />
        </div>
        <Skeleton style={{ height: 12, width: '35%', marginBottom: 8 }} />
        <Skeleton style={{ height: 12, width: '92%', marginBottom: 6 }} />
        <Skeleton style={{ height: 12, width: '68%' }} />
      </div>
    </article>
  )
}

export function DelversListSkeleton({
  count = 4,
  compact = false,
  feed = false,
}: {
  count?: number
  compact?: boolean
  feed?: boolean
}) {
  return (
    <div aria-busy="true">
      {!compact && (
        <span className="sr-only" role="status">
          Loading posts
        </span>
      )}
      {Array.from({ length: count }).map((_, i) => (
        <DelverCardSkeleton key={i} feed={feed} />
      ))}
    </div>
  )
}

export function EventsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4" aria-busy="true">
      <span className="sr-only" role="status">
        Loading events
      </span>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Skeleton rounded={0} style={{ height: 128, width: '100%' }} />
          <div className="p-3.5">
            <Skeleton style={{ height: 14, width: '60%', marginBottom: 8 }} />
            <Skeleton style={{ height: 11, width: '40%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
