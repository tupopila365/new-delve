import { Wallet } from 'lucide-react'

export type PriceLine = {
  label: string
  value: string
  muted?: boolean
}

type Props = {
  lines: PriceLine[]
  total?: { label: string; value: string }
  estimateNote?: string
  className?: string
}

export function BookingPriceSummary({ lines, total, estimateNote, className = '' }: Props) {
  return (
    <div className={`bk-price ${className}`.trim()}>
      {lines.map((line) => (
        <div key={line.label} className={`bk-price__row ${line.muted ? 'bk-price__row--muted' : ''}`.trim()}>
          <span>{line.label}</span>
          <span>{line.value}</span>
        </div>
      ))}
      {total ? (
        <div className="bk-price__total">
          <span className="bk-price__total-label">
            <Wallet size={14} strokeWidth={2.25} aria-hidden />
            {total.label}
          </span>
          <span className="bk-price__total-value">{total.value}</span>
        </div>
      ) : null}
      {estimateNote ? <p className="bk-price__note">{estimateNote}</p> : null}
    </div>
  )
}
