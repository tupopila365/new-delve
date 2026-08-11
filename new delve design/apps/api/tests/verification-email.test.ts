import { describe, expect, it } from 'vitest'
import { buildVerificationEmail, escapeHtml } from '../src/modules/email/templates/verification.js'

describe('verification email template', () => {
  const built = buildVerificationEmail({
    username: 'traveler',
    verifyUrl: 'https://delveworldwide.me/verify-email?token=abc',
    expiresAt: new Date('2026-08-12T12:00:00.000Z'),
  })

  it('renders branded HTML with CTA and preheader', () => {
    expect(built.subject).toBe('Verify your email for Delve')
    expect(built.html).toContain('Verify your email and begin exploring with Delve.')
    expect(built.html).toContain('Delve Worldwide')
    expect(built.html).toContain('Verify my email')
    expect(built.html).toContain('#5F2FC9')
    expect(built.html).toContain('delveworldwide@gmail.com')
    expect(built.html).toContain('https://delveworldwide.me/verify-email?token=abc')
  })

  it('escapes user-controlled HTML', () => {
    const evil = buildVerificationEmail({
      username: '<script>alert(1)</script>',
      verifyUrl: 'https://example.com/?a="b"',
      expiresAt: new Date('2026-08-12T12:00:00.000Z'),
    })
    expect(evil.html).not.toContain('<script>alert(1)</script>')
    expect(evil.html).toContain('&lt;script&gt;')
    expect(evil.html).toContain('&quot;')
  })

  it('includes plain-text fallback with essentials', () => {
    expect(built.text).toContain('Hello traveler')
    expect(built.text).toContain('https://delveworldwide.me/verify-email?token=abc')
    expect(built.text).toContain('delveworldwide@gmail.com')
    expect(built.text.toLowerCase()).toContain('expires')
  })

  it('escapeHtml covers entities', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;')
  })
})
