import { prisma } from '@delve/database'
import { Decimal } from '@delve/database/decimal'
import type {
  BookingFinancialSummaryDto,
  BusinessPerformanceRow,
  CurrencyFinancialSummary,
  DailyPlatformReportDto,
  FinancialExportKind,
  FinancialTrendDto,
  MonthlyPlatformReportDto,
  PaginatedBookingFinancialReportDto,
  PlatformFinancialReportDto,
  ProviderFinancialReportDto,
} from '@delve/contracts'
import type { Env } from '../../config/env.js'
import { AppError } from '../../middleware/error-handler.js'
import { requireBusinessMembership } from '../business/business.service.js'
import { fromStripeAmount } from './stripe-amount.js'
import { requireStripe } from './stripe-client.js'
import { buildFinancialTimeline } from './financial-timeline.js'
import { assertExportRowLimit, csvMoney, toCsv } from './financial-report-csv.js'
import {
  aggregateCurrencySummaries,
  aggregatePayableBuckets,
  moneyFixed,
  moneyOrNull,
  trendPoints,
  UNRESOLVED_RECOVERY_STATUSES,
  type DisputeAggRow,
  type PayableAggRow,
  type PaymentAggRow,
  type RecoveryAggRow,
  type RefundAggRow,
  type ReversalAggRow,
} from './report-metrics.js'
import { REPORT_EXPORT_MAX_ROWS, resolveReportPeriod, type ResolvedReportPeriod } from './report-period.js'

const PROVIDER_REPORT_ROLES = ['OWNER', 'MANAGER'] as const

type QueryPeriod = { preset?: string; from?: string; to?: string; currency?: string }

type LoadedSource = {
  period: ResolvedReportPeriod
  payments: PaymentAggRow[]
  payables: PayableAggRow[]
  refunds: RefundAggRow[]
  reversals: ReversalAggRow[]
  disputes: DisputeAggRow[]
  recoveries: RecoveryAggRow[]
  paymentsNeedingReview: Set<string>
  unmatchedOpenCount: number
  openCriticalIssueCount: number
}

function periodDto(period: ResolvedReportPeriod) {
  return { preset: period.preset, from: period.from.toISOString(), toExclusive: period.toExclusive.toISOString() }
}

function filterCurrency<T extends { currency: string }>(rows: T[], currency?: string): T[] {
  if (!currency || currency === 'ALL') return rows
  const code = currency.toUpperCase()
  return rows.filter(r => r.currency.toUpperCase() === code)
}

async function loadSource(period: ResolvedReportPeriod, businessId?: string): Promise<LoadedSource> {
  const biz = businessId ? { businessId } : {}
  const [
    payments,
    payables,
    refunds,
    reversals,
    disputes,
    recoveries,
    unmatchedOpenCount,
    criticalIssues,
  ] = await Promise.all([
    prisma.payment.findMany({
      where: {
        ...biz,
        status: 'PAID',
        paidAt: { gte: period.from, lt: period.toExclusive },
      },
      select: {
        id: true,
        businessId: true,
        bookingId: true,
        amount: true,
        currency: true,
        status: true,
        paidAt: true,
        stripeFeeAmount: true,
      },
    }),
    prisma.businessPayable.findMany({
      where: biz,
      select: {
        paymentId: true,
        businessId: true,
        currency: true,
        status: true,
        grossAmount: true,
        platformCommissionAmount: true,
        businessNetAmount: true,
        createdAt: true,
        transferredAt: true,
      },
    }),
    prisma.refund.findMany({
      where: biz,
      select: { amount: true, currency: true, status: true, succeededAt: true, businessId: true },
    }),
    prisma.transferReversal.findMany({
      where: biz,
      select: { amount: true, currency: true, status: true, succeededAt: true, businessId: true },
    }),
    prisma.paymentDispute.findMany({
      where: biz,
      select: {
        amount: true,
        currency: true,
        status: true,
        reason: true,
        createdAt: true,
        wonAt: true,
        lostAt: true,
        stripeFeeAmount: true,
        recoveryStatus: true,
        businessId: true,
      },
    }),
    prisma.financialRecoveryCase.findMany({
      where: biz,
      select: { amount: true, currency: true, status: true, type: true, createdAt: true, businessId: true },
    }),
    prisma.unmatchedStripeFinancialEvent.count({ where: { status: 'OPEN' } }),
    prisma.financialReconciliationIssue.findMany({
      where: { status: 'OPEN', severity: 'CRITICAL', paymentId: { not: null } },
      select: { paymentId: true },
    }),
  ])

  return {
    period,
    payments,
    payables,
    refunds,
    reversals,
    disputes,
    recoveries,
    paymentsNeedingReview: new Set(criticalIssues.map(i => i.paymentId!).filter(Boolean)),
    unmatchedOpenCount: businessId ? 0 : unmatchedOpenCount,
    openCriticalIssueCount: businessId ? 0 : criticalIssues.length,
  }
}

