import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { KeyRound, MailCheck, ShieldCheck } from 'lucide-react'
import {
  AuthForm,
  AuthHeader,
  AuthShell,
  AuthTitleBlock,
  EmailField,
  InlineAlert,
  OTPInput,
  PasswordField,
  PasswordRequirementList,
  PasswordStrength,
  PrimaryButton,
  ResendCodeControl,
  SecondaryButton,
  SuccessPanel,
  SupportLink,
  TextButton,
} from '../../components/auth'
import type { AuthShellLayout } from '../../components/auth/AuthShell'
import { authConfig, evaluatePassword, isValidEmail, maskEmail } from '../../data/authConfig'

export type ForgotPasswordStep = 'request' | 'checkInbox' | 'enterCode' | 'createPassword' | 'updated'

export interface ForgotPasswordFlowProps {
  layout?: AuthShellLayout
  headerTrailing?: ReactNode
  /** Renders a single step for the design board; omit for the full flow. */
  step?: ForgotPasswordStep
  onStepChange?: (step: ForgotPasswordStep) => void
  onBackToSignIn?: () => void
  onDone?: () => void
  onClose?: () => void
  initialEmail?: string
  staticPreview?: boolean
  previewCodeError?: 'invalid' | 'expired' | 'alreadyUsed' | 'tooManyAttempts' | null
}

