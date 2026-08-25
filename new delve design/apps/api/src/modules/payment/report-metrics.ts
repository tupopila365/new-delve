import { Decimal } from '@delve/database/decimal'
import type { CurrencyFinancialSummary, PayableStatusBucket } from '@delve/contracts'
import { inPeriod, type ResolvedReportPeriod, utcDayKey } from './report-period.js'

const MONEY = 2

export const OUTSTANDING_PAYABLE_STATUSES = ['PENDING', 'ELIGIBLE', 'PROCESSING'] as const
export const OPEN_DISPUTE_STATUSES = ['NEEDS_RESPONSE', 'UNDER_REVIEW', 'WARNING'] as const
export const UNRESOLVED_DISPUTE_RECOVERY = ['RECOVERY_REQUIRED', 'RECOVERY_PENDING', 'MANUAL_REVIEW'] as const
export const UNRESOLVED_RECOVERY_STATUSES = ['OPEN', 'UNDER_REVIEW'] as const

export function moneyFixed(value: { toString(): string } | string | number): string {
  return new Decimal(value.toString()).toDecimalPlaces(MONEY, Decimal.ROUND_HALF_UP).toFixed(MONEY)
}

export function moneyOrNull(value: { toString(): string } | string | number | null | undefined): string | null {
  if (value == null) return null
  return moneyFixed(value)
}

export type PaymentAggRow = {
  id: string
  businessId: string
  bookingId?: string
  amount: { toString(): string }
  currency: string
  status: string
  paidAt: Date | null
  stripeFeeAmount: { toString(): string } | null
}

export type PayableAggRow = {
  paymentId: string
  businessId: string
  currency: string
  status: string
  grossAmount: { toString(): string }
  platformCommissionAmount: { toString(): string }
  businessNetAmount: { toString(): string }
  createdAt: Date
  transferredAt: Date | null
}

export type RefundAggRow = {
  amount: { toString(): string }
  currency: string
  status: string
  succeededAt: Date | null
  businessId: string
}

export type ReversalAggRow = {
  amount: { toString(): string }
  currency: string
  status: string
  succeededAt: Date | null
  businessId: string
}

export type DisputeAggRow = {
  amount: { toString(): string }
  currency: string
  status: string
  reason: string
  createdAt: Date
  wonAt: Date | null
  lostAt: Date | null
  stripeFeeAmount: { toString(): string } | null
  recoveryStatus: string
  businessId: string
}

export type RecoveryAggRow = {
  amount: { toString(): string }
  currency: string
  status: string
  type: string
  createdAt: Date
  businessId: string
}

type Acc = {
  gross: Decimal
  paidCount: number
  feeKnown: Decimal
  feeKnownCount: number
  feeUnknownCount: number
  commission: Decimal
  netFromPaid: Decimal
  outstanding: Decimal
  transferred: Decimal
  pending: Decimal
  eligible: Decimal
  processing: Decimal
  blocked: Decimal
  reversedSnapshot: Decimal
  refundsOk: Decimal
  refundsOkCount: number
  refundsProcessing: Decimal
  refundsFailedCount: number
  reversalsOk: Decimal
  reversalsOkCount: number
  reversalsFailedCount: number
  reversalsOutstanding: Decimal
  disputeOpened: Decimal
  disputeWon: Decimal
  disputeLost: Decimal
  disputeFeeKnown: Decimal
  disputeFeeKnownCount: number
  disputeFeeUnknownCount: number
  unresolvedDispute: Decimal
  unresolvedRecovery: Decimal
  unresolvedRecoveryCount: number
  reviewCount: number
}

function zero(): Decimal {
  return new Decimal(0)
}

function emptyAcc(): Acc {
  return {
    gross: zero(),
    paidCount: 0,
    feeKnown: zero(),
    feeKnownCount: 0,
    feeUnknownCount: 0,
    commission: zero(),
    netFromPaid: zero(),
    outstanding: zero(),
    transferred: zero(),
    pending: zero(),
    eligible: zero(),
    processing: zero(),
    blocked: zero(),
    reversedSnapshot: zero(),
    refundsOk: zero(),
    refundsOkCount: 0,
    refundsProcessing: zero(),
    refundsFailedCount: 0,
    reversalsOk: zero(),
    reversalsOkCount: 0,
    reversalsFailedCount: 0,
    reversalsOutstanding: zero(),
    disputeOpened: zero(),
    disputeWon: zero(),
    disputeLost: zero(),
    disputeFeeKnown: zero(),
    disputeFeeKnownCount: 0,
    disputeFeeUnknownCount: 0,
    unresolvedDispute: zero(),
    unresolvedRecovery: zero(),
    unresolvedRecoveryCount: 0,
    reviewCount: 0,
  }
}