async function stripePlatformBalance(env: Env) {
  try {
    const stripe = requireStripe(env)
    const balance = await stripe.balance.retrieve()
    const currencies = new Set([...balance.available.map(b => b.currency), ...balance.pending.map(b => b.currency)])
    return [...currencies].sort().map(currency => {
      const code = currency.toUpperCase()
      const available = balance.available.find(b => b.currency === currency)?.amount ?? 0
      const pending = balance.pending.find(b => b.currency === currency)?.amount ?? 0
      return {
        currency: code,
        available: moneyFixed(fromStripeAmount(available, code)),
        pending: moneyFixed(fromStripeAmount(pending, code)),
      }
    })
  } catch {
    return null
  }
}

async function connectedBalances(env: Env, stripeAccountId: string | null) {
  if (!stripeAccountId) return null
  try {
    const stripe = requireStripe(env)
    const balance = await stripe.balance.retrieve({ stripeAccount: stripeAccountId })
    const currencies = new Set([...balance.available.map(b => b.currency), ...balance.pending.map(b => b.currency)])
    return [...currencies].sort().map(currency => {
      const code = currency.toUpperCase()
      const available = balance.available.find(b => b.currency === currency)?.amount ?? 0
      const pending = balance.pending.find(b => b.currency === currency)?.amount ?? 0
      return {
        currency: code,
        available: moneyFixed(fromStripeAmount(available, code)),
        pending: moneyFixed(fromStripeAmount(pending, code)),
      }
    })
  } catch {
    return null
  }
}

function summariesFrom(source: LoadedSource, currency?: string): CurrencyFinancialSummary[] {
  const rows = aggregateCurrencySummaries({
    period: source.period,
    payments: filterCurrency(source.payments, currency),
    payables: filterCurrency(source.payables, currency),
    refunds: filterCurrency(source.refunds, currency),
    reversals: filterCurrency(source.reversals, currency),
    disputes: filterCurrency(source.disputes, currency),
    recoveries: filterCurrency(source.recoveries, currency),
    paymentsNeedingReview: source.paymentsNeedingReview,
  })
  if (currency && currency !== 'ALL') return rows.filter(r => r.currency === currency.toUpperCase())
  return rows
}