export default function ForgotPasswordFlow({
  layout = 'auto',
  headerTrailing,
  step: controlledStep,
  onStepChange,
  onBackToSignIn,
  onDone,
  onClose,
  initialEmail = '',
  staticPreview = false,
  previewCodeError = null,
}: ForgotPasswordFlowProps) {
  const [internalStep, setInternalStep] = useState<ForgotPasswordStep>('request')
  const step = controlledStep ?? internalStep

  const [email, setEmail] = useState(initialEmail)
  const [touched, setTouched] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)

  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendToken, setResendToken] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [codeError, setCodeError] = useState<'invalid' | 'expired' | 'alreadyUsed' | 'tooManyAttempts' | null>(
    previewCodeError,
  )

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordTouched, setPasswordTouched] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])

  function schedule(callback: () => void, delay: number) {
    if (staticPreview) return
    const id = window.setTimeout(callback, delay)
    timers.current.push(id)
  }

  function goToStep(next: ForgotPasswordStep) {
    if (controlledStep === undefined) setInternalStep(next)
    onStepChange?.(next)
  }

  const emailError =
    (touched || submitted) && !email.trim()
      ? 'Enter your email address'
      : (touched || submitted) && !isValidEmail(email)
        ? 'Enter a valid email address'
        : undefined

  const masked = maskEmail(email || 'traveler@example.com')
  const evaluation = evaluatePassword(password)

  function handleRequest() {
    setSubmitted(true)
    if (!isValidEmail(email)) return
    setSending(true)
    schedule(() => {
      setSending(false)
      setResendToken(token => token + 1)
      // The response is identical whether or not an account exists.
      goToStep('checkInbox')
    }, 1100)
  }

  function handleCheckCode(value = code) {
    if (value.length < authConfig.verification.otpLength) {
      setCodeError('invalid')
      return
    }
    setChecking(true)
    schedule(() => {
      setChecking(false)
      if (value === '000000') {
        const next = attempts + 1
        setAttempts(next)
        setCodeError(next >= authConfig.verification.maximumAttempts ? 'tooManyAttempts' : 'invalid')
        return
      }
      if (value === '111111') {
        setCodeError('expired')
        return
      }
      if (value === '222222') {
        setCodeError('alreadyUsed')
        return
      }
      setCodeError(null)
      goToStep('createPassword')
    }, 950)
  }

  function handleResend() {
    setResending(true)
    setCodeError(null)
    schedule(() => {
      setResending(false)
      setAttempts(0)
      setCode('')
      setResendToken(token => token + 1)
    }, 900)
  }

  function handleSavePassword() {
    setPasswordTouched({ password: true, confirmPassword: true })
    if (!evaluation.meetsPolicy || password !== confirmPassword || !confirmPassword) return
    setSaving(true)
    schedule(() => {
      setSaving(false)
      goToStep('updated')
    }, 1100)
  }

  const shellProps = {
    layout,
    image: 'coast' as const,
    imageSide: 'left' as const,
    panelHeadline: 'Locked out? It happens on the road.',
    panelSupporting:
      'We keep recovery deliberately private — we never confirm whether an address belongs to a Delve account.',
  }

  // ── Request ──────────────────────────────────────────────────────────────
  if (step === 'request') {
    return (
      <AuthShell
        {...shellProps}
        header={<AuthHeader onBack={onBackToSignIn} backLabel="Back to sign in" trailing={headerTrailing} />}
      >
        <AuthTitleBlock
          icon={<KeyRound size={24} />}
          title="Reset your password"
          subtitle="Enter the email address on your Delve account and we will send you a recovery code."
        />

        <AuthForm onSubmit={handleRequest} busy={sending} ariaLabel="Request a password reset">
          <EmailField
            id="recovery-email"
            value={email}
            onChange={setEmail}
            onBlur={() => setTouched(true)}
            error={emailError}
            autoComplete="email"
            required
            autoFocus={!staticPreview}
          />
          <PrimaryButton type="submit" loading={sending} loadingLabel="Sending recovery code…">
            Send recovery code
          </PrimaryButton>
          <SecondaryButton onClick={onBackToSignIn}>Back to sign in</SecondaryButton>
        </AuthForm>

        <div className="mt-5">
          <SupportLink />
        </div>
      </AuthShell>
    )
  }

  // ── Neutral confirmation ─────────────────────────────────────────────────
  if (step === 'checkInbox') {
    return (
      <AuthShell
        {...shellProps}
        header={<AuthHeader onBack={() => goToStep('request')} trailing={headerTrailing} onClose={onClose} />}
      >
        <AuthTitleBlock
          icon={<MailCheck size={24} />}
          title="Check your inbox"
          subtitle={
            <>
              If an account is registered to <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{masked}</span>, a{' '}
              {authConfig.verification.otpLength}-digit recovery code is on its way. The code expires in{' '}
              {authConfig.verification.otpExpiryMinutes} minutes.
            </>
          }
        />

        <div className="flex flex-col gap-4">
          <InlineAlert tone="info" title="Why we word it this way">
            Delve never confirms whether an email address has an account. It keeps your account private from anyone
            guessing addresses.
          </InlineAlert>

          <PrimaryButton onClick={() => goToStep('enterCode')}>I have the code</PrimaryButton>

          <div
            className="rounded-xl p-3.5"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--fg)' }}>
              Nothing arrived?
            </p>
            <p className="text-xs mb-1" style={{ color: 'var(--fg-muted)' }}>
              Look in spam, then request another code.
            </p>
            <ResendCodeControl
              onResend={handleResend}
              sending={resending}
              resetToken={resendToken}
              startImmediately={!staticPreview}
            />
          </div>

          <TextButton align="center" tone="muted" onClick={onBackToSignIn}>
            Back to sign in
          </TextButton>
        </div>
      </AuthShell>
    )
  }

  // ── Enter recovery code ──────────────────────────────────────────────────
  if (step === 'enterCode') {
    const codeMessage =
      codeError === 'invalid'
        ? `That code is not correct. ${Math.max(0, authConfig.verification.maximumAttempts - attempts)} attempts left.`
        : codeError === 'expired'
          ? 'That code has expired. Request a new one below.'
          : codeError === 'alreadyUsed'
            ? 'That code has already been used. Request a new one below.'
            : undefined

    return (
      <AuthShell
        {...shellProps}
        header={<AuthHeader onBack={() => goToStep('checkInbox')} trailing={headerTrailing} onClose={onClose} />}
      >
        <AuthTitleBlock
          icon={<ShieldCheck size={24} />}
          title="Enter your recovery code"
          subtitle={<>Type the {authConfig.verification.otpLength}-digit code we sent to {masked}.</>}
        />

        <div className="flex flex-col gap-4">
          {codeError === 'tooManyAttempts' && (
            <InlineAlert tone="warning" title="Too many attempts">
              For your security this code is now blocked. Request a new one to continue.
            </InlineAlert>
          )}

          <AuthForm onSubmit={() => handleCheckCode()} busy={checking} ariaLabel="Enter your recovery code">
            <OTPInput
              value={code}
              onChange={setCode}
              onComplete={value => handleCheckCode(value)}
              loading={checking}
              disabled={codeError === 'tooManyAttempts'}
              autoFocus={!staticPreview}
              error={codeMessage}
              hint="The code is only valid once."
            />
            <PrimaryButton
              type="submit"
              loading={checking}
              loadingLabel="Checking your code…"
              disabled={codeError === 'tooManyAttempts'}
            >
              Continue
            </PrimaryButton>
          </AuthForm>

          <ResendCodeControl
            onResend={handleResend}
            sending={resending}
            resetToken={resendToken}
            startImmediately={!staticPreview}
            label="Send a new code"
          />

          <TextButton align="center" tone="muted" onClick={onBackToSignIn}>
            Back to sign in
          </TextButton>
        </div>
      </AuthShell>
    )
  }

  // ── Create new password ──────────────────────────────────────────────────
  if (step === 'createPassword') {
    const passwordError = passwordTouched.password
      ? !password
        ? 'Create a new password'
        : !evaluation.meetsPolicy
          ? 'Your password does not meet all of the requirements yet'
          : undefined
      : undefined
    const confirmError = passwordTouched.confirmPassword
      ? !confirmPassword
        ? 'Re-enter your new password'
        : confirmPassword !== password
          ? 'Both passwords need to match'
          : undefined
      : undefined

    return (
      <AuthShell {...shellProps} header={<AuthHeader trailing={headerTrailing} onClose={onClose} />}>
        <AuthTitleBlock
          icon={<KeyRound size={24} />}
          title="Create a new password"
          subtitle="Choose something you have not used on Delve before. You will be signed out on other devices."
        />

        <AuthForm onSubmit={handleSavePassword} busy={saving} ariaLabel="Create a new password">
          <div>
            <PasswordField
              id="new-password"
              label="New password"
              value={password}
              onChange={setPassword}
              onBlur={() => setPasswordTouched(current => ({ ...current, password: true }))}
              error={passwordError}
              autoComplete="new-password"
              required
              autoFocus={!staticPreview}
            />
            <PasswordStrength evaluation={evaluation} />
            <PasswordRequirementList value={password} columns={2} showState={password.length > 0} />
          </div>

          <PasswordField
            id="confirm-new-password"
            label="Confirm new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            onBlur={() => setPasswordTouched(current => ({ ...current, confirmPassword: true }))}
            error={confirmError}
            successMessage={
              confirmPassword && confirmPassword === password && evaluation.meetsPolicy ? 'Passwords match' : undefined
            }
            autoComplete="new-password"
            required
          />

          <PrimaryButton type="submit" loading={saving} loadingLabel="Updating your password…">
            Update password
          </PrimaryButton>
        </AuthForm>
      </AuthShell>
    )
  }

  // ── Password updated ─────────────────────────────────────────────────────
  return (
    <AuthShell {...shellProps} header={<AuthHeader trailing={headerTrailing} />}>
      <SuccessPanel
        title="Password updated"
        message="You can sign in with your new password now. Any other devices that were signed in have been signed out."
        primaryAction={<PrimaryButton onClick={onDone ?? onBackToSignIn}>Sign in</PrimaryButton>}
      />
    </AuthShell>
  )
}
