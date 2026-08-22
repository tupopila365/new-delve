import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Mail } from 'lucide-react'
import {
  AuthForm,
  AuthHeader,
  AuthShell,
  AuthTitleBlock,
  Checkbox,
  EmailField,
  FormErrorSummary,
  InlineAlert,
  PasswordField,
  PasswordRequirementList,
  PasswordStrength,
  PrimaryButton,
  SuccessPanel,
  TermsAndPrivacyText,
  TextButton,
  TextField,
  OTPInput,
  ResendCodeControl,
} from '../../components/auth'
import type { AuthShellLayout } from '../../components/auth/AuthShell'
import { authHeaderLogoPlacement } from '../../components/auth/AuthShell'
import type { FormErrorSummaryItem } from '../../components/auth/FormErrorSummary'
import { evaluatePassword, isValidEmail, maskEmail, authConfig } from '../../data/authConfig'
import { AuthApiError, checkUsernameAvailable, registerAccount, resendVerificationEmail, verifyEmailCode } from '../../api/authClient'
import { usernameSchema } from '@delve/contracts'

export type SignUpStep = 1 | 2

export interface SignUpScreenProps {
  layout?: AuthShellLayout
  headerTrailing?: ReactNode
  step?: SignUpStep
  onStepChange?: (step: SignUpStep) => void
  onNavigateSignIn?: () => void
  onComplete?: () => void
  onSetUpProfile?: () => void
  onClose?: () => void
  staticPreview?: boolean
  previewVerificationError?: 'invalid' | 'expired' | 'tooManyAttempts' | null
}

type UsernameFeedback = {
  available: boolean | null
  reason?: string
  networkError?: boolean
}

