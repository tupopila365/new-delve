import { ApiError } from '../api/client'
import { formatApiErrorMessage as flattenBodyMessage } from '../api/client'
import { formatApiErrorMessage as flattenFieldMessage } from './apiErrorMessage'

const STACKISH =
  /Traceback \(most recent call last\)|Exception Type:|Exception Value:|<html[\s>]|at\s+\S+\s+\(\S+:\d+:\d+\)/i

/** Strip HTML / Django debug pages / stack traces from anything shown in the UI. */
export function sanitizeUiError(raw: string, fallback: string): string {
  const text = (raw || '').trim()
  if (!text) return fallback
  if (STACKISH.test(text) || text.length > 280) return fallback
  // Prefer first line only if multi-line dump slipped through.
  const first = text.split(/\r?\n/).map((l) => l.trim()).find(Boolean) || fallback
  if (STACKISH.test(first) || first.length > 280) return fallback
  return first
}

function lookLikeAuthFailure(msg: string): boolean {
  const m = msg.toLowerCase()
  return (
    m.includes('no active account') ||
    m.includes('no account found') ||
    m.includes('unable to log in') ||
    m.includes('credentials') ||
    m.includes('password') ||
    m.includes('email:') ||
    m.includes('username:')
  )
}

/** User-facing message for login / register / verify / reset forms. */
export function authFormError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const fromFields = flattenFieldMessage(error, '')
    const fromBody =
      fromFields ||
      (typeof error.body === 'object' && error.body
        ? flattenBodyMessage(error.body, error.message)
        : error.message)

    if (error.status === 401 || lookLikeAuthFailure(fromBody)) {
      if (/no account found with this email/i.test(fromBody)) {
        return 'No account found with this email.'
      }
      if (/no account found with this username/i.test(fromBody)) {
        return 'No account found with this username.'
      }
      if (/email or username is required/i.test(fromBody)) {
        return 'Enter your email or username.'
      }
      if (/provide email or username, not both/i.test(fromBody)) {
        return 'Use either email or username, not both.'
      }
      return sanitizeUiError(fromBody, 'Wrong email or password. Try again, or reset your password.')
    }

    if (error.status === 429) {
      return "You've tried too many times. Wait a moment and try again."
    }
    if (error.status >= 500) {
      return 'Something went wrong on our side. Please try again in a moment.'
    }
    if (error.status === 0 || /failed to fetch|networkerror|load failed|cors/i.test(fromBody)) {
      return 'Could not reach the server. Check your connection and try again.'
    }

    // Token flows
    if (/invalid or expired token/i.test(fromBody)) {
      return 'This link is invalid or has expired. Request a new one.'
    }
    if (/invalid token/i.test(fromBody)) {
      return 'That token looks invalid. Copy the full link from your email and try again.'
    }

    return sanitizeUiError(fromBody, fallback)
  }

  if (error instanceof TypeError || (error instanceof Error && /failed to fetch|networkerror|load failed/i.test(error.message))) {
    return 'Could not reach the server. Check your connection and try again.'
  }

  if (error instanceof Error) {
    return sanitizeUiError(error.message, fallback)
  }

  return fallback
}
