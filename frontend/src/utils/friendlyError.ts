import { ApiError } from '../api/client'

export function friendlyApiMessage(
  error: unknown,
  fallback = 'Something went wrong. Try again.',
): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return 'Could not reach the server. Check your connection and try again.'
    if (error.status === 404) return 'Not found.'
    if (error.status === 403) return "You don't have permission to do that."
    if (error.status === 401) return 'Please sign in again.'
    if (error.status === 429) return "You've done that too many times. Please wait a moment and try again."
    if (error.status >= 500) return 'Server error. Please try again later.'
    // Surface API validation / auth messages (e.g. wrong current password).
    const msg = (error.message || '').trim()
    if (msg && msg !== 'Request failed' && msg !== 'Bad Request' && msg !== 'Unauthorized') {
      return msg
    }
  }
  if (
    error instanceof TypeError ||
    (error instanceof Error && /failed to fetch|networkerror|load failed/i.test(error.message))
  ) {
    return 'Could not reach the server. Check your connection and try again.'
  }
  if (error instanceof Error) {
    const msg = (error.message || '').trim()
    if (msg) return msg
  }
  return fallback
}
