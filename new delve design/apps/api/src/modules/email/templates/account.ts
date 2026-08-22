import { escapeHtml } from './verification.js'

export function buildEmailChangeEmail(input: {
  username: string
  verifyUrl: string
  expiresAt: Date
}) {
  const safeName = escapeHtml(input.username)
  const safeUrl = escapeHtml(input.verifyUrl)
  const expiry = escapeHtml(input.expiresAt.toUTCString())
  const subject = 'Confirm your new email for Delve'
  const html = `<!DOCTYPE html>
<html lang="en"><body style="margin:0;padding:0;background:#F7F3EC;font-family:Arial,Helvetica,sans-serif;color:#1A1814;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Confirm your new Delve email address.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #E4DDD2;">
        <tr><td style="background:#1A1814;padding:22px 28px;">
          <p style="margin:0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#C7ACFF;font-weight:700;">Delve Worldwide</p>
          <p style="margin:8px 0 0;font-size:22px;color:#fff;font-weight:700;">Confirm your new email</p>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 14px;font-size:16px;">Hello ${safeName},</p>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#4A453C;">
            A request was made to change the email on your Delve account. Confirm this address to finish the change. Your current email stays active until you confirm.
          </p>
          <p style="margin:0 0 22px;"><a href="${safeUrl}" style="display:inline-block;padding:14px 22px;background:#5F2FC9;color:#fff;text-decoration:none;font-weight:700;">Confirm new email</a></p>
          <p style="margin:0 0 12px;font-size:13px;word-break:break-all;"><a href="${safeUrl}" style="color:#5F2FC9;">${safeUrl}</a></p>
          <p style="margin:0;font-size:13px;color:#4A453C;">This link expires on <strong>${expiry}</strong> and can be used once. If you did not request this, you can ignore this email.</p>
        </td></tr>
        <tr><td style="padding:18px 28px;background:#F0EBE3;font-size:12px;color:#6F695F;">
          Delve Worldwide · <a href="mailto:delveworldwide@gmail.com" style="color:#5F2FC9;">delveworldwide@gmail.com</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
  const text = [
    'Delve Worldwide',
    '',
    `Hello ${input.username},`,
    '',
    'Confirm your new Delve email address:',
    input.verifyUrl,
    '',
    `Expires: ${input.expiresAt.toUTCString()}`,
    '',
    'If you did not request this, ignore this email.',
    'delveworldwide@gmail.com',
  ].join('\n')
  return { subject, html, text }
}

export function buildPasswordResetEmail(input: {
  username: string
  resetCode: string
  expiresAt: Date
}) {
  const safeName = escapeHtml(input.username)
  const safeCode = escapeHtml(input.resetCode)
  const expiry = escapeHtml(input.expiresAt.toUTCString())
  const subject = 'Your Delve password reset code'
  const html = `<!DOCTYPE html>
<html lang="en"><body style="margin:0;padding:0;background:#F7F3EC;font-family:Arial,Helvetica,sans-serif;color:#1A1814;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your password reset code is ${safeCode}.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #E4DDD2;">
        <tr><td style="background:#1A1814;padding:22px 28px;">
          <p style="margin:0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#C7ACFF;font-weight:700;">Delve Worldwide</p>
          <p style="margin:8px 0 0;font-size:22px;color:#fff;font-weight:700;">Reset your password</p>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 14px;font-size:16px;">Hello ${safeName},</p>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#4A453C;">
            We received a request to reset the password for your Delve account. Enter this code in Delve to choose a new password. It expires soon and can be used once.
          </p>
          <p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:36px;font-weight:700;letter-spacing:0.35em;color:#5F2FC9;text-align:center;">
            ${safeCode}
          </p>
          <p style="margin:0;font-size:13px;color:#4A453C;">Expires on <strong>${expiry}</strong>. If you did not request this, you can ignore this email — your password will stay the same.</p>
        </td></tr>
        <tr><td style="padding:18px 28px;background:#F0EBE3;font-size:12px;color:#6F695F;">
          Delve Worldwide · <a href="mailto:delveworldwide@gmail.com" style="color:#5F2FC9;">delveworldwide@gmail.com</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
  const text = [
    'Delve Worldwide',
    '',
    `Hello ${input.username},`,
    '',
    'Enter this code in Delve to reset your password:',
    '',
    input.resetCode,
    '',
    `Expires: ${input.expiresAt.toUTCString()}`,
    '',
    'If you did not request this, ignore this email.',
    'delveworldwide@gmail.com',
  ].join('\n')
  return { subject, html, text }
}

export function buildSecurityNoticeEmail(input: { username: string; message: string }) {
  const safeName = escapeHtml(input.username)
  const safeMsg = escapeHtml(input.message)
  const subject = 'Security notice for your Delve account'
  const html = `<!DOCTYPE html><html lang="en"><body style="font-family:Arial,Helvetica,sans-serif;background:#F7F3EC;color:#1A1814;padding:24px;">
    <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#5F2FC9;font-weight:700;">Delve Worldwide</p>
    <h1 style="font-size:22px;">Security notice</h1>
    <p>Hello ${safeName},</p>
    <p>${safeMsg}</p>
    <p style="font-size:13px;color:#6F695F;">If this was not you, contact delveworldwide@gmail.com immediately.</p>
  </body></html>`
  const text = `Delve Worldwide\n\nHello ${input.username},\n\n${input.message}\n\nIf this was not you, contact delveworldwide@gmail.com.`
  return { subject, html, text }
}
