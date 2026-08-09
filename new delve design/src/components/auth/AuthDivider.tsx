export interface AuthDividerProps {
  label?: string
}

export default function AuthDivider({ label = 'or continue with' }: AuthDividerProps) {
  return (
    <div className="flex items-center gap-3 my-1" aria-hidden="true">
      <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>
        {label}
      </span>
      <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}
