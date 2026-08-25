import { describe, expect, it } from 'vitest'
import { assertBookingTransition } from '../src/modules/booking/booking-lifecycle.js'

describe('booking lifecycle', () => {
  it('allows PENDING to PENDING_PAYMENT then CONFIRMED', () => {
    expect(() => assertBookingTransition('PENDING', 'PENDING_PAYMENT')).not.toThrow()
    expect(() => assertBookingTransition('PENDING_PAYMENT', 'CONFIRMED')).not.toThrow()
  })

  it('allows CONFIRMED to COMPLETED', () => {
    expect(() => assertBookingTransition('CONFIRMED', 'COMPLETED')).not.toThrow()
  })

  it('allows COMPLETED to CANCELLED after a successful refund', () => {
    expect(() => assertBookingTransition('COMPLETED', 'CANCELLED')).not.toThrow()
  })

  it('rejects COMPLETED to PENDING', () => {
    expect(() => assertBookingTransition('COMPLETED', 'PENDING')).toThrow(/Cannot change/)
  })
})