export async function adminPlatformFinancialReport(
  env: Env,
  query: QueryPeriod,
): Promise<PlatformFinancialReportDto> {
  const period = resolveReportPeriod(query)
  const source = await loadSource(period)
  const byCurrency = summariesFrom(source, query.currency)
  const recoveryAgg = new Map<string, { count: number; amount: Decimal }>()
  for (const row of source.recoveries) {
    if (query.currency && query.currency !== 'ALL' && row.currency.toUpperCase() !== query.currency.toUpperCase()) continue
    const key = `${row.type}:${row.status}:${row.currency}`
    const acc = recoveryAgg.get(key) || { count: 0, amount: new Decimal(0) }
    acc.count += 1
    acc.amount = acc.amount.plus(row.amount.toString())
    recoveryAgg.set(key, acc)
  }
  const recoveryByType = [...recoveryAgg.entries()].map(([key, acc]) => {
    const [type, status, currency] = key.split(':')
    return {
      type,
      status: status as PlatformFinancialReportDto['recoveryByType'][number]['status'],
      currency,
      count: acc.count,
      amount: moneyFixed(acc.amount),
    }
  })

  const statusCounts = new Map<string, number>()
  const reasonCounts = new Map<string, number>()
  for (const d of source.disputes) {
    statusCounts.set(d.status, (statusCounts.get(d.status) || 0) + 1)
    reasonCounts.set(d.reason, (reasonCounts.get(d.reason) || 0) + 1)
  }

  return {
    period: periodDto(period),
    stripePlatformBalance: await stripePlatformBalance(env),
    unmatchedOpenCount: source.unmatchedOpenCount,
    openCriticalReconciliationIssueCount: source.openCriticalIssueCount,
    byCurrency,
    payableBuckets: aggregatePayableBuckets(
      query.currency && query.currency !== 'ALL'
        ? source.payables.filter(p => p.currency.toUpperCase() === query.currency!.toUpperCase())
        : source.payables,
    ),
    recoveryByType,
    disputesByStatus: [...statusCounts.entries()].map(([status, count]) => ({ status, count })),
    disputesByReason: [...reasonCounts.entries()].map(([reason, count]) => ({ reason, count })),
  }
}

export async function adminFinancialTrend(query: QueryPeriod): Promise<FinancialTrendDto> {
  const period = resolveReportPeriod(query)
  const source = await loadSource(period)
  let points = trendPoints({
    period,
    payments: source.payments,
    payables: source.payables,
    refunds: source.refunds,
  })
  if (query.currency && query.currency !== 'ALL') {
    points = points.filter(p => p.currency === query.currency!.toUpperCase())
  }
  return { period: periodDto(period), points }
}

export async function adminBusinessPerformance(query: QueryPeriod): Promise<BusinessPerformanceRow[]> {
  const period = resolveReportPeriod(query)
  const source = await loadSource(period)
  const businessIds = [...new Set(source.payments.map(p => p.businessId))]
  const businesses = businessIds.length
    ? await prisma.business.findMany({
        where: { id: { in: businessIds } },
        select: { id: true, name: true },
      })
    : []
  const names = new Map(businesses.map(b => [b.id, b.name]))
  type Acc = {
    bookingIds: Set<string>
    gross: Decimal
    commission: Decimal
    net: Decimal
    transferred: Decimal
    pending: Decimal
    refunds: Decimal
    disputes: Decimal
    recovery: Decimal
  }
  const map = new Map<string, Acc>()
  const key = (businessId: string, currency: string) => `${businessId}:${currency}`
  const accOf = (businessId: string, currency: string): Acc => {
    const k = key(businessId, currency.toUpperCase())
    let acc = map.get(k)
    if (!acc) {
      acc = {
        bookingIds: new Set(),
        gross: new Decimal(0),
        commission: new Decimal(0),
        net: new Decimal(0),
        transferred: new Decimal(0),
        pending: new Decimal(0),
        refunds: new Decimal(0),
        disputes: new Decimal(0),
        recovery: new Decimal(0),
      }
      map.set(k, acc)
    }
    return acc
  }

  const paidById = new Map(source.payments.map(p => [p.id, p]))

  for (const p of source.payments) {
    if (query.currency && query.currency !== 'ALL' && p.currency.toUpperCase() !== query.currency.toUpperCase()) continue
    const acc = accOf(p.businessId, p.currency)
    acc.gross = acc.gross.plus(p.amount.toString())
    if (p.bookingId) acc.bookingIds.add(p.bookingId)
  }
  for (const row of source.payables) {
    if (query.currency && query.currency !== 'ALL' && row.currency.toUpperCase() !== query.currency.toUpperCase()) continue
    const acc = accOf(row.businessId, row.currency)
    if (paidById.has(row.paymentId)) {
      acc.commission = acc.commission.plus(row.platformCommissionAmount.toString())
      acc.net = acc.net.plus(row.businessNetAmount.toString())
    }
    if (row.transferredAt && row.transferredAt >= period.from && row.transferredAt < period.toExclusive) {
      acc.transferred = acc.transferred.plus(row.businessNetAmount.toString())
    }
    if (row.status === 'PENDING' || row.status === 'ELIGIBLE' || row.status === 'PROCESSING') {
      acc.pending = acc.pending.plus(row.businessNetAmount.toString())
    }
  }
  for (const row of source.refunds) {
    if (query.currency && query.currency !== 'ALL' && row.currency.toUpperCase() !== query.currency.toUpperCase()) continue
    if (row.status !== 'SUCCEEDED' || !row.succeededAt || row.succeededAt < period.from || row.succeededAt >= period.toExclusive) continue
    accOf(row.businessId, row.currency).refunds = accOf(row.businessId, row.currency).refunds.plus(row.amount.toString())
  }
  for (const row of source.disputes) {
    if (query.currency && query.currency !== 'ALL' && row.currency.toUpperCase() !== query.currency.toUpperCase()) continue
    if (row.createdAt < period.from || row.createdAt >= period.toExclusive) continue
    accOf(row.businessId, row.currency).disputes = accOf(row.businessId, row.currency).disputes.plus(row.amount.toString())
  }
  for (const row of source.recoveries) {
    if (query.currency && query.currency !== 'ALL' && row.currency.toUpperCase() !== query.currency.toUpperCase()) continue
    if (!(UNRESOLVED_RECOVERY_STATUSES as readonly string[]).includes(row.status)) continue
    accOf(row.businessId, row.currency).recovery = accOf(row.businessId, row.currency).recovery.plus(row.amount.toString())
  }

  return [...map.entries()]
    .map(([k, acc]) => {
      const [businessId, currency] = k.split(':')
      return {
        businessId,
        businessName: names.get(businessId) || businessId,
        currency,
        bookingCount: acc.bookingIds.size,
        grossBookingValue: moneyFixed(acc.gross),
        platformCommission: moneyFixed(acc.commission),
        businessNet: moneyFixed(acc.net),
        transferred: moneyFixed(acc.transferred),
        pending: moneyFixed(acc.pending),
        refundAmount: moneyFixed(acc.refunds),
        disputeAmount: moneyFixed(acc.disputes),
        unresolvedRecoveryExposure: moneyFixed(acc.recovery),
      }
    })
    .sort((a, b) => Number(b.grossBookingValue) - Number(a.grossBookingValue) || a.businessName.localeCompare(b.businessName))
}

