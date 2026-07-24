import { formatDisplayMoney } from '../lib/displayMoney'
import { exploreDisplayCurrency } from '../lib/exploreDestination'

export type BookingPayoutStatus = 'none' | 'held' | 'released' | 'refunded'

export type BookingPayoutRecipient = 'host' | 'guide' | 'provider' | 'operator'

/** Short buyer-facing payment hold / release copy. */
export function buyerPaymentLabel(
  status: BookingPayoutStatus | string | null | undefined,
  recipient: BookingPayoutRecipient = 'provider',
): string | null {
  if (!status || status === 'none') return null
  if (status === 'held') return 'Payment held by Delve'
  if (status === 'released') {
    const map: Record<BookingPayoutRecipient, string> = {
      host: 'Released to host',
      guide: 'Released to guide',
      operator: 'Released to operator',
      provider: 'Released to provider',
    }
    return map[recipient]
  }
  if (status === 'refunded') return 'Refunded'
  return null
}

export function sellerPayoutStatusLabel(status: string | null | undefined): string | null {
  if (!status || status === 'none') return null
  return (
    {
      held: 'Held by Delve',
      released: 'Released',
      refunded: 'Refunded',
    }[status] ?? null
  )
}

function money(value: string | number, currency?: string | null): string {
  return formatDisplayMoney(value, currency || exploreDisplayCurrency(), {
    fallback: formatDisplayMoney(0, currency || exploreDisplayCurrency()),
  })
}

/** Seller line: “Your payout R1,200 · Held by Delve (Delve fee R120)” */
export function formatSellerPayoutLine(opts: {
  seller_payout?: string | number | null
  platform_fee?: string | number | null
  payout_status?: string | null
  currency?: string | null
}): string | null {
  if (opts.seller_payout == null || opts.payout_status == null || opts.payout_status === 'none') {
    return null
  }
  const currency = opts.currency || exploreDisplayCurrency()
  const statusLabel = sellerPayoutStatusLabel(opts.payout_status)
  let line = `Your payout ${money(opts.seller_payout, currency)}`
  if (statusLabel) line += ` · ${statusLabel}`
  const fee = Number(opts.platform_fee ?? 0)
  if (fee > 0) line += ` (Delve fee ${money(fee, currency)})`
  return line
}
