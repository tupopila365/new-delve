import { Link } from 'react-router-dom'

export function AttentionCard({
  label,
  value,
  to,
  tone = 'default',
}: {
  label: string
  value: string | number
  to?: string
  tone?: 'default' | 'warning' | 'critical'
}) {
  const color = tone === 'critical' ? '#ffb4b4' : tone === 'warning' ? 'var(--warning)' : 'var(--fg)'
  const body = (
    <div className="rounded-xl p-4 h-full" style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}>
      <p className="text-xs m-0" style={{ color: 'var(--muted)' }}>
        {label}
      </p>
      <p className="text-2xl font-extrabold m-0 mt-2" style={{ color, fontFamily: 'Syne, sans-serif' }}>
        {value}
      </p>
    </div>
  )
  if (!to) return body
  return (
    <Link to={to} className="block no-underline text-inherit rounded-xl focus-visible:outline focus-visible:outline-2" style={{ outlineColor: 'var(--primary)' }}>
      {body}
    </Link>
  )
}
