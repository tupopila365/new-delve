export function MetricCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}>
      <p className="text-xs m-0" style={{ color: 'var(--muted)' }}>
        {label}
      </p>
      <p className="text-xl font-bold m-0 mt-1">{value}</p>
      {hint ? (
        <p className="text-xs m-0 mt-1" style={{ color: 'var(--muted)' }}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}
