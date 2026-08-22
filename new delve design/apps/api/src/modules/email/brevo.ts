import { randomUUID } from 'node:crypto'
import type { Env } from '../../config/env.js'
import type { EmailProvider, EmailSendResult, TransactionalEmail } from './provider.js'
import { buildVerificationEmail } from './templates/verification.js'

function sanitizeBrevoError(status: number, body: string): string {
  const trimmed = body.replace(/api[-_]?key["'\s:=]+[^\s"',}]+/gi, '[redacted]').slice(0, 120)
  return `brevo_http_${status}${trimmed ? `: ${trimmed}` : ''}`
}

export function createBrevoEmailProvider(env: Env): EmailProvider {
  return {
    async sendTransactionalEmail(message: TransactionalEmail): Promise<EmailSendResult> {
      const correlationId = randomUUID()

      if (!env.brevoConfigured) {
        if (env.appEnv === 'production' || env.appEnv === 'staging') {
          console.error('[email] Brevo not configured', { correlationId })
          return { ok: false, correlationId, sanitizedError: 'email_not_configured' }
        }
        if (env.appEnv === 'development') {
          console.warn(`[email:dev] Brevo not configured — skipping send (correlationId=${correlationId})`)
          // Intentionally do not log verify URLs or tokens outside explicit callers in development helpers.
        }
        return { ok: true, providerMessageId: `dev-skip-${correlationId}` }
      }

      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'api-key': env.BREVO_API_KEY!,
          },
          body: JSON.stringify({
            sender: {
              email: env.BREVO_SENDER_EMAIL!,
              name: env.BREVO_SENDER_NAME?.trim() || 'Delve Worldwide',
            },
            to: [{ email: message.toEmail }],
            subject: message.subject,
            htmlContent: message.html,
            textContent: message.text,
          }),
        })

        if (!response.ok) {
          const detail = await response.text().catch(() => '')
          const sanitizedError = sanitizeBrevoError(response.status, detail)
          console.error('[email] Brevo send failed', { correlationId, sanitizedError })
          return { ok: false, correlationId, sanitizedError }
        }

        return { ok: true, providerMessageId: correlationId }
      } catch {
        console.error('[email] Brevo request error', { correlationId, sanitizedError: 'network_or_provider_error' })
        return { ok: false, correlationId, sanitizedError: 'network_or_provider_error' }
      }
    },
  }
}

export type SendVerificationInput = {
  toEmail: string
  username: string
  verificationCode: string
  expiresAt: Date
}

/** Convenience wrapper used by auth — builds template then sends via provider. */
export async function sendVerificationEmail(
  env: Env,
  input: SendVerificationInput,
  provider: EmailProvider = createBrevoEmailProvider(env),
): Promise<EmailSendResult> {
  const built = buildVerificationEmail({
    username: input.username,
    verificationCode: input.verificationCode,
    expiresAt: input.expiresAt,
  })

  if (env.appEnv === 'development' && !env.brevoConfigured) {
    console.warn('[email:dev] verification email built (code omitted from production logs)')
  }

  return provider.sendTransactionalEmail({
    toEmail: input.toEmail,
    subject: built.subject,
    html: built.html,
    text: built.text,
  })
}

export { buildVerificationEmail, escapeHtml } from './templates/verification.js'