export default function SignUpScreen({
  layout = 'auto',
  headerTrailing,
  step: controlledStep,
  onStepChange,
  onNavigateSignIn,
  onComplete,
  onClose,
}: SignUpScreenProps) {
  const [internalStep, setInternalStep] = useState<SignUpStep>(1)
  const step = controlledStep ?? internalStep

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [consentGiven, setConsentGiven] = useState(false)
  const [marketingOptIn, setMarketingOptIn] = useState(false)

  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deliveryFailed, setDeliveryFailed] = useState(false)
  const [usernameFeedback, setUsernameFeedback] = useState<UsernameFeedback>({ available: null })
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendNote, setResendNote] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [verificationCode, setVerificationCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [verified, setVerified] = useState(false)
  const [resendToken, setResendToken] = useState(0)

  const usernameTimer = useRef<number | null>(null)
  const usernameAbort = useRef<AbortController | null>(null)
  const cooldownTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (usernameTimer.current) window.clearTimeout(usernameTimer.current)
      usernameAbort.current?.abort()
      if (cooldownTimer.current) window.clearInterval(cooldownTimer.current)
    }
  }, [])

  function startResendCooldown(seconds: number) {
    setResendCooldown(seconds)
    if (cooldownTimer.current) window.clearInterval(cooldownTimer.current)
    cooldownTimer.current = window.setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          if (cooldownTimer.current) window.clearInterval(cooldownTimer.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function goToStep(next: SignUpStep) {
    if (controlledStep === undefined) setInternalStep(next)
    onStepChange?.(next)
  }

  const passwordEvaluation = evaluatePassword(password)
  const show = (field: string) => touched[field] || submitted
  const usernameParsed = usernameSchema.safeParse(username)

  const usernameUnavailableMessage =
    usernameFeedback.reason === 'reserved'
      ? 'That username is reserved'
      : usernameFeedback.reason === 'invalid'
        ? usernameParsed.success
          ? 'Enter a valid username'
          : usernameParsed.error.issues[0]?.message
        : usernameFeedback.reason === 'taken'
          ? 'That username is already taken'
          : usernameFeedback.available === false
            ? 'That username is already taken'
            : undefined

  const errors = {
    username: show('username')
      ? !username.trim()
        ? 'Choose a username'
        : !usernameParsed.success
          ? usernameParsed.error.issues[0]?.message || 'Enter a valid username'
          : usernameUnavailableMessage
      : undefined,
    email: show('email')
      ? !email.trim()
        ? 'Enter your email address'
        : !isValidEmail(email)
          ? 'Enter a valid email address'
          : undefined
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
    consent: show('consent') && !consentGiven ? 'Accept the terms to continue' : undefined,
  }

  const summaryErrors: FormErrorSummaryItem[] = Object.entries(errors)
    .filter(([, message]) => Boolean(message))
    .map(([field, message]) => ({ fieldId: `signup-${field}`, message: message! }))

  function scheduleUsernameCheck(value: string) {
    setUsernameFeedback({ available: null })
    if (usernameTimer.current) window.clearTimeout(usernameTimer.current)
    usernameAbort.current?.abort()

    const parsed = usernameSchema.safeParse(value)
    if (!parsed.success) {
      setUsernameFeedback({ available: false, reason: 'invalid' })
      return
    }

    usernameTimer.current = window.setTimeout(() => {
      const controller = new AbortController()
      usernameAbort.current = controller
      void (async () => {
        setCheckingUsername(true)
        try {
          const result = await checkUsernameAvailable(parsed.data, controller.signal)
          if (controller.signal.aborted) return
          setUsernameFeedback({
            available: result.available,
            reason: result.reason,
          })
        } catch (err) {
          if (controller.signal.aborted) return
          if (err instanceof DOMException && err.name === 'AbortError') return
          setUsernameFeedback({ available: null, networkError: true })
        } finally {
          if (!controller.signal.aborted) setCheckingUsername(false)
        }
      })()
    }, 400)
  }

  async function handleCreateAccount() {
    setSubmitted(true)
    setFormError(null)
    setDeliveryFailed(false)
    if (Object.values(errors).some(Boolean) || !consentGiven) return
    if (usernameFeedback.available === false) return

    setCreating(true)
    try {
      const result = await registerAccount({
        username: username.trim(),
        email: email.trim(),
        password,
        passwordConfirmation: confirmPassword,
      })
      if (result.sessionCreated) {
        onComplete?.()
        return
      }
      if (result.deliveryStatus === 'FAILED') {
        setDeliveryFailed(true)
        setFormError(result.message)
        goToStep(2)
        return
      }
      setDeliveryFailed(false)
      goToStep(2)
      startResendCooldown(60)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create your account')
    } finally {
      setCreating(false)
    }
  }

  async function handleVerifyCode(nextCode = verificationCode) {
    if (nextCode.length < authConfig.verification.otpLength) {
      setCodeError('Enter all six digits.')
      return
    }
    setVerifying(true)
    setCodeError(null)
    try {
      const data = await verifyEmailCode(email.trim(), nextCode)
      if (data.result === 'success' || data.result === 'already_verified') {
        setVerified(true)
        return
      }
      setCodeError(data.message)
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : 'Could not verify that code right now.')
    } finally {
      setVerifying(false)
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return
    setResending(true)
    setResendNote(null)
    try {
      const result = await resendVerificationEmail(email.trim())
      setDeliveryFailed(false)
      setResendNote(result.message)
      startResendCooldown(60)
      setResendToken(token => token + 1)
      setVerificationCode('')
      setCodeError(null)
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 429) {
        const retry =
          err.details && typeof err.details === 'object' && 'retryAfterSec' in err.details
            ? Number((err.details as { retryAfterSec: number }).retryAfterSec)
            : 60
        startResendCooldown(Number.isFinite(retry) && retry > 0 ? retry : 60)
        setResendNote(err.message)
      } else {
        setResendNote(err instanceof Error ? err.message : 'Could not resend right now')
        setDeliveryFailed(true)
      }
    } finally {
      setResending(false)
    }
  }

  const liveUsernameStatus = checkingUsername
    ? 'Checking availability…'
    : usernameFeedback.networkError
      ? 'Could not check username right now'
      : usernameFeedback.available === true
        ? 'Username is available'
        : usernameFeedback.available === false && usernameFeedback.reason === 'taken'
          ? 'Username is unavailable'
          : usernameFeedback.available === false && usernameFeedback.reason === 'reserved'
            ? 'Username is reserved'
            : '3–30 characters · letters, numbers, underscores, periods · no consecutive periods'

  if (step === 2) {
    if (verified) {
      return (
        <AuthShell layout={layout} image="dunes" logoShowWordmark={false}>
          <AuthHeader
            onClose={onClose}
            trailing={headerTrailing}
            showWordmark={false}
            logoPlacement={authHeaderLogoPlacement(layout)}
          />
          <div className="px-5 py-8 sm:px-8">
            <SuccessPanel
              icon={<Mail size={28} />}
              title="Email verified"
              message="Your account is ready. Sign in to continue exploring Delve."
              primaryAction={<PrimaryButton onClick={onNavigateSignIn}>Sign in</PrimaryButton>}
            />
          </div>
        </AuthShell>
      )
    }

    return (
      <AuthShell layout={layout} image="dunes" logoShowWordmark={false}>
        <AuthHeader
          onClose={onClose}
          trailing={headerTrailing}
          showWordmark={false}
          logoPlacement={authHeaderLogoPlacement(layout)}
        />
        <div className="px-5 py-8 sm:px-8 flex flex-col gap-5">
          {deliveryFailed ? (
            <InlineAlert tone="error" title="Verification email not sent">
              We created your account but could not send the verification email. Please try again.
            </InlineAlert>
          ) : (
            <SuccessPanel
              icon={<Mail size={28} />}
              title="Check your email"
              message={`We sent a 6-digit verification code to ${maskEmail(email)}. Enter it below to activate your account.`}
            />
          )}

          {!deliveryFailed && (
            <OTPInput
              value={verificationCode}
              onChange={setVerificationCode}
              error={codeError || undefined}
              disabled={verifying}
              loading={verifying}
              autoFocus
              onComplete={value => void handleVerifyCode(value)}
            />
          )}

          {!deliveryFailed && (
            <PrimaryButton
              loading={verifying}
              loadingLabel="Verifying…"
              onClick={() => void handleVerifyCode()}
              disabled={verificationCode.length < authConfig.verification.otpLength}
            >
              Verify email
            </PrimaryButton>
          )}

          {resendNote && (
            <InlineAlert tone={deliveryFailed ? 'warning' : 'success'} title="Email update">
              {resendNote}
            </InlineAlert>
          )}

          <ResendCodeControl
            onResend={() => void handleResend()}
            sending={resending}
            resetToken={resendToken}
            startImmediately
            label={deliveryFailed ? 'Retry sending verification email' : 'Send a new code'}
          />

          <PrimaryButton onClick={onNavigateSignIn}>Back to sign in</PrimaryButton>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell layout={layout} image="dunes" logoShowWordmark={false}>
      <AuthHeader
        onClose={onClose}
        trailing={headerTrailing}
        showWordmark={false}
        logoPlacement={authHeaderLogoPlacement(layout)}
      />
      <AuthForm onSubmit={() => void handleCreateAccount()} busy={creating}>
        <AuthTitleBlock
          eyebrow="Join Delve"
          title="Create your traveler account"
          subtitle="Choose a unique username, add your email, and set a password."
        />

        {formError && !deliveryFailed && (
          <InlineAlert tone="error" title="Could not create account">
            {formError}
          </InlineAlert>
        )}
        {summaryErrors.length > 0 && <FormErrorSummary errors={summaryErrors} />}

        <div className="flex flex-col gap-4 mt-2">
          <TextField
            id="signup-username"
            name="username"
            label="Username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={username}
            onChange={value => {
              setUsername(value)
              scheduleUsernameCheck(value)
            }}
            onBlur={() => setTouched(t => ({ ...t, username: true }))}
            error={errors.username}
            hint={liveUsernameStatus}
            disabled={creating}
          />
          <p className="sr-only" aria-live="polite">
            {liveUsernameStatus}
          </p>
          <EmailField
            id="signup-email"
            label="Email"
            value={email}
            onChange={setEmail}
            onBlur={() => setTouched(t => ({ ...t, email: true }))}
            error={errors.email}
            disabled={creating}
          />
          <PasswordField
            id="signup-password"
            label="Password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            onBlur={() => setTouched(t => ({ ...t, password: true }))}
            error={errors.password}
            disabled={creating}
          />
          <PasswordStrength value={password} />
          <PasswordRequirementList value={password} />
          <PasswordField
            id="signup-confirmPassword"
            label="Confirm password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            onBlur={() => setTouched(t => ({ ...t, confirmPassword: true }))}
            error={errors.confirmPassword}
            disabled={creating}
          />

          <Checkbox
            id="signup-consent"
            checked={consentGiven}
            onChange={checked => {
              setConsentGiven(checked)
              setTouched(t => ({ ...t, consent: true }))
            }}
            label="I agree to the Delve Terms and Privacy Policy"
            error={errors.consent}
            disabled={creating}
          />
          <Checkbox
            id="signup-marketing"
            checked={marketingOptIn}
            onChange={setMarketingOptIn}
            label="Send me travel tips and product updates (optional)"
            disabled={creating}
          />

          <PrimaryButton type="submit" loading={creating}>
            Create account
          </PrimaryButton>

          <p className="text-sm text-center" style={{ color: 'var(--fg-muted)' }}>
            Already have an account?{' '}
            <TextButton onClick={onNavigateSignIn} disabled={creating}>
              Sign in
            </TextButton>
          </p>
          <TermsAndPrivacyText />
        </div>
      </AuthForm>
    </AuthShell>
  )
}