export async function adminBookingFinancialTable(
  query: QueryPeriod & { page?: string; pageSize?: string },
): Promise<PaginatedBookingFinancialReportDto> {
  const period = resolveReportPeriod(query)
  const page = Math.max(1, Number(query.page || 1) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 25) || 25))
  const currency = query.currency && query.currency !== 'ALL' ? query.currency.toUpperCase() : undefined
  const where = {
    status: 'PAID' as const,
    paidAt: { gte: period.from, lt: period.toExclusive },
    ...(currency ? { currency } : {}),
  }
  const [total, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: { paidAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        booking: { select: { bookingReference: true, createdAt: true, completedAt: true, user: { select: { username: true } } } },
        business: { select: { id: true, name: true } },
        payable: true,
        refunds: true,
        paymentDisputes: { orderBy: { createdAt: 'desc' }, take: 1 },
        financialRecoveryCases: true,
      },
    }),
  ])
  const reviewIds = new Set(
    (
      await prisma.financialReconciliationIssue.findMany({
        where: {
          status: 'OPEN',
          severity: 'CRITICAL',
          paymentId: { in: payments.map(p => p.id) },
        },
        select: { paymentId: true },
      })
    )
      .map(i => i.paymentId)
      .filter((id): id is string => Boolean(id)),
  )

  return {
    period: periodDto(period),
    page,
    pageSize,
    total,
    rows: payments.map(p => {
      const succeededRefunds = p.refunds.filter(r => r.status === 'SUCCEEDED')
      const refundAmount = succeededRefunds.reduce((s, r) => s.plus(r.amount.toString()), new Decimal(0))
      const openRecovery = p.financialRecoveryCases.filter(c => (UNRESOLVED_RECOVERY_STATUSES as readonly string[]).includes(c.status))
      const recovery = openRecovery.reduce((s, r) => s.plus(r.amount.toString()), new Decimal(0))
      const dispute = p.paymentDisputes[0]
      return {
        bookingId: p.bookingId,
        bookingReference: p.booking.bookingReference,
        businessId: p.business.id,
        businessName: p.business.name,
        travelerUsername: p.booking.user.username,
        paymentStatus: p.status,
        grossAmount: moneyFixed(p.amount),
        currency: p.currency,
        stripeFeeAmount: moneyOrNull(p.stripeFeeAmount),
        stripeFeeUnknown: p.stripeFeeAmount == null,
        platformCommissionAmount: p.payable ? moneyFixed(p.payable.platformCommissionAmount) : null,
        businessNetAmount: p.payable ? moneyFixed(p.payable.businessNetAmount) : null,
        settlementStatus: p.payable?.status ?? null,
        refundAmount: moneyFixed(refundAmount),
        refundState: succeededRefunds.length ? 'SUCCEEDED' : p.refunds[0]?.status ?? 'NONE',
        disputeStatus: dispute?.status ?? null,
        disputeAmount: dispute ? moneyFixed(dispute.amount) : null,
        recoveryExposure: moneyFixed(recovery),
        needsFinancialReview: reviewIds.has(p.id),
        createdAt: p.booking.createdAt.toISOString(),
        paidAt: p.paidAt?.toISOString() ?? null,
        completedAt: p.booking.completedAt?.toISOString() ?? null,
      }
    }),
  }
}

