import { Decimal } from '@delve/database/decimal'

/** Stripe zero-decimal currencies (amount is already the smallest unit). */
const ZERO_DECIMAL = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
])

/** Stripe three-decimal currencies. */
const THREE_DECIMAL = new Set(['BHD', 'JOD', 'KWD', 'OMR', 'TND'])

export function normalizeCurrencyCode(currency: string): string {
  return currency.trim().toUpperCase()
}

/** Decimal places Stripe uses for the currency's smallest unit. Default 2 (NAD, USD, EUR, …). */
export function stripeCurrencyExponent(currency: string): 0 | 2 | 3 {
  const code = normalizeCurrencyCode(currency)
  if (ZERO_DECIMAL.has(code)) return 0
  if (THREE_DECIMAL.has(code)) return 3
  return 2
}

function asMoney(amount: Decimal | string | { toString(): string }): Decimal {
  return new Decimal(typeof amount === 'string' ? amount : amount.toString())
}

/** Convert a major-unit Decimal amount to Stripe's integer smallest-unit amount. Never uses float math. */
export function toStripeAmount(amount: Decimal | string | { toString(): string }, currency: string): number {
  const money = asMoney(amount)
  if (!money.isFinite() || money.lt(0)) {
    throw new Error('Amount must be a non-negative finite decimal.')
  }
  const exp = stripeCurrencyExponent(currency)
  const scaled = money.mul(new Decimal(10).pow(exp)).toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
  if (!scaled.isInteger()) {
    throw new Error('Stripe amount is not an integer after rounding.')
  }
  const n = Number(scaled.toFixed(0))
  if (!Number.isSafeInteger(n)) {
    throw new Error('Stripe amount exceeds a safe integer.')
  }
  return n
}

export function fromStripeAmount(stripeAmount: number, currency: string): Decimal {
  if (!Number.isInteger(stripeAmount) || stripeAmount < 0) {
    throw new Error('Stripe amount must be a non-negative integer.')
  }
  const exp = stripeCurrencyExponent(currency)
  return new Decimal(stripeAmount).div(new Decimal(10).pow(exp))
}

export function platformFeeAmount(gross: Decimal | string | { toString(): string }, feeBps: number): Decimal {
  const money = asMoney(gross)
  const bps = new Decimal(feeBps)
  const fee = money.mul(bps).div(10000).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  return Decimal.min(fee, money)
}

/** Canonical marketplace commission. Same math as platformFeeAmount. */
export const platformCommissionAmount = platformFeeAmount

export function netAfterPlatformFee(gross: Decimal | string | { toString(): string }, feeBps: number): Decimal {
  const money = asMoney(gross)
  return money.minus(platformCommissionAmount(money, feeBps))
}

export const businessNetAfterCommission = netAfterPlatformFee
