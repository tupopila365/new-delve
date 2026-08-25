import { Decimal } from '@delve/database/decimal'
import { moneyFixed } from './report-metrics.js'
import { REPORT_EXPORT_MAX_ROWS } from './report-period.js'
import { AppError } from '../../middleware/error-handler.js'

export function csvCell(value: string | number | null | undefined): string {
  if (value == null) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function csvMoney(value: { toString(): string } | string | number | null | undefined): string {
  if (value == null) return ''
  return moneyFixed(value)
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const lines = [headers.map(csvCell).join(',')]
  for (const row of rows) {
    lines.push(row.map(csvCell).join(','))
  }
  return `${lines.join('\r\n')}\r\n`
}

export function assertExportRowLimit(count: number) {
  if (count > REPORT_EXPORT_MAX_ROWS) {
    throw new AppError(
      400,
      'EXPORT_TOO_LARGE',
      `Export exceeds ${REPORT_EXPORT_MAX_ROWS} rows. Narrow the date range.`,
    )
  }
}

export function decimalCsv(amount: Decimal | { toString(): string }): string {
  return moneyFixed(amount)
}