function plus(a: Decimal, b: { toString(): string } | string | number): Decimal {
  return a.plus(new Decimal(b.toString()))
}

function getAcc(map: Map<string, Acc>, currency: string): Acc {
  const key = currency.toUpperCase()
  let acc = map.get(key)
  if (!acc) {
    acc = emptyAcc()
    map.set(key, acc)
  }
  return acc
}

export function aggregateCurrencySummaries(input: {
  period: ResolvedReportPeriod
  payments: PaymentAggRow[]
  payables: PayableAggRow[]
  refunds: RefundAggRow[]
  reversals: ReversalAggRow[]
  disputes: DisputeAggRow[]
  recoveries: RecoveryAggRow[]
  paymentsNeedingReview: Set<string>
  /** Restrict to one business for provider reports. */
  businessId?: string
}): CurrencyFinancialSummary[] {
  const map = new Map<string, Acc>()
  const biz = input.businessId

  for (const p of input.payments) {
    if (biz && p.businessId !== biz) continue
    if (p.status !== 'PAID' || !inPeriod(p.paidAt, input.period)) continue
    const acc = getAcc(map, p.currency)
    acc.gross = plus(acc.gross, p.amount)
    acc.paidCount += 1
    if (p.stripeFeeAmount == null) acc.feeUnknownCount += 1
    else {
      acc.feeKnown = plus(acc.feeKnown, p.stripeFeeAmount)
      acc.feeKnownCount += 1
    }
    if (input.paymentsNeedingReview.has(p.id)) acc.reviewCount += 1
  }

  const paidIds = new Set(
    input.payments
      .filter(p => (!biz || p.businessId === biz) && p.status === 'PAID' && inPeriod(p.paidAt, input.period))
      .map(p => p.id),
  )

  for (const row of input.payables) {
    if (biz && row.businessId !== biz) continue
    const acc = getAcc(map, row.currency)
    if (paidIds.has(row.paymentId)) {
      acc.commission = plus(acc.commission, row.platformCommissionAmount)
      acc.netFromPaid = plus(acc.netFromPaid, row.businessNetAmount)
    }
    if (inPeriod(row.transferredAt, input.period)) {
      acc.transferred = plus(acc.transferred, row.businessNetAmount)
    }
    if (row.status === 'PENDING') acc.pending = plus(acc.pending, row.businessNetAmount)
    else if (row.status === 'ELIGIBLE') acc.eligible = plus(acc.eligible, row.businessNetAmount)
    else if (row.status === 'PROCESSING') acc.processing = plus(acc.processing, row.businessNetAmount)
    else if (row.status === 'BLOCKED') acc.blocked = plus(acc.blocked, row.businessNetAmount)
    else if (row.status === 'REVERSED') acc.reversedSnapshot = plus(acc.reversedSnapshot, row.businessNetAmount)
    if ((OUTSTANDING_PAYABLE_STATUSES as readonly string[]).includes(row.status)) {
      acc.outstanding = plus(acc.outstanding, row.businessNetAmount)
    }
  }

  for (const row of input.refunds) {
    if (biz && row.businessId !== biz) continue
    const acc = getAcc(map, row.currency)
    if (row.status === 'SUCCEEDED' && inPeriod(row.succeededAt, input.period)) {
      acc.refundsOk = plus(acc.refundsOk, row.amount)
      acc.refundsOkCount += 1
    } else if (row.status === 'PROCESSING' || row.status === 'PENDING') {
      acc.refundsProcessing = plus(acc.refundsProcessing, row.amount)
    } else if (row.status === 'FAILED') {
      acc.refundsFailedCount += 1
    }
  }

  for (const row of input.reversals) {
    if (biz && row.businessId !== biz) continue
    const acc = getAcc(map, row.currency)
    if (row.status === 'SUCCEEDED' && inPeriod(row.succeededAt, input.period)) {
      acc.reversalsOk = plus(acc.reversalsOk, row.amount)
      acc.reversalsOkCount += 1
    } else if (row.status === 'FAILED') {
      acc.reversalsFailedCount += 1
    } else if (row.status === 'PENDING' || row.status === 'PROCESSING') {
      acc.reversalsOutstanding = plus(acc.reversalsOutstanding, row.amount)
    }
  }

  for (const row of input.disputes) {
    if (biz && row.businessId !== biz) continue
    const acc = getAcc(map, row.currency)
    if (inPeriod(row.createdAt, input.period)) acc.disputeOpened = plus(acc.disputeOpened, row.amount)
    if (inPeriod(row.wonAt, input.period)) acc.disputeWon = plus(acc.disputeWon, row.amount)
    if (inPeriod(row.lostAt, input.period)) acc.disputeLost = plus(acc.disputeLost, row.amount)
    const feePeriod = inPeriod(row.createdAt, input.period) || inPeriod(row.lostAt, input.period)
    if (feePeriod) {
      if (row.stripeFeeAmount == null) acc.disputeFeeUnknownCount += 1
      else {
        acc.disputeFeeKnown = plus(acc.disputeFeeKnown, row.stripeFeeAmount)
        acc.disputeFeeKnownCount += 1
      }
    }
    if ((UNRESOLVED_DISPUTE_RECOVERY as readonly string[]).includes(row.recoveryStatus)) {
      acc.unresolvedDispute = plus(acc.unresolvedDispute, row.amount)
    }
  }

  for (const row of input.recoveries) {
    if (biz && row.businessId !== biz) continue
    if (!(UNRESOLVED_RECOVERY_STATUSES as readonly string[]).includes(row.status)) continue
    const acc = getAcc(map, row.currency)
    acc.unresolvedRecovery = plus(acc.unresolvedRecovery, row.amount)
    acc.unresolvedRecoveryCount += 1
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, acc]) => {
      const feesUnknown = acc.feeUnknownCount > 0
      const disputeFeesUnknown = acc.disputeFeeUnknownCount > 0
      const stripeProcessingFees = acc.feeKnownCount === 0 && feesUnknown ? null : moneyFixed(acc.feeKnown)
      const disputeFees = acc.disputeFeeKnownCount === 0 && disputeFeesUnknown ? null : moneyFixed(acc.disputeFeeKnown)
      const contributionComplete = acc.feeUnknownCount === 0 && acc.disputeFeeUnknownCount === 0
      const contribution = acc.commission.minus(acc.feeKnown).minus(acc.disputeFeeKnown)
      return {
        currency,
        grossPayments: moneyFixed(acc.gross),
        successfulPaymentCount: acc.paidCount,
        stripeProcessingFees,
        stripeFeesKnownCount: acc.feeKnownCount,
        stripeFeesUnknownCount: acc.feeUnknownCount,
        platformCommission: moneyFixed(acc.commission),
        businessNetFromPaidPeriod: moneyFixed(acc.netFromPaid),
        outstandingBusinessAmount: moneyFixed(acc.outstanding),
        settlementsTransferred: moneyFixed(acc.transferred),
        settlementsPending: moneyFixed(acc.pending),
        settlementsEligible: moneyFixed(acc.eligible),
        settlementsProcessing: moneyFixed(acc.processing),
        settlementsBlocked: moneyFixed(acc.blocked),
        settlementsReversed: moneyFixed(acc.reversedSnapshot),
        refundsSucceeded: moneyFixed(acc.refundsOk),
        refundsSucceededCount: acc.refundsOkCount,
        refundsProcessingAmount: moneyFixed(acc.refundsProcessing),
        refundsFailedCount: acc.refundsFailedCount,
        transferReversalsSucceeded: moneyFixed(acc.reversalsOk),
        transferReversalsSucceededCount: acc.reversalsOkCount,
        transferReversalsFailedCount: acc.reversalsFailedCount,
        transferReversalsOutstandingAmount: moneyFixed(acc.reversalsOutstanding),
        disputeAmountOpened: moneyFixed(acc.disputeOpened),
        disputeAmountWon: moneyFixed(acc.disputeWon),
        disputeAmountLost: moneyFixed(acc.disputeLost),
        disputeFees,
        disputeFeesKnownCount: acc.disputeFeeKnownCount,
        disputeFeesUnknownCount: acc.disputeFeeUnknownCount,
        unresolvedDisputeExposure: moneyFixed(acc.unresolvedDispute),
        unresolvedRecoveryExposure: moneyFixed(acc.unresolvedRecovery),
        unresolvedRecoveryCaseCount: acc.unresolvedRecoveryCount,
        marketplaceContributionBeforeOperatingExpenses: contributionComplete ? moneyFixed(contribution) : null,
        marketplaceContributionComplete: contributionComplete,
        paymentsNeedingFinancialReviewCount: acc.reviewCount,
      }
    })
}

