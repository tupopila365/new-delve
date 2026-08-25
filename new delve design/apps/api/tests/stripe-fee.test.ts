import { describe, expect, it } from 'vitest'
import { feeFromBalanceTransaction } from '../src/modules/payment/stripe-fee.js'
import { Decimal } from '@delve/database/decimal'

describe('authoritative Stripe fees', () => {
  it('reads fee/net/gross from a Stripe Balance Transaction and does not invent a rate', () => {
    const result = feeFromBalanceTransaction({
      id: 'txn_1',
      object: 'balance_transaction',
      amount: 100000,
      fee: 3200,
      net: 96800,
      currency: 'nad',
    } as never)
    expect(result?.balanceTransactionId).toBe('txn_1')
    expect(result?.fee.toFixed(2)).toBe('32.00')
    expect(result?.net.toFixed(2)).toBe('968.00')
    expect(result?.gross.toFixed(2)).toBe('1000.00')
    const invented = new Decimal('1000').mul('0.029').plus('0.30')
    expect(result?.fee.eq(invented)).toBe(false)
  })

  it('returns null when Stripe has not expanded the balance transaction', () => {
    expect(feeFromBalanceTransaction('txn_unexpanded')).toBeNull()
    expect(feeFromBalanceTransaction(null)).toBeNull()
  })
})