export async function getBookingFinancialSummary(
  bookingId: string,
  opts: { audience: 'admin' | 'provider'; env?: Env; userId?: string; businessId?: string },
): Promise<BookingFinancialSummaryDto> {
  if (opts.audience === 'provider') {
    if (!opts.userId || !opts.businessId) throw new AppError(401, 'UNAUTHORIZED', 'Sign in required')
    await requireBusinessMembership(opts.userId, opts.businessId, [...PROVIDER_REPORT_ROLES])
  }
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { username: true } },
      business: { select: { name: true, stripeAccountId: true } },
      payments: { orderBy: { createdAt: 'desc' } },
      payable: { include: { transferReversal: true } },
      refunds: true,
      paymentDisputes: true,
      financialRecoveryCases: true,
    },
  })
  if (!booking) throw new AppError(404, 'NOT_FOUND', 'Booking not found.')
  if (opts.audience === 'provider' && booking.businessId !== opts.businessId) {
    throw new AppError(403, 'NOT_A_MEMBER', 'You are not a member of this business.')
  }
  const payment = booking.payments.find(p => p.status === 'PAID') || booking.payments[0] || null
  const review = payment
    ? await prisma.financialReconciliationIssue.findFirst({
        where: { paymentId: payment.id, status: 'OPEN', severity: 'CRITICAL' },
        select: { id: true },
      })
    : null
  const succeededRefunds = booking.refunds.filter(r => r.status === 'SUCCEEDED')
  const refunded = succeededRefunds.reduce((s, r) => s.plus(r.amount.toString()), new Decimal(0))
  const reversal = booking.payable?.transferReversal
  const dispute = booking.paymentDisputes[0] || null
  const openRecovery = booking.financialRecoveryCases.filter(c =>
    (UNRESOLVED_RECOVERY_STATUSES as readonly string[]).includes(c.status),
  )
  const recovery = openRecovery.reduce((s, r) => s.plus(r.amount.toString()), new Decimal(0))
  const timeline = buildFinancialTimeline({
    booking,
    payment,
    payable: booking.payable,
    refunds: booking.refunds,
    reversal: reversal ?? null,
    disputes: booking.paymentDisputes,
    recoveries: booking.financialRecoveryCases,
  })
  const connected =
    opts.audience === 'admin' && opts.env ? await connectedBalances(opts.env, booking.business.stripeAccountId) : null

  return {
    bookingId: booking.id,
    bookingReference: booking.bookingReference,
    businessName: booking.business.name,
    travelerUsername: booking.user.username,
    travelerPaid: payment ? moneyFixed(payment.amount) : null,
    currency: payment?.currency || booking.currency,
    paymentStatus: payment?.status ?? null,
    stripeFeeAmount: opts.audience === 'admin' ? moneyOrNull(payment?.stripeFeeAmount) : null,
    stripeFeeUnknown: Boolean(opts.audience === 'admin' && payment && payment.stripeFeeAmount == null),
    delveCommission: booking.payable ? moneyFixed(booking.payable.platformCommissionAmount) : null,
    businessNet: booking.payable ? moneyFixed(booking.payable.businessNetAmount) : null,
    settlementStatus: booking.payable?.status ?? null,
    refundedAmount: moneyFixed(refunded),
    reversalAmount: reversal?.status === 'SUCCEEDED' ? moneyFixed(reversal.amount) : moneyFixed(0),
    disputeAmount: dispute ? moneyFixed(dispute.amount) : null,
    disputeStatus: dispute?.status ?? null,
    recoveryExposure: moneyFixed(recovery),
    needsFinancialReview: Boolean(review),
    connectedAccountBalance: connected,
    timeline,
  }
}

