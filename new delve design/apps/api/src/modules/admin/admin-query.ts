import { AppError } from '../../middleware/error-handler.js'

export type AdminPage = { page: number; pageSize: 25 | 50 | 100; skip: number }

export function parseAdminPage(query: { page?: unknown; pageSize?: unknown }): AdminPage {
  const page = Math.max(1, Number.parseInt(String(query.page || '1'), 10) || 1)
  const raw = Number.parseInt(String(query.pageSize || '25'), 10)
  const pageSize = raw === 50 || raw === 100 ? raw : 25
  return { page, pageSize, skip: (page - 1) * pageSize }
}

export function paginated<T>(items: T[], page: number, pageSize: 25 | 50 | 100, total: number) {
  return {
    items,
    page,
    pageSize,
    total,
    hasNext: page * pageSize < total,
    hasPrevious: page > 1,
  }
}

export function optionalDate(value: unknown, field: string): Date | undefined {
  if (value == null || value === '') return undefined
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) throw new AppError(400, 'VALIDATION_ERROR', `Invalid ${field}`)
  return d
}

export function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}
