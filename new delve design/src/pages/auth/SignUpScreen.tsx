import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Compass, Mail, MessageSquare, UserRound } from 'lucide-react'
import {
  AuthDivider,
  AuthForm,
  AuthHeader,
  AuthShell,
  AuthTitleBlock,
  Checkbox,
  EmailField,
  FormErrorSummary,
  InlineAlert,
  OTPInput,
  PasswordField,
  PasswordRequirementList,
  PasswordStrength,
  PhoneField,
  PrimaryButton,
  ResendCodeControl,
  SecondaryButton,
  SocialAuthGroup,
  SuccessPanel,
  TermsAndPrivacyText,
  TextButton,
  TextField,
} from '../../components/auth'
import type { AuthShellLayout } from '../../components/auth/AuthShell'
import type { FormErrorSummaryItem } from '../../components/auth/FormErrorSummary'
import {
  authConfig,
  countryByCode,
  evaluatePassword,
  isValidEmail,
  isValidPhone,
  maskEmail,
  maskPhone,
} from '../../data/authConfig'
import type { SocialProviderId, VerificationChannel } from '../../data/authConfig'

export type SignUpStep = 1 | 2 | 3

export interface SignUpScreenProps {
  layout?: AuthShellLayout
  headerTrailing?: ReactNode
  /** Renders a single step for the design board; omit for the full flow. */
  step?: SignUpStep
  onStepChange?: (step: SignUpStep) => void
  onNavigateSignIn?: () => void
  onComplete?: () => void
  onSetUpProfile?: () => void
  onClose?: () => void
  staticPreview?: boolean
  /** Forces the verify step to show a specific problem. */
  previewVerificationError?: 'invalid' | 'expired' | 'tooManyAttempts' | null
}

const stepLabels: Record<SignUpStep, string> = {
  1: 'Create account',
  2: 'Verify identity',
  3: 'All set',
}

