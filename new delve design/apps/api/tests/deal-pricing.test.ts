import { describe, expect, it } from 'vitest'
import { computeDealPrice, computedPriceToDto, DealPricingError } from '../src/modules/deal/deal-pricing.js'

describe('computeDealPrice', () => {
  it('applies 25% off 1200 as 900', () => {
    const priced = computeDealPrice({
      listingPrice: '1200.00',
      listingCurrency: 'nad',
      discountType: 'PERCENTAGE',
      discountValue: 25,
    })
    expect(priced.currency).toBe('NAD')
    expect(priced.originalPrice.toFixed(2)).toBe('1200.00')
    expect(priced.savingAmount.toFixed(2)).toBe('300.00')
    expect(priced.dealPrice.toFixed(2)).toBe('900.00')
    expect(priced.discountPercentage.toFixed(2)).toBe('25.00')
  })

  it('applies 300 fixed off 1200 as 900', () => {
    const priced = computeDealPrice({
      listingPrice: 1200,
      listingCurrency: 'NAD',
      discountType: 'FIXED_AMOUNT',
      discountValue: 300,
      dealCurrency: 'NAD',
    })
    expect(priced.dealPrice.toFixed(2)).toBe('900.00')
    expect(priced.savingAmount.toFixed(2)).toBe('300.00')
  })

  it('allows a fixed discount equal to the listing price (dealPrice 0)', () => {
    const priced = computeDealPrice({
      listingPrice: '1200',
      listingCurrency: 'NAD',
      discountType: 'FIXED_AMOUNT',
      discountValue: 1200,
    })
    expect(priced.dealPrice.toFixed(2)).toBe('0.00')
  })

  it('rejects a fixed discount greater than the listing price', () => {
    expect(() =>
      computeDealPrice({
        listingPrice: 1200,
        listingCurrency: 'NAD',
        discountType: 'FIXED_AMOUNT',
        discountValue: 1300,
      }),
    ).toThrow(DealPricingError)
  })

  it('rounds 25.5% with ROUND_HALF_UP', () => {
    const priced = computeDealPrice({
      listingPrice: '1200.00',
      listingCurrency: 'NAD',
      discountType: 'PERCENTAGE',
      discountValue: '25.5',
    })
    expect(priced.savingAmount.toFixed(2)).toBe('306.00')
    expect(priced.dealPrice.toFixed(2)).toBe('894.00')
  })

  it('rejects 0%', () => {
    expect(() =>
      computeDealPrice({
        listingPrice: 1200,
        listingCurrency: 'NAD',
        discountType: 'PERCENTAGE',
        discountValue: 0,
      }),
    ).toThrow(/greater than 0/)
  })

  it('rejects 101%', () => {
    expect(() =>
      computeDealPrice({
        listingPrice: 1200,
        listingCurrency: 'NAD',
        discountType: 'PERCENTAGE',
        discountValue: 101,
      }),
    ).toThrow(DealPricingError)
  })

  it('rejects negative percentage', () => {
    expect(() =>
      computeDealPrice({
        listingPrice: 1200,
        listingCurrency: 'NAD',
        discountType: 'PERCENTAGE',
        discountValue: -5,
      }),
    ).toThrow(DealPricingError)
  })

  it('rejects negative listing amount', () => {
    expect(() =>
      computeDealPrice({
        listingPrice: -1,
        listingCurrency: 'NAD',
        discountType: 'PERCENTAGE',
        discountValue: 10,
      }),
    ).toThrow(DealPricingError)
  })

  it('rejects currency mismatch', () => {
    expect(() =>
      computeDealPrice({
        listingPrice: 1200,
        listingCurrency: 'NAD',
        discountType: 'FIXED_AMOUNT',
        discountValue: 100,
        dealCurrency: 'USD',
      }),
    ).toMatchObject({})
    try {
      computeDealPrice({
        listingPrice: 1200,
        listingCurrency: 'NAD',
        discountType: 'FIXED_AMOUNT',
        discountValue: 100,
        dealCurrency: 'USD',
      })
      throw new Error('expected throw')
    } catch (err) {
      expect(err).toBeInstanceOf(DealPricingError)
      expect((err as DealPricingError).code).toBe('CURRENCY_MISMATCH')
    }
  })

  it('rejects missing listing price', () => {
    try {
      computeDealPrice({
        listingPrice: null,
        listingCurrency: 'NAD',
        discountType: 'PERCENTAGE',
        discountValue: 25,
      })
      throw new Error('expected throw')
    } catch (err) {
      expect((err as DealPricingError).code).toBe('DEAL_PRICE_UNAVAILABLE')
    }
  })

  it('rejects monetary discount on a zero listing', () => {
    try {
      computeDealPrice({
        listingPrice: 0,
        listingCurrency: 'NAD',
        discountType: 'PERCENTAGE',
        discountValue: 25,
      })
      throw new Error('expected throw')
    } catch (err) {
      expect((err as DealPricingError).code).toBe('LISTING_PRICE_ZERO')
    }
  })
})

