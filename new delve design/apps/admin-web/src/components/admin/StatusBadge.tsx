export function StatusBadge({ children }: { children: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ background: 'var(--elevated)', border: '1px solid var(--border)', color: 'var(--fg)' }}
    >
      {children.replace(/_/g, ' ')}
    </span>
  )
}
