import { describe, expect, it } from 'vitest'
import {
  isReservedUsername,
  normalizeUsername,
  usernameSchema,
  RESERVED_USERNAMES,
} from '@delve/contracts'

describe('username validation', () => {
  it('accepts valid usernames and normalizes to lowercase', () => {
    expect(usernameSchema.parse('WorldTraveler')).toBe('worldtraveler')
    expect(usernameSchema.parse('traveler_01')).toBe('traveler_01')
    expect(usernameSchema.parse('a.b.c')).toBe('a.b.c')
  })

  it('rejects invalid characters, length, and consecutive periods', () => {
    expect(usernameSchema.safeParse('ab').success).toBe(false)
    expect(usernameSchema.safeParse('a'.repeat(31)).success).toBe(false)
    expect(usernameSchema.safeParse('bad name').success).toBe(false)
    expect(usernameSchema.safeParse('bad@name').success).toBe(false)
    expect(usernameSchema.safeParse('bad..name').success).toBe(false)
    expect(usernameSchema.safeParse('.leading').success).toBe(false)
    expect(usernameSchema.safeParse('trailing.').success).toBe(false)
  })

  it('rejects reserved names case-insensitively without revealing accounts', () => {
    for (const name of ['Admin', 'DELVE', 'support', 'investors']) {
      expect(isReservedUsername(name)).toBe(true)
      expect(usernameSchema.safeParse(name).success).toBe(false)
    }
    expect(RESERVED_USERNAMES).toContain('delveworldwide')
  })

  it('treats case variants as the same normalized username', () => {
    expect(normalizeUsername('WorldTraveler')).toBe(normalizeUsername('worldtraveler'))
  })
})