export async function adminDailyReport(env: Env, query: { date?: string }): Promise<DailyPlatformReportDto> {
  const date = query.date || new Date().toISOString().slice(0, 10)
  const report = await adminPlatformFinancialReport(env, { preset: 'CUSTOM', from: date, to: date })
  return { date, period: report.period, byCurrency: report.byCurrency }
}

export async function adminMonthlyReport(
  env: Env,
  query: { year?: string; month?: string },
): Promise<MonthlyPlatformReportDto> {
  const now = new Date()
  const year = Number(query.year || now.getUTCFullYear())
  const month = Number(query.month || now.getUTCMonth() + 1)
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`
  const toDay = new Date(`${next}T00:00:00.000Z`)
  toDay.setUTCDate(toDay.getUTCDate() - 1)
  const to = toDay.toISOString().slice(0, 10)
  const report = await adminPlatformFinancialReport(env, { preset: 'CUSTOM', from, to })
  return { year, month, period: report.period, byCurrency: report.byCurrency }
}

export async function providerFinancialReport(
  userId: string,
  businessId: string,
  query: QueryPeriod,
): Promise<ProviderFinancialReportDto> {
  await requireBusinessMembership(userId, businessId, [...PROVIDER_REPORT_ROLES])
  const period = resolveReportPeriod(query)
  const source = await loadSource(period, businessId)
  const byCurrency = summariesFrom(source, query.currency).map(row => ({
    currency: row.currency,
    grossBookingValue: row.grossPayments,
    successfulPaymentCount: row.successfulPaymentCount,
    platformCommission: row.platformCommission,
    businessNet: row.businessNetFromPaidPeriod,
    pending: row.settlementsPending,
    eligible: row.settlementsEligible,
    processing: row.settlementsProcessing,
    transferred: row.settlementsTransferred,
    reversed: row.transferReversalsSucceeded,
    refunded: row.refundsSucceeded,
    disputed: row.disputeAmountOpened,
  }))
  return { period: periodDto(period), byCurrency }
}

export async function adminExportCsv(kind: FinancialExportKind, query: QueryPeriod): Promise<{ filename: string; body: string }> {
  const period = resolveReportPeriod(query)
  const currency = query.currency && query.currency !== 'ALL' ? query.currency.toUpperCase() : undefined
  const stamp = period.from.toISOString().slice(0, 10)

  if (kind === 'payments') {
    const rows = await prisma.payment.findMany({
      where: {
        status: 'PAID',
        paidAt: { gte: period.from, lt: period.toExclusive },
        ...(currency ? { currency } : {}),
      },
      include: {
        booking: { select: { bookingReference: true } },
        business: { select: { name: true } },
        payable: { select: { platformCommissionAmount: true, businessNetAmount: true, status: true } },
      },
      orderBy: { paidAt: 'desc' },
      take: REPORT_EXPORT_MAX_ROWS + 1,
    })
    assertExportRowLimit(rows.length)
    return {
      filename: `delve-payments-${stamp}.csv`,
      body: toCsv(
        ['bookingReference', 'businessName', 'paymentStatus', 'grossAmount', 'currency', 'stripeFeeAmount', 'platformCommissionAmount', 'businessNetAmount', 'settlementStatus', 'paidAt'],
        rows.map(r => [
          r.booking.bookingReference,
          r.business.name,
          r.status,
          csvMoney(r.amount),
          r.currency,
          csvMoney(r.stripeFeeAmount),
          r.payable ? csvMoney(r.payable.platformCommissionAmount) : '',
          r.payable ? csvMoney(r.payable.businessNetAmount) : '',
          r.payable?.status ?? '',
          r.paidAt?.toISOString() ?? '',
        ]),
      ),
    }
  }

  if (kind === 'settlements') {
    const rows = await prisma.businessPayable.findMany({
      where: {
        createdAt: { gte: period.from, lt: period.toExclusive },
        ...(currency ? { currency } : {}),
      },
      include: { booking: { select: { bookingReference: true } }, business: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: REPORT_EXPORT_MAX_ROWS + 1,
    })
    assertExportRowLimit(rows.length)
    return {
      filename: `delve-settlements-${stamp}.csv`,
      body: toCsv(
        ['bookingReference', 'businessName', 'settlementStatus', 'grossAmount', 'platformCommissionAmount', 'businessNetAmount', 'currency', 'transferredAt', 'createdAt'],
        rows.map(r => [
          r.booking.bookingReference,
          r.business.name,
          r.status,
          csvMoney(r.grossAmount),
          csvMoney(r.platformCommissionAmount),
          csvMoney(r.businessNetAmount),
          r.currency,
          r.transferredAt?.toISOString() ?? '',
          r.createdAt.toISOString(),
        ]),
      ),
    }
  }

  if (kind === 'refunds') {
    const rows = await prisma.refund.findMany({
      where: {
        createdAt: { gte: period.from, lt: period.toExclusive },
        ...(currency ? { currency } : {}),
      },
      include: { booking: { select: { bookingReference: true } }, business: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: REPORT_EXPORT_MAX_ROWS + 1,
    })
    assertExportRowLimit(rows.length)
    return {
      filename: `delve-refunds-${stamp}.csv`,
      body: toCsv(
        ['bookingReference', 'businessName', 'status', 'amount', 'currency', 'succeededAt', 'createdAt'],
        rows.map(r => [
          r.booking.bookingReference,
          r.business.name,
          r.status,
          csvMoney(r.amount),
          r.currency,
          r.succeededAt?.toISOString() ?? '',
          r.createdAt.toISOString(),
        ]),
      ),
    }
  }

  if (kind === 'disputes') {
    const rows = await prisma.paymentDispute.findMany({
      where: {
        createdAt: { gte: period.from, lt: period.toExclusive },
        ...(currency ? { currency } : {}),
      },
      include: { booking: { select: { bookingReference: true } }, business: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: REPORT_EXPORT_MAX_ROWS + 1,
    })
    assertExportRowLimit(rows.length)
    return {
      filename: `delve-disputes-${stamp}.csv`,
      body: toCsv(
        ['bookingReference', 'businessName', 'status', 'reason', 'amount', 'currency', 'recoveryStatus', 'stripeFeeAmount', 'createdAt'],
        rows.map(r => [
          r.booking.bookingReference,
          r.business.name,
          r.status,
          r.reason,
          csvMoney(r.amount),
          r.currency,
          r.recoveryStatus,
          csvMoney(r.stripeFeeAmount),
          r.createdAt.toISOString(),
        ]),
      ),
    }
  }

  if (kind === 'businesses') {
    const rows = await adminBusinessPerformance(query)
    return {
      filename: `delve-business-summary-${stamp}.csv`,
      body: toCsv(
        ['businessName', 'currency', 'bookingCount', 'grossBookingValue', 'platformCommission', 'businessNet', 'transferred', 'pending', 'refundAmount', 'disputeAmount', 'unresolvedRecoveryExposure'],
        rows.map(r => [
          r.businessName,
          r.currency,
          r.bookingCount,
          r.grossBookingValue,
          r.platformCommission,
          r.businessNet,
          r.transferred,
          r.pending,
          r.refundAmount,
          r.disputeAmount,
          r.unresolvedRecoveryExposure,
        ]),
      ),
    }
  }

  const table = await adminBookingFinancialTable({ ...query, page: '1', pageSize: String(REPORT_EXPORT_MAX_ROWS) })
  assertExportRowLimit(table.total > REPORT_EXPORT_MAX_ROWS ? table.total : table.rows.length)
  return {
    filename: `delve-bookings-${stamp}.csv`,
    body: toCsv(
      ['bookingReference', 'businessName', 'paymentStatus', 'grossAmount', 'currency', 'stripeFeeAmount', 'platformCommissionAmount', 'businessNetAmount', 'settlementStatus', 'refundAmount', 'disputeStatus', 'createdAt', 'paidAt', 'completedAt'],
      table.rows.map(r => [
        r.bookingReference,
        r.businessName,
        r.paymentStatus,
        r.grossAmount,
        r.currency,
        r.stripeFeeUnknown ? '' : r.stripeFeeAmount,
        r.platformCommissionAmount,
        r.businessNetAmount,
        r.settlementStatus,
        r.refundAmount,
        r.disputeStatus,
        r.createdAt,
        r.paidAt,
        r.completedAt,
      ]),
    ),
  }
}

export async function providerExportCsv(userId: string, businessId: string, query: QueryPeriod): Promise<{ filename: string; body: string }> {
  await requireBusinessMembership(userId, businessId, [...PROVIDER_REPORT_ROLES])
  const period = resolveReportPeriod(query)
  const currency = query.currency && query.currency !== 'ALL' ? query.currency.toUpperCase() : undefined
  const rows = await prisma.businessPayable.findMany({
    where: {
      businessId,
      createdAt: { gte: period.from, lt: period.toExclusive },
      ...(currency ? { currency } : {}),
    },
    include: {
      booking: { select: { bookingReference: true, listingTitleSnapshot: true, completedAt: true } },
      payment: { select: { amount: true, paidAt: true, status: true } },
      transferReversal: true,
    },
    orderBy: { createdAt: 'desc' },
    take: REPORT_EXPORT_MAX_ROWS + 1,
  })
  assertExportRowLimit(rows.length)
  const refunds = await prisma.refund.findMany({
    where: { businessId, bookingId: { in: rows.map(r => r.bookingId) }, status: 'SUCCEEDED' },
    select: { bookingId: true, amount: true },
  })
  const refundByBooking = new Map<string, string>()
  for (const r of refunds) {
    const prev = refundByBooking.get(r.bookingId) || '0'
    refundByBooking.set(r.bookingId, moneyFixed(new Decimal(prev).plus(r.amount.toString())))
  }
  const disputes = await prisma.paymentDispute.findMany({
    where: { businessId, bookingId: { in: rows.map(r => r.bookingId) } },
    select: { bookingId: true, status: true },
  })
  const disputeByBooking = new Map(disputes.map(d => [d.bookingId, d.status]))
  return {
    filename: `delve-earnings-${period.from.toISOString().slice(0, 10)}.csv`,
    body: toCsv(
      ['bookingReference', 'listingTitle', 'paymentStatus', 'grossAmount', 'currency', 'platformCommissionAmount', 'businessNetAmount', 'settlementStatus', 'refundAmount', 'disputeStatus', 'createdAt', 'paidAt', 'completedAt'],
      rows.map(r => [
        r.booking.bookingReference,
        r.booking.listingTitleSnapshot,
        r.payment.status,
        csvMoney(r.grossAmount),
        r.currency,
        csvMoney(r.platformCommissionAmount),
        csvMoney(r.businessNetAmount),
        r.status,
        refundByBooking.get(r.bookingId) || '0.00',
        disputeByBooking.get(r.bookingId) || '',
        r.createdAt.toISOString(),
        r.payment.paidAt?.toISOString() ?? '',
        r.booking.completedAt?.toISOString() ?? '',
      ]),
    ),
  }
}
