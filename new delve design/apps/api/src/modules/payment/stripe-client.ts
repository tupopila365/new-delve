import Stripe from 'stripe'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'

export function requireStripe(env: Env): Stripe {
  const key = env.STRIPE_SECRET_KEY?.trim()
  if (!key) {
    throw new AppError(
      503,
      'STRIPE_NOT_CONFIGURED',
      'Stripe is not configured yet. Delve has not activated a production platform account.',
    )
  }
  return new Stripe(key)
}

export function requireStripeWebhookSecret(env: Env): string {
  const secret = env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!secret) {
    throw new AppError(503, 'STRIPE_NOT_CONFIGURED', 'Stripe webhook secret is not configured.')
  }
  return secret
}
