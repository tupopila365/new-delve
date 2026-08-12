import { describe, expect, it } from 'vitest'
import type { Env } from '../src/config/env.js'
import { createCorsOptions } from '../src/config/cors.js'

function checkTravelerOrigin(configuredUrl: string, origin: string) {
  const env = {
    TRAVELER_WEB_URL: configuredUrl,
    ADMIN_WEB_URL: 'https://admin.delveworldwide.me',
    ADMIN_WEB_ORIGIN: 'https://admin.delveworldwide.me',
  } as Env
  const originCheck = createCorsOptions(env).origin as (
    requestOrigin: string,
    callback: (error: Error | null, allowed?: boolean) => void,
  ) => void

  let result: { error: Error | null; allowed?: boolean } | undefined
  originCheck(origin, (error, allowed) => {
    result = { error, allowed }
  })
  return result
}

describe('traveler CORS origins', () => {
  it('allows both Delve production hostname forms', () => {
    expect(checkTravelerOrigin('https://delveworldwide.me', 'https://delveworldwide.me')).toEqual({
      error: null,
      allowed: true,
    })
    expect(checkTravelerOrigin('https://delveworldwide.me', 'https://www.delveworldwide.me')).toEqual({
      error: null,
      allowed: true,
    })
  })

  it('continues to reject unrelated origins', () => {
    const result = checkTravelerOrigin('https://delveworldwide.me', 'https://example.com')
    expect(result?.allowed).toBeUndefined()
    expect(result?.error?.message).toBe('Origin not allowed by CORS: https://example.com')
  })
})
