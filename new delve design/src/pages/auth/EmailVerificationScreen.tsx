import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { MailCheck, MailWarning } from 'lucide-react'
import {
  AuthHeader,
  AuthShell,
  AuthTitleBlock,
  InlineAlert,
  PrimaryButton,
  ResendCodeControl,
  SecondaryButton,
  SuccessPanel,
  SupportLink,
  TextButton,
} from '../../components/auth'
import type { AuthShellLayout } from '../../components/auth/AuthShell'
import { authConfig, maskEmail } from '../../data/authConfig'

export type EmailVerificationVariant = 'pending' | 'expired' | 'alreadyUsed' | 'success'

export interface EmailVerificationScreenProps {
  layout?: AuthShellLayout
  headerTrailing?: ReactNode
  variant?: EmailVerificationVariant
  email?: string
  onContinue?: () => void
  onChangeEmail?: () => void
  onBackToSignIn?: () => void
  onClose?: () => void
  staticPreview?: boolean
}

/** Landing screen for the emailed verification link, plus its failure states. */
export default function EmailVerificationScreen({
  layout = 'auto',
  headerTrailing,
  variant = 'pending',
  email = 'traveler@example.com',
  onContinue,
  onChangeEmail,
  onBackToSignIn,
  onClose,
  staticPreview = false,
}: EmailVerificationScreenProps) {
  const [resending, setResending] = useState(false)
  const [resendToken, setResendToken] = useState(0)
  const [resent, setResent] = useState(false)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])

  const masked = maskEmail(email)

  function handleResend() {
    setResending(true)
    if (staticPreview) return
    const id = window.setTimeout(() => {
      setResending(false)
      setResent(true)
      setResendToken(token => token + 1)
    }, 900)
    timers.current.push(id)
  }

  const shell = {
    layout,
    image: 'dunes' as const,
    imageSide: 'left' as const,
    panelHeadline: 'Almost there.',
    panelSupporting: 'Confirming your email keeps your bookings and messages tied to you alone.',
  }

  if (variant === 'success') {
    return (
      <AuthShell {...shell} header={<AuthHeader trailing={headerTrailing} onClose={onClose} />}>
        <SuccessPanel
          title="Email verified"
          message="Thanks — your email address is confirmed. You can carry on where you left off."
          primaryAction={<PrimaryButton onClick={onContinue}>Continue to Delve</PrimaryButton>}
        />
      </AuthShell>
    )
  }

  const isProblem = variant === 'expired' || variant === 'alreadyUsed'

  return (
    <AuthShell {...shell} header={<AuthHeader trailing={headerTrailing} onClose={onClose} />}>
      <AuthTitleBlock
        icon={isProblem ? <MailWarning size={24} /> : <MailCheck size={24} />}
        title={
          variant === 'expired'
            ? 'That link has expired'
            : variant === 'alreadyUsed'
              ? 'That link has already been used'
              : 'Verify your email address'
        }
        subtitle={
          variant === 'expired' ? (
            <>
              Verification links are valid for {authConfig.verification.otpExpiryMinutes} minutes. Request a fresh one
              and we will send it to {masked}.
            </>
          ) : variant === 'alreadyUsed' ? (
            <>
              This address may already be verified. Try signing in — if that does not work, request a new link for{' '}
              {masked}.
            </>
          ) : (
            <>
              We sent a verification link to <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{masked}</span>.
              Open it on this device to finish setting up your account.
            </>
          )
        }
      />

      <div className="flex flex-col gap-4">
        {resent && (
          <InlineAlert tone="success" onDismiss={() => setResent(false)}>
            A new verification link is on its way to {masked}.
          </InlineAlert>
        )}

        {variant === 'expired' && (
          <InlineAlert tone="warning" title="Nothing is lost">
            Your account details are saved. You only need a new link to confirm the address.
          </InlineAlert>
        )}

        <div
          className="rounded-xl p-3.5"
          style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--fg)' }}>
            Did not receive it?
          </p>
          <p className="text-xs mb-1" style={{ color: 'var(--fg-muted)' }}>
            Check spam and promotional folders first.
          </p>
          <ResendCodeControl
            onResend={handleResend}
            sending={resending}
            resetToken={resendToken}
            startImmediately={variant === 'pending' && !staticPreview}
            label="Send a new link"
          />
        </div>

        {variant === 'alreadyUsed' ? (
          <PrimaryButton onClick={onBackToSignIn}>Go to sign in</PrimaryButton>
        ) : (
          <SecondaryButton onClick={onChangeEmail}>Use a different email address</SecondaryButton>
        )}

        <TextButton align="center" tone="muted" onClick={onBackToSignIn}>
          Back to sign in
        </TextButton>

        <SupportLink />
      </div>
    </AuthShell>
  )
}
