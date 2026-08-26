import { prisma } from '@delve/database'
import { Decimal } from '@delve/database/decimal'
import type { StripeConnectStatusDto } from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import { requireBusinessMembership } from '../business/business.service.js'
import { writeAdminAudit } from '../admin/admin-audit.js'
import { requireStripe } from './stripe-client.js'
import { fromStripeAmount } from './stripe-amount.js'
import { isSettlementReady, mapStripeAccountStatus } from './stripe-connect-status.js'

const FINANCE_ROLES = ['OWNER', 'MANAGER'] as const

function connectCountry(env: Env, businessCountry: string | null): string {
  const fromBusiness = businessCountry?.trim().toUpperCase()
  if (fromBusiness && fromBusiness.length === 2) return fromBusiness
  const fromEnv = env.STRIPE_CONNECT_COUNTRY?.trim().toUpperCase()
  if (fromEnv && fromEnv.length === 2) return fromEnv
  throw new AppError(
    400,
    'BUSINESS_COUNTRY_REQUIRED',
    'Set the business country before Stripe onboarding. Delve will not assume a platform account country.',
  )
}

async function persistAccount(
  businessId: string,
  accountId: string,
  mapped: ReturnType<typeof mapStripeAccountStatus>,
  previousCompletedAt: Date | null,
) {
  const onboardingDone =
    mapped.stripeDetailsSubmitted && (mapped.stripeAccountStatus === 'ACTIVE' || mapped.stripeAccountStatus === 'RESTRICTED')
  return prisma.business.update({
    where: { id: businessId },
    data: {
      stripeAccountId: accountId,
      stripeAccountStatus: mapped.stripeAccountStatus,
      stripeChargesEnabled: mapped.stripeChargesEnabled,
      stripePayoutsEnabled: mapped.stripePayoutsEnabled,
      stripeDetailsSubmitted: mapped.stripeDetailsSubmitted,
      ...(onboardingDone && !previousCompletedAt ? { stripeOnboardingCompletedAt: new Date() } : {}),
    },
  })
}

export async function syncBusinessConnectFromStripe(env: Env, businessId: string): Promise<StripeConnectStatusDto> {
  const business = await prisma.business.findUnique({ where: { id: businessId } })
  if (!business) throw new AppError(404, 'NOT_FOUND', 'Business not found.')
  if (!business.stripeAccountId) {
    return {
      status: 'NOT_CONNECTED',
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      requirementsDueCount: 0,
      settlementReady: false,
      onboardingCompletedAt: null,
    }
  }
  const stripe = requireStripe(env)
  const account = await stripe.accounts.retrieve(business.stripeAccountId)
  const mapped = mapStripeAccountStatus(account)
  const saved = await persistAccount(business.id, account.id, mapped, business.stripeOnboardingCompletedAt)
  return {
    status: mapped.stripeAccountStatus,
    chargesEnabled: mapped.stripeChargesEnabled,
    payoutsEnabled: mapped.stripePayoutsEnabled,
    detailsSubmitted: mapped.stripeDetailsSubmitted,
    requirementsDueCount: mapped.requirementsDueCount,
    settlementReady: isSettlementReady(mapped),
    onboardingCompletedAt: saved.stripeOnboardingCompletedAt?.toISOString() ?? null,
  }
}

export async function getConnectStatus(
  env: Env,
  userId: string,
  businessId: string,
): Promise<StripeConnectStatusDto> {
  await requireBusinessMembership(userId, businessId, [...FINANCE_ROLES])
  try {
    return await syncBusinessConnectFromStripe(env, businessId)
  } catch (err) {
    if (err instanceof AppError && err.code === 'STRIPE_NOT_CONFIGURED') {
      const business = await prisma.business.findUnique({ where: { id: businessId } })
      if (!business) throw new AppError(404, 'NOT_FOUND', 'Business not found.')
      return {
        status: business.stripeAccountStatus,
        chargesEnabled: business.stripeChargesEnabled,
        payoutsEnabled: business.stripePayoutsEnabled,
        detailsSubmitted: business.stripeDetailsSubmitted,
        requirementsDueCount: 0,
        settlementReady: isSettlementReady({
          stripeAccountStatus: business.stripeAccountStatus,
          stripePayoutsEnabled: business.stripePayoutsEnabled,
          stripeChargesEnabled: business.stripeChargesEnabled,
        }),
        onboardingCompletedAt: business.stripeOnboardingCompletedAt?.toISOString() ?? null,
      }
    }
    throw err
  }
}

