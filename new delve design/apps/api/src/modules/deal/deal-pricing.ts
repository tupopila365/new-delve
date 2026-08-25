/**
 * Canonical Deal money math. ROUND_HALF_UP to 2 decimal places (commercial rounding).
 * Do not duplicate this logic in controllers, DTO mappers, claims, or the frontend.
 */
import { Decimal } from '@delve/database/decimal'

export type DealDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT'

export class DealPricingError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'DealPricingError'
    this.code = code
  }
}

export type DecimalValue = string | number | Decimal | { toString(): string }

export type ComputeDealPriceInput = {
  listingPrice: DecimalValue | null | undefined
  listingCurrency: string | null | undefined
  discountType: DealDiscountType
  discountValue: DecimalValue
  dealCurrency?: string | null
}

export type ComputedDealPrice = {
  originalPrice: Decimal
  dealPrice: Decimal
  savingAmount: Decimal
  discountPercentage: Decimal
  currency: string
}

const MONEY = 2
const ROUND = Decimal.ROUND_HALF_UP

function money(value: Decimal): Decimal {
  return value.toDecimalPlaces(MONEY, ROUND)
}

function asDecimal(value: DecimalValue, label: string): Decimal {
  try {
    const raw =
      typeof value === 'number' || typeof value === 'string' || value instanceof Decimal
        ? value
        : value.toString()
    const d = new Decimal(raw)
    if (!d.isFinite()) {
      throw new DealPricingError('INVALID_AMOUNT', `${label} must be a finite number.`)
    }
    return d
  } catch (err) {
    if (err instanceof DealPricingError) throw err
    throw new DealPricingError('INVALID_AMOUNT', `${label} must be a finite number.`)
  }
}

export function normalizeCurrencyCode(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const v = raw.trim().toUpperCase()
  if (!v) return null
  if (!/^[A-Z]{3}$/.test(v)) {
    throw new DealPricingError('INVALID_CURRENCY', 'Currency must be a 3-letter ISO code.')
  }
  return v
}

export function computedPriceToDto(computed: ComputedDealPrice) {
  return {
    currency: computed.currency,
    originalAmount: computed.originalPrice.toFixed(MONEY),
    dealAmount: computed.dealPrice.toFixed(MONEY),
    savingAmount: computed.savingAmount.toFixed(MONEY),
    discountPercentage: Number(computed.discountPercentage.toFixed(MONEY)),
  }
}

/** Display helper for stored claim snapshots. Does not invent values when either side is null. */
export function snapshotSavingAmount(
  original: DecimalValue | null | undefined,
  deal: DecimalValue | null | undefined,
): Decimal | null {
  if (original == null || original === '' || deal == null || deal === '') return null
  return money(asDecimal(original, 'Original').minus(asDecimal(deal, 'Deal')))
}

/**
 * listingPrice + discount → original / deal / saving.
 * Zero listing price cannot carry a monetary discount.
 * Fixed discount equal to list price yields dealPrice 0 (allowed). Greater than list price is rejected.
 */
export function computeDealPrice(input: ComputeDealPriceInput): ComputedDealPrice {
  if (input.listingPrice == null || input.listingPrice === '') {
    throw new DealPricingError('DEAL_PRICE_UNAVAILABLE', 'This deal cannot currently be claimed because pricing is unavailable.')
  }
  const listingCurrency = normalizeCurrencyCode(input.listingCurrency)
  if (!listingCurrency) {
    throw new DealPricingError('DEAL_PRICE_UNAVAILABLE', 'This deal cannot currently be claimed because pricing is unavailable.')
  }
  const original = money(asDecimal(input.listingPrice, 'Listing price'))
  if (original.lt(0)) {
    throw new DealPricingError('INVALID_AMOUNT', 'Listing price must not be negative.')
  }

  const discountValue = asDecimal(input.discountValue, 'Discount')
  if (!discountValue.isFinite()) {
    throw new DealPricingError('INVALID_AMOUNT', 'Discount must be a finite number.')
  }

  const dealCurrencyRaw = input.dealCurrency != null && String(input.dealCurrency).trim() !== ''
    ? normalizeCurrencyCode(input.dealCurrency)
    : listingCurrency
  if (dealCurrencyRaw !== listingCurrency) {
    throw new DealPricingError('CURRENCY_MISMATCH', 'Deal currency must match the listing currency.')
  }

  if (original.eq(0)) {
    throw new DealPricingError(
      'LISTING_PRICE_ZERO',
      'A monetary discount cannot be applied to a free (zero-priced) listing.',
    )
  }

  if (input.discountType === 'PERCENTAGE') {
    if (discountValue.lte(0) || discountValue.gt(100)) {
      throw new DealPricingError('INVALID_PERCENTAGE', 'Percentage discount must be greater than 0 and at most 100.')
    }
    const saving = money(original.mul(discountValue).div(100))
    const dealPrice = money(original.minus(saving))
    if (dealPrice.lt(0)) {
      throw new DealPricingError('INVALID_DISCOUNT', 'Discount cannot exceed the listing price.')
    }
    return {
      originalPrice: original,
      dealPrice,
      savingAmount: saving,
      discountPercentage: money(discountValue),
      currency: listingCurrency,
    }
  }

  if (discountValue.lte(0)) {
    throw new DealPricingError('INVALID_AMOUNT', 'Fixed discount must be greater than 0.')
  }
  if (discountValue.gt(original)) {
    throw new DealPricingError('INVALID_DISCOUNT', 'Fixed discount cannot exceed the listing price.')
  }
  const saving = money(discountValue)
  const dealPrice = money(original.minus(saving))
  const pct = money(saving.mul(100).div(original))
  return {
    originalPrice: original,
    dealPrice,
    savingAmount: saving,
    discountPercentage: pct,
    currency: listingCurrency,
  }
}
