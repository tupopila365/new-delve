import type Stripe from 'stripe'
import { prisma } from '@delve/database'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import { requireStripe, requireStripeWebhookSecret } from './stripe-client.js'
import { syncBusinessConnectFromStripe } from './connect.service.js'
import {
  applyPaymentCancelled,
  applyPaymentFailed,
  applyPaymentProcessing,
  applySuccessfulPayment,
  findPaymentByStripeRefs,
} from './payment.service.js'
import { applyRefundStripeStatus } from './refund.service.js'
import { applyTransferReversedWebhook } from './transfer-reversal.service.js'

function metadataString(meta: Stripe.Metadata | null | undefined, key: string): string | null {
  const value = meta?.[key]
  return typeof value === 'string' && value.trim() ? value : null
}

function paymentIntentIdFrom(value: string | Stripe.PaymentIntent | null | undefined): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

async function rememberEvent(event: Stripe.Event): Promise<{ duplicate: boolean; rowId: string }> {
  try {
    const row = await prisma.paymentWebhookEvent.create({
      data: {
        provider: 'STRIPE',
        providerEventId: event.id,
        eventType: event.type,
      },
    })
    return { duplicate: false, rowId: row.id }
  } catch {
    const existing = await prisma.paymentWebhookEvent.findUnique({
      where: { provider_providerEventId: { provider: 'STRIPE', providerEventId: event.id } },
    })
    if (existing?.processedAt) return { duplicate: true, rowId: existing.id }
    if (existing) return { duplicate: false, rowId: existing.id }
    throw new AppError(500, 'WEBHOOK_DEDUP_FAILED', 'Could not record Stripe webhook event.')
  }
}

async function markProcessed(rowId: string) {
  await prisma.paymentWebhookEvent.update({
    where: { id: rowId },
    data: { processedAt: new Date() },
  })
}

export async function handleStripeWebhook(env: Env, rawBody: Buffer, signature: string) {
  const secret = requireStripeWebhookSecret(env)
  const stripe = requireStripe(env)
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch {
    throw new AppError(400, 'STRIPE_SIGNATURE_INVALID', 'Invalid Stripe webhook signature.')
  }

  const receipt = await rememberEvent(event)
  if (receipt.duplicate) return { received: true, duplicate: true }

  try {
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        const businessId = metadataString(account.metadata, 'businessId')
        if (businessId) await syncBusinessConnectFromStripe(env, businessId)
        break
      }
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const payment = await findPaymentByStripeRefs({
          paymentId: metadataString(session.metadata, 'paymentId'),
          paymentIntentId: paymentIntentIdFrom(session.payment_intent),
          checkoutSessionId: session.id,
        })
        if (payment) {
          const piId = paymentIntentIdFrom(session.payment_intent)
          await applyPaymentProcessing(payment.id, piId)
          if (piId) {
            const pi = await stripe.paymentIntents.retrieve(piId)
            if (pi.status === 'succeeded') await applySuccessfulPayment(env, payment.id)
            else if (pi.status === 'processing' || pi.status === 'requires_action' || pi.status === 'requires_capture') {
              await applyPaymentProcessing(payment.id, pi.id)
            }
          }
        }
        break
      }
      case 'payment_intent.processing': {
        const pi = event.data.object as Stripe.PaymentIntent
        const payment = await findPaymentByStripeRefs({
          paymentId: metadataString(pi.metadata, 'paymentId'),
          paymentIntentId: pi.id,
        })
        if (payment) await applyPaymentProcessing(payment.id, pi.id)
        break
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id
        const payment = await findPaymentByStripeRefs({
          paymentId: metadataString(pi.metadata, 'paymentId'),
          paymentIntentId: pi.id,
        })
        if (payment) {
          await applyPaymentProcessing(payment.id, pi.id, chargeId)
          await applySuccessfulPayment(env, payment.id)
        }
        break
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const payment = await findPaymentByStripeRefs({
          paymentId: metadataString(pi.metadata, 'paymentId'),
          paymentIntentId: pi.id,
        })
        if (payment) {
          await applyPaymentFailed(payment.id, {
            code: pi.last_payment_error?.code ?? 'payment_failed',
            message: pi.last_payment_error?.message ?? 'Payment failed',
          })
        }
        break
      }
      case 'payment_intent.canceled': {
        const pi = event.data.object as Stripe.PaymentIntent
        const payment = await findPaymentByStripeRefs({
          paymentId: metadataString(pi.metadata, 'paymentId'),
          paymentIntentId: pi.id,
        })
        if (payment) await applyPaymentCancelled(payment.id)
        break
      }
      case 'refund.created':
      case 'refund.updated':
      case 'refund.failed':
      case 'charge.refunded': {
        const obj = event.data.object as Stripe.Refund | Stripe.Charge
        let stripeRefund: Stripe.Refund | undefined =
          obj.object === 'refund' ? (obj as Stripe.Refund) : (obj as Stripe.Charge).refunds?.data?.[0]
        if (!stripeRefund && event.type === 'charge.refunded') {
          const charge = obj as Stripe.Charge
          const listed = await stripe.refunds.list({ charge: charge.id, limit: 5 })
          stripeRefund = listed.data[0]
        }
        if (stripeRefund) {
          const refundId = metadataString(stripeRefund.metadata, 'refundId')
          const byStripe = stripeRefund.id
            ? await prisma.refund.findUnique({ where: { stripeRefundId: stripeRefund.id } })
            : null
          const refund = refundId
            ? await prisma.refund.findUnique({ where: { id: refundId } })
            : byStripe
          if (refund) {
            await applyRefundStripeStatus(
              env,
              refund.id,
              stripeRefund.status || (event.type === 'charge.refunded' ? 'succeeded' : 'pending'),
              stripeRefund.id,
              {
                code: stripeRefund.failure_reason ?? null,
                message: stripeRefund.failure_reason ?? null,
              },
            )
          }
        }
        break
      }
      case 'transfer.reversed': {
        const transfer = event.data.object as Stripe.Transfer
        const nested = transfer.reversals?.data?.[0]
        await applyTransferReversedWebhook(
          transfer.id,
          nested?.id ?? null,
          metadataString(nested?.metadata, 'transferReversalId') || metadataString(transfer.metadata, 'transferReversalId'),
        )
        break
      }
      default:
        break
    }
    await markProcessed(receipt.rowId)
  } catch (err) {
    throw err
  }

  return { received: true, duplicate: false }
}