describe('marketing preview deal prices', () => {
  it.each([
    { name: 'dinner 20%', listingPrice: '520.00', currency: 'NAD', discountType: 'PERCENTAGE' as const, discountValue: 20, original: '520.00', deal: '416.00', saving: '104.00', pct: 20 },
    { name: 'quad 15%', listingPrice: '900.00', currency: 'NAD', discountType: 'PERCENTAGE' as const, discountValue: 15, original: '900.00', deal: '765.00', saving: '135.00', pct: 15 },
    { name: 'catamaran 150 off', listingPrice: '1050.00', currency: 'NAD', discountType: 'FIXED_AMOUNT' as const, discountValue: 150, original: '1050.00', deal: '900.00', saving: '150.00', pct: 14.29 },
    { name: 'etosha 20%', listingPrice: '1450.00', currency: 'NAD', discountType: 'PERCENTAGE' as const, discountValue: 20, original: '1450.00', deal: '1160.00', saving: '290.00', pct: 20 },
    { name: 'desert stay 25%', listingPrice: '1600.00', currency: 'NAD', discountType: 'PERCENTAGE' as const, discountValue: 25, original: '1600.00', deal: '1200.00', saving: '400.00', pct: 25 },
    { name: 'sossusvlei 25%', listingPrice: '1200.00', currency: 'NAD', discountType: 'PERCENTAGE' as const, discountValue: 25, original: '1200.00', deal: '900.00', saving: '300.00', pct: 25 },
    { name: 'coastal stay 20%', listingPrice: '1350.00', currency: 'NAD', discountType: 'PERCENTAGE' as const, discountValue: 20, original: '1350.00', deal: '1080.00', saving: '270.00', pct: 20 },
    { name: 'lunch 80 off', listingPrice: '380.00', currency: 'NAD', discountType: 'FIXED_AMOUNT' as const, discountValue: 80, original: '380.00', deal: '300.00', saving: '80.00', pct: 21.05 },
    { name: 'cape sunset 20%', listingPrice: '750.00', currency: 'ZAR', discountType: 'PERCENTAGE' as const, discountValue: 20, original: '750.00', deal: '600.00', saving: '150.00', pct: 20 },
    { name: 'wine 15%', listingPrice: '680.00', currency: 'ZAR', discountType: 'PERCENTAGE' as const, discountValue: 15, original: '680.00', deal: '578.00', saving: '102.00', pct: 15 },
    { name: 'kayak 100 off', listingPrice: '650.00', currency: 'ZAR', discountType: 'FIXED_AMOUNT' as const, discountValue: 100, original: '650.00', deal: '550.00', saving: '100.00', pct: 15.38 },
    { name: 'city stay 20%', listingPrice: '1400.00', currency: 'ZAR', discountType: 'PERCENTAGE' as const, discountValue: 20, original: '1400.00', deal: '1120.00', saving: '280.00', pct: 20 },
  ])('$name', ({ listingPrice, currency, discountType, discountValue, original, deal, saving, pct }) => {
    const priced = computedPriceToDto(
      computeDealPrice({
        listingPrice,
        listingCurrency: currency,
        discountType,
        discountValue,
        dealCurrency: currency,
      }),
    )
    expect(priced.currency).toBe(currency)
    expect(priced.originalAmount).toBe(original)
    expect(priced.dealAmount).toBe(deal)
    expect(priced.savingAmount).toBe(saving)
    expect(priced.discountPercentage).toBe(pct)
  })
})
