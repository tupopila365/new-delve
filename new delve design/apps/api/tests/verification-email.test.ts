import { describe, expect, it } from 'vitest'
import { buildVerificationEmail, escapeHtml } from '../src/modules/email/templates/verification.js'

describe('verification email template', () => {
  const built = buildVerificationEmail({
    username: 'traveler',
    verificationCode: '482913',
    expiresAt: new Date('2026-08-12T12:00:00.000Z'),
  })

  it('renders branded HTML with OTP and preheader', () => {
    expect(built.subject).toBe('Your Delve verification code')
    expect(built.html).toContain('Your verification code is 482913')
    expect(built.html).toContain('Delve Worldwide')
    expect(built.html).toContain('482913')
    expect(built.html).toContain('#5F2FC9')
    expect(built.html).toContain('delveworldwide@gmail.com')
    expect(built.html).not.toContain('verify-email?token=')
  })

  it('escapes user-controlled HTML', () => {
    const evil = buildVerificationEmail({
      username: '<script>alert(1)</script>',
      verificationCode: '123456',
      expiresAt: new Date('2026-08-12T12:00:00.000Z'),
    })
    expect(evil.html).not.toContain('<script>alert(1)</script>')
    expect(evil.html).toContain('&lt;script&gt;')
  })

  it('includes plain-text fallback with essentials', () => {
    expect(built.text).toContain('Hello traveler')
    expect(built.text).toContain('482913')
    expect(built.text).toContain('delveworldwide@gmail.com')
    expect(built.text.toLowerCase()).toContain('expires')
  })

  it('escapeHtml covers entities', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;')
  })
})
