import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { MailCheck, MailWarning } from 'lucide-react'
import {
  AuthHeader,
  AuthShell,
  AuthTitleBlock,
  InlineAlert,
  OTPInput,
  PrimaryButton,
  ResendCodeControl,
  SecondaryButton,
  SuccessPanel,
  SupportLink,
  TextButton,
} from '../../components/auth'
import type { AuthShellLayout } from '../../components/auth/AuthShell'
import { authConfig, maskEmail } from '../../data/authConfig'
import { resendVerificationEmail, verifyEmailCode } from '../../api/authClient'

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

/** Email verification with 6-digit OTP code entry. */
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
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendToken, setResendToken] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [verified, setVerified] = useState(variant === 'success')
  const [resent, setResent] = useState(false)

  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])

  const masked = maskEmail(email)

  async function handleVerify(value = code) {
    if (value.length < authConfig.verification.otpLength) {
      setError('Enter all six digits.')
      return
    }
    if (staticPreview) {
      setVerified(true)
      return
    }

    setChecking(true)
    setError(null)
    try {
      const data = await verifyEmailCode(email, value)
      if (data.result === 'success' || data.result === 'already_verified') {
        setVerified(true)
        return
      }
      setError(data.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify that code right now.')
    } finally {
      setChecking(false)
    }
  }

  async function handleResend() {
    setResending(true)
    setError(null)
    if (staticPreview) {
      setResending(false)
      setResent(true)
      setResendToken(token => token + 1)
      return
    }
    try {
      await resendVerificationEmail(email)
      setResent(true)
      setResendToken(token => token + 1)
      setCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend right now.')
    } finally {
      setResending(false)
    }
  }

  const shell = {
    layout,
    image: 'dunes' as const,
    imageSide: 'left' as const,
    panelHeadline: 'Almost there.',
    panelSupporting: 'Confirming your email keeps your bookings and messages tied to you alone.',
  }

  if (verified) {
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
            ? 'That code has expired'
            : variant === 'alreadyUsed'
              ? 'That code has already been used'
              : 'Verify your email address'
        }
        subtitle={
          variant === 'expired' ? (
            <>
              Verification codes are valid for {authConfig.verification.otpExpiryMinutes} minutes. Request a fresh one
              and we will send it to {masked}.
            </>
          ) : variant === 'alreadyUsed' ? (
            <>
              This address may already be verified. Try signing in — if that does not work, request a new code for{' '}
              {masked}.
            </>
          ) : (
            <>
              We sent a 6-digit code to <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{masked}</span>. Enter it
              below to finish setting up your account.
            </>
          )
        }
      />

      <div className="flex flex-col gap-4">
        {resent && (
          <InlineAlert tone="success" onDismiss={() => setResent(false)}>
            A new verification code is on its way to {masked}.
          </InlineAlert>
        )}

        {variant === 'expired' && (
          <InlineAlert tone="warning" title="Nothing is lost">
            Your account details are saved. You only need a new code to confirm the address.
          </InlineAlert>
        )}

        <OTPInput
          value={code}
          onChange={setCode}
          error={error || undefined}
          disabled={checking}
          loading={checking}
          autoFocus={!staticPreview}
          onComplete={value => void handleVerify(value)}
        />

        <PrimaryButton
          loading={checking}
          loadingLabel="Verifying…"
          onClick={() => void handleVerify()}
          disabled={code.length < authConfig.verification.otpLength}
        >
          Verify email
        </PrimaryButton>

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
            onResend={() => void handleResend()}
            sending={resending}
            resetToken={resendToken}
            startImmediately={variant === 'pending' && !staticPreview}
            label="Send a new code"
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
