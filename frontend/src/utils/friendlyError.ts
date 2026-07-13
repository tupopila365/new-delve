import { ApiError } from '../api/client'

export function friendlyApiMessage(
  error: unknown,
  fallback = 'Something went wrong. Try again.',
): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'Not found.'
    if (error.status === 403) return "You don't have permission to do that."
    if (error.status === 429) return "You've done that too many times. Please wait a moment and try again."
    if (error.status >= 500) return 'Server error. Please try again later.'
  }
  return fallback
}
