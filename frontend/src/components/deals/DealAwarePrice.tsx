import { useDisplayMoney } from '../../hooks/useDisplayMoney'
import { listingSaleDeal, type ListingDeal } from './types'
import './deals.css'

type Props = {
  /** Fallback display when no listing sale (already formatted). */
  fallback: string
  deals?: ListingDeal[] | unknown
  className?: string
  /** Appended after the sale “now” price, e.g. “ /night”. */
  suffix?: string
  /** Quiet “~total for N nights” cue under sale prices (stays). */
  weekendNights?: number
}

/** Strike-through compare-at + sale price when a listing sale is present. */
export function DealAwarePrice({ fallback, deals, className, suffix, weekendNights = 2 }: Props) {
  const { format } = useDisplayMoney()
  const sale = listingSaleDeal(deals)
  if (!sale?.sale_price) {
    return <span className={className}>{fallback}</span>
  }
  const saleNum = Number(sale.sale_price)
  const now = format(saleNum)
  const was =
    sale.compare_at_price && Number(sale.compare_at_price) > saleNum
      ? format(Number(sale.compare_at_price))
      : null
  const nights = Math.max(1, Math.round(weekendNights) || 2)
  const weekendTotal = Number.isFinite(saleNum) && saleNum > 0 ? format(saleNum * nights) : null
  return (
    <span className={`deal-price${className ? ` ${className}` : ''}`}>
      <span className="deal-price__row">
        {was ? <span className="deal-price__was">{was}</span> : null}
        <span className="deal-price__now">
          {now}
          {suffix ? <span className="deal-price__suffix">{suffix}</span> : null}
        </span>
      </span>
      {weekendTotal && suffix?.includes('night') ? (
        <span className="deal-price__weekend">
          ~{weekendTotal} for {nights} nights
        </span>
      ) : null}
    </span>
  )
}
