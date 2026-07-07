import { ApiError } from '../api/client'

function flattenFieldErrors(body: unknown): string[] {
  if (!body || typeof body !== 'object') return []
  const rows: string[] = []
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (key === 'detail') continue
    if (typeof value === 'string' && value.trim()) {
      rows.push(value.trim())
      continue
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.trim()) rows.push(item.trim())
      }
    }
  }
  return rows
}

export function formatApiErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) {
    return err instanceof Error ? err.message : fallback
  }
  const fieldErrors = flattenFieldErrors(err.body)
  if (fieldErrors.length > 0) return fieldErrors.join(' ')
  if (err.message.trim()) return err.message
  return fallback
}
