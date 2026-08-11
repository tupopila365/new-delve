import { describe, expect, it } from 'vitest'
import { formatUsername } from '../../../src/lib/formatUsername'

describe('formatUsername', () => {
  it('renders consistent @username handles', () => {
    expect(formatUsername('WorldTraveler')).toBe('@worldtraveler')
    expect(formatUsername('@Already')).toBe('@already')
    expect(formatUsername('')).toBe('')
    expect(formatUsername(null)).toBe('')
  })
})
