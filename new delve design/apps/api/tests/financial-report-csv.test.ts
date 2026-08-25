import { describe, expect, it } from 'vitest'
import { resolveReportPeriod } from '../src/modules/payment/report-period.js'
import { csvMoney, toCsv } from '../src/modules/payment/financial-report-csv.js'

describe('report period UTC bounds', () => {
  it('uses inclusive UTC calendar days for custom date-only inputs', () => {
    const period = resolveReportPeriod({ preset: 'CUSTOM', from: '2026-08-01', to: '2026-08-01' })
    expect(period.from.toISOString()).toBe('2026-08-01T00:00:00.000Z')
    expect(period.toExclusive.toISOString()).toBe('2026-08-02T00:00:00.000Z')
  })

  it('last 7 days includes today in UTC', () => {
    const now = new Date('2026-08-25T15:00:00.000Z')
    const period = resolveReportPeriod({ preset: 'LAST_7_DAYS' }, now)
    expect(period.from.toISOString()).toBe('2026-08-19T00:00:00.000Z')
    expect(period.toExclusive.toISOString()).toBe('2026-08-26T00:00:00.000Z')
  })
})

describe('csv money export', () => {
  it('exports decimal strings without locale currency formatting', () => {
    expect(csvMoney('900.00')).toBe('900.00')
    expect(csvMoney(900)).toBe('900.00')
    const csv = toCsv(['grossAmount', 'currency'], [['900.00', 'NAD']])
    expect(csv).toContain('900.00,NAD')
    expect(csv).not.toContain('N$')
    expect(csv).not.toContain('sk_')
    expect(csv).not.toContain('client_secret')
  })
})
