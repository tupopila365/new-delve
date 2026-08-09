import { AlertCircle, RefreshCw, WifiOff, Inbox } from 'lucide-react'

// ─── Skeleton primitives ───────────────────────────────────────────────────

function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={className}
      style={{
        background: 'linear-gradient(90deg, var(--border) 25%, var(--surface-subtle) 50%, var(--border) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
        borderRadius: 8,
        ...style,
      }}
    />
  )
}

export function SkeletonCard({ width = 280, height = 320 }: { width?: number; height?: number }) {
  return (
    <div style={{
      width, minWidth: width, height,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      <Shimmer style={{ height: Math.round(height * 0.44), borderRadius: 0 }} />
      <div style={{ padding: 16 }}>
        <Shimmer style={{ height: 14, width: '70%', marginBottom: 8 }} />
        <Shimmer style={{ height: 11, width: '50%', marginBottom: 12 }} />
        <Shimmer style={{ height: 18, width: '40%', marginBottom: 10 }} />
        <Shimmer style={{ height: 11, width: '80%', marginBottom: 12 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Shimmer style={{ height: 11, width: '35%' }} />
          <Shimmer style={{ height: 30, width: 90, borderRadius: 8 }} />
        </div>
      </div>
    </div>
  )
}

export function SkeletonServiceGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 12 }}>
      {Array.from({ length: 11 }).map((_, i) => (
        <div key={i} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          padding: 12, borderRadius: 12,
          background: 'var(--surface)', border: '1px solid var(--border)',
        }}>
          <Shimmer style={{ width: 40, height: 40, borderRadius: 12 }} />
          <Shimmer style={{ height: 10, width: 48 }} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonQuestionGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ padding: 16, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Shimmer style={{ height: 14, width: '90%', marginBottom: 8 }} />
          <Shimmer style={{ height: 11, width: '60%', marginBottom: 12 }} />
          <Shimmer style={{ height: 48, borderRadius: 8, marginBottom: 10 }} />
          <Shimmer style={{ height: 11, width: '30%' }} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTrustGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ padding: 16, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Shimmer style={{ width: 36, height: 36, borderRadius: 10, marginBottom: 12 }} />
          <Shimmer style={{ height: 13, width: '70%', marginBottom: 6 }} />
          <Shimmer style={{ height: 10, width: '90%', marginBottom: 4 }} />
          <Shimmer style={{ height: 10, width: '75%' }} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonBudgetGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ borderRadius: 12, overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Shimmer style={{ height: 128, borderRadius: 0 }} />
          <div style={{ padding: 12 }}>
            <Shimmer style={{ height: 13, width: '80%', marginBottom: 6 }} />
            <Shimmer style={{ height: 10, width: '55%', marginBottom: 8 }} />
            <Shimmer style={{ height: 22, width: 120, borderRadius: 20 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Section-level error state ─────────────────────────────────────────────

export function SectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 12, padding: '40px 24px', borderRadius: 16, textAlign: 'center',
      background: 'var(--surface)', border: '1px solid var(--border)',
    }}>
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 44, height: 44, borderRadius: 12,
        background: 'rgba(239,68,68,0.1)', color: '#EF4444',
      }}>
        <AlertCircle size={20} />
      </span>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>
          Could not load this section
        </p>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
          One section failed. The rest of the page is still available.
        </p>
      </div>
      <button
        onClick={onRetry}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: 'var(--surface-subtle)', border: '1px solid var(--border)',
          color: 'var(--fg)', cursor: 'pointer',
        }}
      >
        <RefreshCw size={13} />
        Try again
      </button>
    </div>
  )
}

// ─── Section-level offline state ───────────────────────────────────────────

export function SectionOffline() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderRadius: 12,
      background: 'var(--surface)', border: '1px solid var(--border)',
    }}>
      <WifiOff size={18} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', marginBottom: 2 }}>
          Showing cached content
        </p>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
          You're offline. Results may be out of date.
        </p>
      </div>
    </div>
  )
}

// ─── Section-level empty state ─────────────────────────────────────────────

export function SectionEmpty({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 10, padding: '36px 24px', borderRadius: 16, textAlign: 'center',
      background: 'var(--surface)', border: '1px solid var(--border)',
    }}>
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 44, height: 44, borderRadius: 12,
        background: 'rgba(140,82,255,0.1)', color: 'var(--primary)',
      }}>
        {icon}
      </span>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>{title}</p>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', maxWidth: 280 }}>{body}</p>
      </div>
    </div>
  )
}

// ─── Shimmer keyframes (injected once) ────────────────────────────────────

export function ShimmerStyle() {
  return (
    <style>{`
      @keyframes shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  )
}
