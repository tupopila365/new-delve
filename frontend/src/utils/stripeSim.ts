export type PaymentTargetType =
  | 'shop_order'
  | 'accommodation'
  | 'guide'
  | 'vehicle'
  | 'bus_seat'
  | 'bus_seat_bulk'

export type SimulatedPaymentIntent = {
  id: string
  object: 'payment_intent'
  client_secret: string
  status: string
  amount: string
  amount_cents: number
  currency: string
  target_type: PaymentTargetType | string
  target_id: string
  last4: string
  brand: string
  failure_code: string
  failure_message: string
  charge_id: string
  refunded: boolean
  created_at: string
  confirmed_at: string
  metadata: Record<string, unknown>
  simulated: boolean
  provider: string
}

export type PayTarget = {
  target_type: PaymentTargetType
  target_id: string
  /** Display amount (NAD). Optional — modal prefers Intent amount after create. */
  amountLabel?: string
  title?: string
  metadata?: Record<string, unknown>
}

export function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}