export async function createConnectOnboardingLink(
  env: Env,
  userId: string,
  businessId: string,
): Promise<{ url: string; status: StripeConnectStatusDto['status'] }> {
  await requireBusinessMembership(userId, businessId, [...FINANCE_ROLES])
  const business = await prisma.business.findUnique({ where: { id: businessId } })
  if (!business) throw new AppError(404, 'NOT_FOUND', 'Business not found.')
  const stripe = requireStripe(env)
  const country = connectCountry(env, business.countryCode)

  let accountId = business.stripeAccountId
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country,
      email: business.email ?? undefined,
      capabilities: { transfers: { requested: true } },
      metadata: { businessId: business.id },
    })
    accountId = account.id
    await persistAccount(business.id, account.id, mapStripeAccountStatus(account), business.stripeOnboardingCompletedAt)
    await writeAdminAudit({
      action: 'STRIPE_CONNECT_ONBOARDED',
      outcome: 'success',
      actorUserId: userId,
      targetType: 'business',
      targetId: businessId,
      metadata: { stripeAccountId: accountId },
    })
  }

  const origin = env.TRAVELER_WEB_URL.replace(/\/$/, '')
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/provider?connect=refresh`,
    return_url: `${origin}/provider?connect=return`,
    type: 'account_onboarding',
  })
  if (!link.url) {
    throw new AppError(502, 'STRIPE_ONBOARDING_FAILED', 'Stripe did not return an onboarding URL.')
  }

  const status = await syncBusinessConnectFromStripe(env, businessId)
  return { url: link.url, status: status.status }
}

/** Used when applying settlement eligibility after a payment. Not a bank balance. */
export function businessIsSettlementReady(row: {
  stripeAccountStatus: StripeConnectStatusDto['status']
  stripePayoutsEnabled: boolean
  stripeChargesEnabled: boolean
}): boolean {
  return isSettlementReady(row)
}

/** Advisory only. Stripe reversal/transfer results remain authoritative. Not shown to providers. */
export async function connectedAccountBalanceWarning(
  env: Env,
  connectedAccountId: string,
  currency: string,
  amount: Decimal | string,
) {
  const stripe = requireStripe(env)
  const needed = new Decimal(amount.toString())
  try {
    const balance = await stripe.balance.retrieve({ stripeAccount: connectedAccountId })
    const available = balance.available.find(b => b.currency.toUpperCase() === currency.toUpperCase())
    if (!available) return 'Connected account available balance for this currency was not returned.'
    const have = fromStripeAmount(available.amount, currency)
    if (have.lt(needed)) {
      return 'Connected account may not currently have sufficient available balance. Stripe reversal result remains authoritative.'
    }
    return null
  } catch {
    return 'Could not read connected account balance. Stripe reversal result remains authoritative.'
  }
}

export async function adminRefreshConnectStatus(env: Env, businessId: string): Promise<StripeConnectStatusDto> {
  try {
    return await syncBusinessConnectFromStripe(env, businessId)
  } catch (err) {
    if (err instanceof AppError && err.code === 'STRIPE_NOT_CONFIGURED') {
      const business = await prisma.business.findUnique({ where: { id: businessId } })
      if (!business) throw new AppError(404, 'NOT_FOUND', 'Business not found.')
      return {
        status: business.stripeAccountStatus,
        chargesEnabled: business.stripeChargesEnabled,
        payoutsEnabled: business.stripePayoutsEnabled,
        detailsSubmitted: business.stripeDetailsSubmitted,
        requirementsDueCount: 0,
        settlementReady: isSettlementReady({
          stripeAccountStatus: business.stripeAccountStatus,
          stripePayoutsEnabled: business.stripePayoutsEnabled,
          stripeChargesEnabled: business.stripeChargesEnabled,
        }),
        onboardingCompletedAt: business.stripeOnboardingCompletedAt?.toISOString() ?? null,
      }
    }
    throw err
  }
}
