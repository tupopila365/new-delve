import './booking-detail.css'

export type BookingDetailItem = {
  id?: string | number
  label: string
  value: string
  fullWidth?: boolean
}

type Props = {
  items: BookingDetailItem[]
  className?: string
}

export function BookingDetailsList({ items, className = '' }: Props) {
  if (items.length === 0) return null

  return (
    <dl className={`bk-details-list ${className}`.trim()}>
      {items.map((item) => (
        <div key={item.id ?? item.label} className={item.fullWidth ? 'bk-details-list__row--full' : undefined}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
