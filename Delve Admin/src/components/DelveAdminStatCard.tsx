type Props = {
  value: string | number
  label: string
  accent?: boolean
  warn?: boolean
}

export function DelveAdminStatCard({ value, label, accent, warn }: Props) {
  const cls = [
    'da-stat',
    accent ? 'da-stat--accent' : '',
    warn ? 'da-stat--warn' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cls}>
      <strong className="da-stat__value">{value}</strong>
      <span className="da-stat__label">{label}</span>
    </div>
  )
}