export default function SignUpScreen({
  layout = 'auto',
  headerTrailing,
  step: controlledStep,
  onStepChange,
  onNavigateSignIn,
  onComplete,
  onSetUpProfile,
  onClose,
  staticPreview = false,
  previewVerificationError = null,
}: SignUpScreenProps) {
  const [internalStep, setInternalStep] = useState<SignUpStep>(1)
  const step = controlledStep ?? internalStep

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [countryCode, setCountryCode] = useState(authConfig.defaultCountryCode)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [consentGiven, setConsentGiven] = useState(false)
  // Marketing consent is optional and must never start checked.
  const [marketingOptIn, setMarketingOptIn] = useState(false)

  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const [creating, setCreating] = useState(false)
  const [socialLoading, setSocialLoading] = useState<SocialProviderId | null>(null)

  const [channel, setChannel] = useState<VerificationChannel>('email')
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendToken, setResendToken] = useState(0)
  const [resendConfirmed, setResendConfirmed] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [verificationError, setVerificationError] = useState<'invalid' | 'expired' | 'tooManyAttempts' | null>(
    previewVerificationError,
  )

  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])

  function schedule(callback: () => void, delay: number) {
    if (staticPreview) return
    const id = window.setTimeout(callback, delay)
    timers.current.push(id)
  }

  function goToStep(next: SignUpStep) {
    if (controlledStep === undefined) setInternalStep(next)
    onStepChange?.(next)
  }

  const country = countryByCode(countryCode)
  const passwordEvaluation = evaluatePassword(password)
  const show = (field: string) => touched[field] || submitted

  const errors = {
    firstName: show('firstName') && !firstName.trim() ? 'Enter your first name' : undefined,
    lastName: show('lastName') && !lastName.trim() ? 'Enter your last name' : undefined,
    email: show('email')
      ? !email.trim()
        ? 'Enter your email address'
        : !isValidEmail(email)
          ? 'Enter a valid email address'
          : undefined
      : undefined,
    phone:
      show('phone') && phone.trim() && !isValidPhone(phone, country.exampleLength)
        ? `Enter a valid ${country.label} number`
        : undefined,
    password: show('password')
      ? !password
        ? 'Create a password'
        : !passwordEvaluation.meetsPolicy
          ? 'Your password does not meet all of the requirements yet'
          : undefined
      : undefined,
    confirmPassword: show('confirmPassword')
      ? !confirmPassword
        ? 'Re-enter your password'
        : confirmPassword !== password
          ? 'Both passwords need to match'
          : undefined
      : undefined,
    consent: submitted && !consentGiven ? 'Accept the Terms and Privacy Policy to continue' : undefined,
  }

  const summaryErrors: FormErrorSummaryItem[] = submitted
    ? (
        [
          ['signup-first-name', errors.firstName],
          ['signup-last-name', errors.lastName],
          ['signup-email', errors.email],
          ['signup-phone', errors.phone],
          ['signup-password', errors.password],
          ['signup-confirm-password', errors.confirmPassword],
          ['signup-consent', errors.consent],
        ] as const
      )
        .filter((entry): entry is readonly [string, string] => Boolean(entry[1]))
        .map(([fieldId, message]) => ({ fieldId, message }))
    : []

  function handleCreateAccount() {
    setSubmitted(true)
    const blocking =
      !firstName.trim() ||
      !lastName.trim() ||
      !isValidEmail(email) ||
      !passwordEvaluation.meetsPolicy ||
      confirmPassword !== password ||
      !confirmPassword ||
      !consentGiven ||
      Boolean(phone.trim() && !isValidPhone(phone, country.exampleLength))
    if (blocking) return

    setCreating(true)
    schedule(() => {
      setCreating(false)
      setChannel('email')
      setResendToken(token => token + 1)
      goToStep(2)
    }, 1200)
  }

  function handleVerify(submittedCode = code) {
    if (submittedCode.length < authConfig.verification.otpLength) {
      setVerificationError('invalid')
      return
    }
    setVerifying(true)
    setResendConfirmed(false)
    schedule(() => {
      setVerifying(false)
      // Demo triggers so every documented verification state is reachable.
      if (submittedCode === '000000') {
        const nextAttempts = attempts + 1
        setAttempts(nextAttempts)
        setVerificationError(nextAttempts >= authConfig.verification.maximumAttempts ? 'tooManyAttempts' : 'invalid')
        return
      }
      if (submittedCode === '111111') {
        setVerificationError('expired')
        return
      }
      setVerificationError(null)
      goToStep(3)
    }, 1000)
  }

  function handleResend() {
    setResending(true)
    setVerificationError(null)
    schedule(() => {
      setResending(false)
      setResendConfirmed(true)
      setAttempts(0)
      setCode('')
      setResendToken(token => token + 1)
    }, 900)
  }

  function handleSocial(provider: SocialProviderId) {
    setSocialLoading(provider)
    schedule(() => {
      setSocialLoading(null)
      goToStep(3)
    }, 1100)
  }

  const maskedTarget =
    channel === 'email'
      ? maskEmail(email || 'traveler@example.com')
      : maskPhone(country.dialCode, phone || '811234567')

  // ── Step 1 ───────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <AuthShell
        layout={layout}
        image="coast"
        imageSide="right"
        panelHeadline="Join the travelers who share what actually works."
        panelSupporting="Real prices, real routes, real recommendations — from people who have just been there."
        header={
          <AuthHeader
            onClose={onClose}
            trailing={headerTrailing}
            step={{ current: 1, total: 3, label: stepLabels[1] }}
          />
        }
        footer={<TermsAndPrivacyText actionLabel="creating an account" />}
      >
        <AuthTitleBlock
          title="Create your Delve account"
          subtitle="It takes about a minute. You only need an email address to get started."
        />

        <div className="flex flex-col gap-4">
          {summaryErrors.length > 0 && <FormErrorSummary errors={summaryErrors} />}

          <AuthForm onSubmit={handleCreateAccount} busy={creating} ariaLabel="Create your Delve account">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="signup-first-name"
                label="First name"
                value={firstName}
                onChange={setFirstName}
                onBlur={() => setTouched(current => ({ ...current, firstName: true }))}
                error={errors.firstName}
                autoComplete="given-name"
                iconLeft={<UserRound size={17} />}
                required
              />
              <TextField
                id="signup-last-name"
                label="Last name"
                value={lastName}
                onChange={setLastName}
                onBlur={() => setTouched(current => ({ ...current, lastName: true }))}
                error={errors.lastName}
                autoComplete="family-name"
                required
              />
            </div>

            <EmailField
              id="signup-email"
              value={email}
              onChange={setEmail}
              onBlur={() => setTouched(current => ({ ...current, email: true }))}
              error={errors.email}
              hint="We send your verification code and booking confirmations here."
              autoComplete="email"
              required
            />

            <PhoneField
              countryCode={countryCode}
              onCountryChange={setCountryCode}
              value={phone}
              onChange={setPhone}
              onBlur={() => setTouched(current => ({ ...current, phone: true }))}
              error={errors.phone}
              optionalLabel
              hint="Optional. Adds SMS verification and lets hosts reach you about a booking."
            />

            <div>
              <PasswordField
                id="signup-password"
                label="Create password"
                value={password}
                onChange={setPassword}
                onBlur={() => setTouched(current => ({ ...current, password: true }))}
                error={errors.password}
                autoComplete="new-password"
                required
              />
              <PasswordStrength evaluation={passwordEvaluation} />
              <PasswordRequirementList value={password} columns={2} showState={password.length > 0} />
            </div>

            {authConfig.passwordRules.requireConfirmation && (
              <PasswordField
                id="signup-confirm-password"
                label="Confirm password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                onBlur={() => setTouched(current => ({ ...current, confirmPassword: true }))}
                error={errors.confirmPassword}
                successMessage={
                  confirmPassword && confirmPassword === password && passwordEvaluation.meetsPolicy
                    ? 'Passwords match'
                    : undefined
                }
                autoComplete="new-password"
                required
              />
            )}

            <div className="flex flex-col gap-1 pt-1">
              <Checkbox
                id="signup-consent"
                checked={consentGiven}
                onChange={setConsentGiven}
                error={errors.consent}
                required
                label={<TermsAndPrivacyText variant="consent" />}
              />
              {authConfig.marketingConsentEnabled && (
                <Checkbox
                  checked={marketingOptIn}
                  onChange={setMarketingOptIn}
                  label="Send me travel deals and Delve updates"
                  description="Optional. You can change this at any time in your settings."
                />
              )}
            </div>

            <PrimaryButton type="submit" loading={creating} loadingLabel="Creating your account…">
              Create account
            </PrimaryButton>
          </AuthForm>

          {authConfig.socialProviders.some(provider => provider.enabled) && (
            <>
              <AuthDivider label="or sign up with" />
              <SocialAuthGroup
                onSelect={handleSocial}
                loadingProvider={socialLoading}
                disabled={creating}
                labelPrefix="Sign up with"
              />
            </>
          )}

          <p className="text-sm text-center" style={{ color: 'var(--fg-muted)' }}>
            Already have an account?{' '}
            <button
              type="button"
              onClick={onNavigateSignIn}
              className="font-semibold"
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}
            >
              Sign in
            </button>
          </p>
        </div>
      </AuthShell>
    )
  }

  // ── Step 2 ───────────────────────────────────────────────────────────────
  if (step === 2) {
    const canSwitchChannel =
      authConfig.verification.phoneVerificationSupported &&
      authConfig.verification.channels.includes('sms') &&
      Boolean(phone.trim())

    return (
      <AuthShell
        layout={layout}
        image="coast"
        imageSide="right"
        panelHeadline="One quick check and you are on your way."
        panelSupporting="Verifying your contact details keeps bookings and messages safe for everyone."
        header={
          <AuthHeader
            onBack={() => goToStep(1)}
            backLabel="Back"
            trailing={headerTrailing}
            step={{ current: 2, total: 3, label: stepLabels[2] }}
          />
        }
      >
        <AuthTitleBlock
          icon={channel === 'email' ? <Mail size={24} /> : <MessageSquare size={24} />}
          title="Verify it is you"
          subtitle={
            <>
              We sent a {authConfig.verification.otpLength}-digit code to{' '}
              <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{maskedTarget}</span>. It expires in{' '}
              {authConfig.verification.otpExpiryMinutes} minutes.
            </>
          }
        />

        <div className="flex flex-col gap-4">
          {resendConfirmed && (
            <InlineAlert tone="success" onDismiss={() => setResendConfirmed(false)}>
              A new code is on its way to {maskedTarget}.
            </InlineAlert>
          )}

          {verificationError === 'tooManyAttempts' && (
            <InlineAlert tone="warning" title="Too many attempts">
              You have used all {authConfig.verification.maximumAttempts} attempts for that code. Request a new one to
              try again.
            </InlineAlert>
          )}

          <AuthForm onSubmit={() => handleVerify()} busy={verifying} ariaLabel="Verify your account">
            <OTPInput
              value={code}
              onChange={setCode}
              onComplete={value => handleVerify(value)}
              loading={verifying}
              disabled={verificationError === 'tooManyAttempts'}
              autoFocus={!staticPreview}
              error={
                verificationError === 'invalid'
                  ? `That code is not correct. ${Math.max(
                      0,
                      authConfig.verification.maximumAttempts - attempts,
                    )} attempts left.`
                  : verificationError === 'expired'
                    ? 'That code has expired. Request a new one below.'
                    : undefined
              }
              hint="Enter the code exactly as it appears in the message."
            />

            <PrimaryButton
              type="submit"
              loading={verifying}
              loadingLabel="Checking your code…"
              disabled={verificationError === 'tooManyAttempts'}
            >
              Verify and continue
            </PrimaryButton>
          </AuthForm>

          <div
            className="rounded-xl p-3.5 flex flex-col gap-1"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
              Did not get the code?
            </p>
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
              Check your spam folder before requesting another one.
            </p>
            <ResendCodeControl
              onResend={handleResend}
              sending={resending}
              resetToken={resendToken}
              startImmediately={!staticPreview}
            />
          </div>

          <div className="flex flex-col gap-1">
            <TextButton onClick={() => goToStep(1)}>
              Change {channel === 'email' ? 'email address' : 'phone number'}
            </TextButton>
            {canSwitchChannel && (
              <TextButton
                onClick={() => {
                  setChannel(current => (current === 'email' ? 'sms' : 'email'))
                  setCode('')
                  setVerificationError(null)
                  setResendToken(token => token + 1)
                }}
              >
                {channel === 'email' ? 'Send the code by SMS instead' : 'Send the code by email instead'}
              </TextButton>
            )}
          </div>
        </div>
      </AuthShell>
    )
  }

  // ── Step 3 ───────────────────────────────────────────────────────────────
  return (
    <AuthShell
      layout={layout}
      image="dunes"
      imageSide="right"
      panelHeadline="Your first journey starts now."
      panelSupporting="Follow travelers, save the places that catch your eye and compare what trips really cost."
      header={<AuthHeader trailing={headerTrailing} step={{ current: 3, total: 3, label: stepLabels[3] }} />}
    >
      <SuccessPanel
        icon={<Compass size={30} />}
        title="You're ready to Delve"
        message={
          <>
            Your account is verified and ready. Jump straight into what is happening around you, or add a few profile
            details first — either way, nothing else is required.
          </>
        }
        primaryAction={<PrimaryButton onClick={onComplete}>Start exploring</PrimaryButton>}
        secondaryAction={<SecondaryButton onClick={onSetUpProfile}>Set up my profile</SecondaryButton>}
      />
    </AuthShell>
  )
}
