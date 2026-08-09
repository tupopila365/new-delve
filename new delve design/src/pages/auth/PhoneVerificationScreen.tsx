import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { PhoneCall, Smartphone } from 'lucide-react'
import {
  AuthForm,
  AuthHeader,
  AuthShell,
  AuthTitleBlock,
  InlineAlert,
  OTPInput,
  PrimaryButton,
  ResendCodeControl,
  SuccessPanel,
  SupportLink,
  TextButton,
} from '../../components/auth'
import type { AuthShellLayout } from '../../components/auth/AuthShell'
import { authConfig, countryByCode, maskPhone } from '../../data/authConfig'

export interface PhoneVerificationScreenProps {
  layout?: AuthShellLayout
  headerTrailing?: ReactNode
  countryCode?: string
  phoneNumber?: string
  onVerified?: () => void
  onChangeNumber?: () => void
  onSkip?: () => void
  onClose?: () => void
  staticPreview?: boolean
  previewVariant?: 'entry' | 'error' | 'success'
}

export default function PhoneVerificationScreen({
  layout = 'auto',
  headerTrailing,
  countryCode = authConfig.defaultCountryCode,
  phoneNumber = '811234567',
  onVerified,
  onChangeNumber,
  onSkip,
  onClose,
  staticPreview = false,
  previewVariant = 'entry',
}: PhoneVerificationScreenProps) {
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendToken, setResendToken] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState<string | null>(previewVariant === 'error' ? 'That code is not correct.' : null)
  const [verified, setVerified] = useState(previewVariant === 'success')
  const [voiceRequested, setVoiceRequested] = useState(false)

  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])

  function schedule(callback: () => void, delay: number) {
    if (staticPreview) return
    const id = window.setTimeout(callback, delay)
    timers.current.push(id)
  }

  const country = countryByCode(countryCode)
  const masked = maskPhone(country.dialCode, phoneNumber)

  function handleVerify(value = code) {
    if (value.length < authConfig.verification.otpLength) {
      setError('Enter all six digits.')
      return
    }
    setChecking(true)
    schedule(() => {
      setChecking(false)
      if (value === '000000') {
        const next = attempts + 1
        setAttempts(next)
        setError(
          next >= authConfig.verification.maximumAttempts
            ? 'Too many attempts. Request a new code to try again.'
            : `That code is not correct. ${authConfig.verification.maximumAttempts - next} attempts left.`,
        )
        return
      }
      setError(null)
      setVerified(true)
      schedule(() => onVerified?.(), 900)
    }, 950)
  }

  function handleResend() {
    setResending(true)
    setError(null)
    schedule(() => {
      setResending(false)
      setAttempts(0)
      setCode('')
      setResendToken(token => token + 1)
    }, 900)
  }

  const shell = {
    layout,
    image: 'coast' as const,
    imageSide: 'left' as const,
    panelHeadline: 'A verified number means smoother bookings.',
    panelSupporting: 'Hosts and drivers can reach you about a pickup or a change of plan, and only about that.',
  }

  if (verified) {
    return (
      <AuthShell {...shell} header={<AuthHeader trailing={headerTrailing} onClose={onClose} />}>
        <SuccessPanel
          title="Phone number verified"
          message={<>We have confirmed {masked}. You can update it any time from your account settings.</>}
          primaryAction={<PrimaryButton onClick={onVerified}>Continue</PrimaryButton>}
        />
      </AuthShell>
    )
  }

  return (
    <AuthShell {...shell} header={<AuthHeader trailing={headerTrailing} onClose={onClose} />}>
      <AuthTitleBlock
        icon={<Smartphone size={24} />}
        title="Verify your phone number"
        subtitle={
          <>
            We sent a {authConfig.verification.otpLength}-digit code by SMS to{' '}
            <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{masked}</span>.
          </>
        }
      />

      <div className="flex flex-col gap-4">
        {voiceRequested && (
          <InlineAlert tone="info" onDismiss={() => setVoiceRequested(false)}>
            We are calling {masked} now with your code.
          </InlineAlert>
        )}

        <AuthForm onSubmit={() => handleVerify()} busy={checking} ariaLabel="Verify your phone number">
          <OTPInput
            value={code}
            onChange={setCode}
            onComplete={value => handleVerify(value)}
            loading={checking}
            error={error ?? undefined}
            autoFocus={!staticPreview}
            hint={`Standard message rates may apply. Codes expire after ${authConfig.verification.otpExpiryMinutes} minutes.`}
          />
          <PrimaryButton type="submit" loading={checking} loadingLabel="Checking your code…">
            Verify number
          </PrimaryButton>
        </AuthForm>

        <ResendCodeControl
          onResend={handleResend}
          sending={resending}
          resetToken={resendToken}
          startImmediately={!staticPreview}
          label="Send a new SMS"
        />

        {/* Voice fallback only exists when the backend enables it. */}
        {authConfig.verification.voiceCallFallbackEnabled && (
          <TextButton iconLeft={<PhoneCall size={14} />} onClick={() => setVoiceRequested(true)}>
            Call me with the code instead
          </TextButton>
        )}

        <div className="flex flex-col gap-1">
          <TextButton onClick={onChangeNumber}>Use a different number</TextButton>
          {onSkip && (
            <TextButton tone="muted" onClick={onSkip}>
              Skip for now
            </TextButton>
          )}
        </div>

        <SupportLink />
      </div>
    </AuthShell>
  )
}
