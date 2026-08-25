import { AppError } from '../../middleware/error-handler.js'
import type { ReportPeriodPreset } from '@delve/contracts'

export const REPORT_MAX_RANGE_DAYS = 366
export const REPORT_EXPORT_MAX_ROWS = 5000

export type ResolvedReportPeriod = {
  preset: ReportPeriodPreset
  from: Date
  toExclusive: Date
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function addUtcDays(d: Date, days: number): Date {
  const next = new Date(d.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}

function parseIsoBound(value: string, label: string): Date {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    throw new AppError(400, 'INVALID_REPORT_PERIOD', `Invalid ${label} timestamp.`)
  }
  return d
}

function assertRange(from: Date, toExclusive: Date) {
  if (toExclusive.getTime() <= from.getTime()) {
    throw new AppError(400, 'INVALID_REPORT_PERIOD', 'Report end must be after start.')
  }
  const days = (toExclusive.getTime() - from.getTime()) / 86_400_000
  if (days > REPORT_MAX_RANGE_DAYS + 1) {
    throw new AppError(
      400,
      'EXPORT_RANGE_TOO_LARGE',
      `Report range cannot exceed ${REPORT_MAX_RANGE_DAYS} days.`,
    )
  }
}

/** Half-open UTC interval [from, toExclusive). Calendar days are UTC, not local timezone. */
export function resolveReportPeriod(
  query: { preset?: string; from?: string; to?: string },
  now = new Date(),
): ResolvedReportPeriod {
  const preset = (query.preset || 'LAST_30_DAYS').toUpperCase() as ReportPeriodPreset
  const today = startOfUtcDay(now)
  const tomorrow = addUtcDays(today, 1)

  if (preset === 'TODAY') {
    return { preset, from: today, toExclusive: tomorrow }
  }
  if (preset === 'LAST_7_DAYS') {
    return { preset, from: addUtcDays(today, -6), toExclusive: tomorrow }
  }
  if (preset === 'LAST_30_DAYS') {
    return { preset, from: addUtcDays(today, -29), toExclusive: tomorrow }
  }
  if (preset === 'THIS_MONTH') {
    return { preset, from: startOfUtcMonth(today), toExclusive: tomorrow }
  }
  if (preset === 'LAST_MONTH') {
    const thisMonth = startOfUtcMonth(today)
    const lastMonth = new Date(Date.UTC(thisMonth.getUTCFullYear(), thisMonth.getUTCMonth() - 1, 1))
    return { preset, from: lastMonth, toExclusive: thisMonth }
  }
  if (preset === 'CUSTOM') {
    if (!query.from || !query.to) {
      throw new AppError(400, 'INVALID_REPORT_PERIOD', 'Custom reports require from and to.')
    }
    const fromRaw = parseIsoBound(query.from, 'from')
    const toRaw = parseIsoBound(query.to, 'to')
    const from = /^\d{4}-\d{2}-\d{2}$/.test(query.from) ? startOfUtcDay(fromRaw) : fromRaw
    const toExclusive = /^\d{4}-\d{2}-\d{2}$/.test(query.to) ? addUtcDays(startOfUtcDay(toRaw), 1) : toRaw
    assertRange(from, toExclusive)
    return { preset, from, toExclusive }
  }
  throw new AppError(400, 'INVALID_REPORT_PERIOD', 'Unknown report period preset.')
}

export function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function inPeriod(at: Date | null | undefined, period: ResolvedReportPeriod): boolean {
  if (!at) return false
  const t = at.getTime()
  return t >= period.from.getTime() && t < period.toExclusive.getTime()
}
