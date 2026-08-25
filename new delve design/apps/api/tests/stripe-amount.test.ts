import { describe, expect, it } from 'vitest'
import { Decimal } from '@delve/database/decimal'
import {
  fromStripeAmount,
  netAfterPlatformFee,
  platformFeeAmount,
  stripeCurrencyExponent,
  toStripeAmount,
} from '../src/modules/payment/stripe-amount.js'

describe('stripe amount conversion', () => {
  it('converts NAD 900.00 to 90000', () => {
    expect(stripeCurrencyExponent('NAD')).toBe(2)
    expect(toStripeAmount('900.00', 'NAD')).toBe(90000)
    expect(toStripeAmount(new Decimal('900.00'), 'nad')).toBe(90000)
    expect(fromStripeAmount(90000, 'NAD').toFixed(2)).toBe('900.00')
  })

  it('keeps JPY as a zero-decimal currency', () => {
    expect(stripeCurrencyExponent('JPY')).toBe(0)
    expect(toStripeAmount('900', 'JPY')).toBe(900)
    expect(fromStripeAmount(900, 'JPY').toFixed(0)).toBe('900')
  })

  it('uses three decimals for KWD', () => {
    expect(stripeCurrencyExponent('KWD')).toBe(3)
    expect(toStripeAmount('1.234', 'KWD')).toBe(1234)
  })

  it('computes a 10% platform fee with decimal math', () => {
    const fee = platformFeeAmount('900.00', 1000)
    expect(fee.toFixed(2)).toBe('90.00')
    expect(netAfterPlatformFee('900.00', 1000).toFixed(2)).toBe('810.00')
  })
})