export function aggregatePayableBuckets(payables: PayableAggRow[], businessId?: string): PayableStatusBucket[] {
  const map = new Map<string, { count: number; gross: Decimal; fee: Decimal; net: Decimal }>()
  for (const row of payables) {
    if (businessId && row.businessId !== businessId) continue
    const key = `${row.status}:${row.currency.toUpperCase()}`
    let acc = map.get(key)
    if (!acc) {
      acc = { count: 0, gross: new Decimal(0), fee: new Decimal(0), net: new Decimal(0) }
      map.set(key, acc)
    }
    acc.count += 1
    acc.gross = plus(acc.gross, row.grossAmount)
    acc.fee = plus(acc.fee, row.platformCommissionAmount)
    acc.net = plus(acc.net, row.businessNetAmount)
  }
  return [...map.entries()]
    .map(([key, acc]) => {
      const [status, currency] = key.split(':')
      return {
        status: status as PayableStatusBucket['status'],
        currency,
        count: acc.count,
        grossAmount: moneyFixed(acc.gross),
        platformCommission: moneyFixed(acc.fee),
        businessNet: moneyFixed(acc.net),
      }
    })
    .sort((a, b) => a.currency.localeCompare(b.currency) || a.status.localeCompare(b.status))
}

export function trendPoints(input: {
  period: ResolvedReportPeriod
  payments: PaymentAggRow[]
  payables: PayableAggRow[]
  refunds: RefundAggRow[]
  businessId?: string
}): { date: string; currency: string; grossPayments: string; platformCommission: string; refundsSucceeded: string; settlementsTransferred: string }[] {
  const map = new Map<string, { gross: Decimal; commission: Decimal; refunds: Decimal; transferred: Decimal }>()
  const keyOf = (date: string, currency: string) => `${date}:${currency}`
  const bump = (date: string, currency: string) => {
    const k = keyOf(date, currency.toUpperCase())
    let acc = map.get(k)
    if (!acc) {
      acc = { gross: new Decimal(0), commission: new Decimal(0), refunds: new Decimal(0), transferred: new Decimal(0) }
      map.set(k, acc)
    }
    return acc
  }

  const paidIds = new Set<string>()
  for (const p of input.payments) {
    if (input.businessId && p.businessId !== input.businessId) continue
    if (p.status !== 'PAID' || !inPeriod(p.paidAt, input.period) || !p.paidAt) continue
    paidIds.add(p.id)
    bump(utcDayKey(p.paidAt), p.currency).gross = plus(bump(utcDayKey(p.paidAt), p.currency).gross, p.amount)
  }
  for (const row of input.payables) {
    if (input.businessId && row.businessId !== input.businessId) continue
    if (paidIds.has(row.paymentId)) {
      const payment = input.payments.find(p => p.id === row.paymentId)
      const day = payment?.paidAt ? utcDayKey(payment.paidAt) : utcDayKey(row.createdAt)
      bump(day, row.currency).commission = plus(bump(day, row.currency).commission, row.platformCommissionAmount)
    }
    if (inPeriod(row.transferredAt, input.period) && row.transferredAt) {
      bump(utcDayKey(row.transferredAt), row.currency).transferred = plus(
        bump(utcDayKey(row.transferredAt), row.currency).transferred,
        row.businessNetAmount,
      )
    }
  }
  for (const row of input.refunds) {
    if (input.businessId && row.businessId !== input.businessId) continue
    if (row.status !== 'SUCCEEDED' || !inPeriod(row.succeededAt, input.period) || !row.succeededAt) continue
    bump(utcDayKey(row.succeededAt), row.currency).refunds = plus(bump(utcDayKey(row.succeededAt), row.currency).refunds, row.amount)
  }

  return [...map.entries()]
    .map(([k, acc]) => {
      const [date, currency] = k.split(':')
      return {
        date,
        currency,
        grossPayments: moneyFixed(acc.gross),
        platformCommission: moneyFixed(acc.commission),
        refundsSucceeded: moneyFixed(acc.refunds),
        settlementsTransferred: moneyFixed(acc.transferred),
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.currency.localeCompare(b.currency))
}
