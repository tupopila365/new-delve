import { authConfig } from '../../data/authConfig'

export interface TermsAndPrivacyTextProps {
  /** 'inline' is the footnote under a button; 'consent' pairs with a checkbox. */
  variant?: 'inline' | 'consent'
  actionLabel?: string
  align?: 'left' | 'center'
}

export default function TermsAndPrivacyText({
  variant = 'inline',
  actionLabel = 'continuing',
  align = 'center',
}: TermsAndPrivacyTextProps) {
  const linkStyle = {
    color: 'var(--primary)',
    textDecoration: 'underline',
    textUnderlineOffset: 2,
    fontWeight: 500,
  }

  if (variant === 'consent') {
    return (
      <span>
        I agree to the{' '}
        <a href={authConfig.termsUrl} style={linkStyle}>
          Terms of Service
        </a>{' '}
        and acknowledge the{' '}
        <a href={authConfig.privacyUrl} style={linkStyle}>
          Privacy Policy
        </a>
        .
      </span>
    )
  }

  return (
    <p
      className={`text-xs ${align === 'center' ? 'text-center' : ''}`}
      style={{ color: 'var(--fg-muted)', lineHeight: 1.6 }}
    >
      By {actionLabel} you agree to the{' '}
      <a href={authConfig.termsUrl} style={linkStyle}>
        Terms of Service
      </a>{' '}
      and{' '}
      <a href={authConfig.privacyUrl} style={linkStyle}>
        Privacy Policy
      </a>
      .
    </p>
  )
}
