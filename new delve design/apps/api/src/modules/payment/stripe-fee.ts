import type Stripe from 'stripe'
import { fromStripeAmount } from './stripe-amount.js'

/** Persist only Stripe-reported processing fees. Never invent a percentage formula. */
export function feeFromBalanceTransaction(bt: Stripe.BalanceTransaction | string | null | undefined) {
  if (!bt || typeof bt === 'string') return null
  const currency = bt.currency?.toUpperCase()
  if (!currency) return null
  return {
    fee: fromStripeAmount(bt.fee ?? 0, currency),
    net: fromStripeAmount(bt.net ?? 0, currency),
    gross: fromStripeAmount(bt.amount ?? 0, currency),
    balanceTransactionId: bt.id,
    currency,
  }
}

export function expandedChargeBalanceTransaction(
  charge: Stripe.Charge | string | null | undefined,
): Stripe.BalanceTransaction | null {
  if (!charge || typeof charge === 'string') return null
  const bt = charge.balance_transaction
  if (!bt || typeof bt === 'string') return null
  return bt
}
