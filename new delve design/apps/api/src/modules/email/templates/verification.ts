export type VerificationEmailInput = {
  username: string
  verificationCode: string
  expiresAt: Date
}

export type BuiltEmail = {
  subject: string
  html: string
  text: string
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatExpiry(expiresAt: Date): string {
  return expiresAt.toUTCString()
}

/** Branded Delve verification email (HTML + plain text). */
export function buildVerificationEmail(input: VerificationEmailInput): BuiltEmail {
  const safeName = escapeHtml(input.username)
  const safeCode = escapeHtml(input.verificationCode)
  const expiryLabel = escapeHtml(formatExpiry(input.expiresAt))
  const subject = 'Your Delve verification code'
  const preheader = `Your verification code is ${input.verificationCode}. It expires soon.`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#F7F3EC;font-family:Georgia,'Times New Roman',serif;color:#1A1814;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F7F3EC;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E4DDD2;">
          <tr>
            <td style="background:#1A1814;padding:22px 28px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#C7ACFF;font-weight:700;">Delve Worldwide</p>
              <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.2;color:#FFFFFF;font-weight:700;">Verify your email</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1A1814;">
                Hello ${safeName},
              </p>
              <p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#4A453C;">
                Enter this code in Delve to confirm your email address and activate your traveler account.
              </p>
              <p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:36px;font-weight:700;letter-spacing:0.35em;color:#5F2FC9;text-align:center;">
                ${safeCode}
              </p>
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#4A453C;">
                This code expires on <strong style="color:#1A1814;">${expiryLabel}</strong> and can be used once.
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#4A453C;border-top:1px solid #E4DDD2;padding-top:16px;">
                If you did not create a Delve account, you can ignore this email. Your address will not be verified.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 24px;background:#F0EBE3;border-top:1px solid #E4DDD2;">
              <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#5F2FC9;font-weight:700;">Delve Worldwide</p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#6F695F;">
                Questions? Contact <a href="mailto:delveworldwide@gmail.com" style="color:#5F2FC9;">delveworldwide@gmail.com</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8A8378;">Accent: #8C52FF · Deep: #5F2FC9 · Lilac: #C7ACFF</p>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    'Delve Worldwide',
    '',
    `Hello ${input.username},`,
    '',
    'Enter this code in Delve to verify your email address:',
    '',
    input.verificationCode,
    '',
    `This code expires on ${formatExpiry(input.expiresAt)} and can be used once.`,
    '',
    'If you did not create a Delve account, you can ignore this email.',
    '',
    'Delve Worldwide',
    'Contact: delveworldwide@gmail.com',
  ].join('\n')

  return { subject, html, text }
}
