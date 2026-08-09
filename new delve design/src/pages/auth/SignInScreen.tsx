import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
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
  PasswordField,
  PrimaryButton,
  SocialAuthGroup,
  SupportLink,
  TermsAndPrivacyText,
  TextButton,
} from '../../components/auth'
import type { AuthShellLayout } from '../../components/auth/AuthShell'
import type { FormErrorSummaryItem } from '../../components/auth/FormErrorSummary'
import { authConfig, isValidEmail } from '../../data/authConfig'
import type { AuthResponseState, SocialProviderId } from '../../data/authConfig'

export interface SignInScreenProps {
  layout?: AuthShellLayout
  headerTrailing?: ReactNode
  onSignedIn?: () => void
  onNavigateSignUp?: () => void
  onNavigateForgotPassword?: () => void
  onNavigateVerifyEmail?: (email: string) => void
  onNavigateRestricted?: () => void
  onClose?: () => void
  /** Where the traveler lands after signing in — shown so the return path is clear. */
  destinationLabel?: string
  /** Pins a response state for the Form States section of the design board. */
  previewState?: AuthResponseState
  /** Suppresses timers so static frames stay still. */
  staticPreview?: boolean
}

/**
 * Demo-only outcome rules. The real backend decides all of this; these triggers
 * exist so every documented state is reachable in the prototype.
 */
function resolveOutcome(email: string, password: string): AuthResponseState {
  const identifier = email.trim().toLowerCase()
  if (identifier.startsWith('locked@')) return 'accountRestricted'
  if (identifier.startsWith('unverified@')) return 'unverifiedEmail'
  if (identifier.startsWith('offline@')) return 'offline'
  if (identifier.startsWith('down@')) return 'serverUnavailable'
  if (identifier.startsWith('busy@')) return 'rateLimited'
  if (password.length < authConfig.passwordRules.minimumLength) return 'invalidCredentials'
  return 'success'
}

export default function SignInScreen({
  layout = 'auto',
  headerTrailing,
  onSignedIn,
  onNavigateSignUp,
  onNavigateForgotPassword,
  onNavigateVerifyEmail,
  onNavigateRestricted,
  onClose,
  destinationLabel,
  previewState,
  staticPreview = false,
}: SignInScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({ email: false, password: false })
  const [submitted, setSubmitted] = useState(false)
  const [state, setState] = useState<AuthResponseState>('idle')
  const [socialLoading, setSocialLoading] = useState<SocialProviderId | null>(null)
  const [socialFailed, setSocialFailed] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(() => {
    return () => timers.current.forEach(window.clearTimeout)
  }, [])

  const activeState = previewState ?? state
  const busy = activeState === 'submitting' || activeState === 'validating'

  const emailError =
    (touched.email || submitted) && !email.trim()
      ? 'Enter your email address'
      : (touched.email || submitted) && !isValidEmail(email)
        ? 'Enter a valid email address, for example you@example.com'
        : undefined

  const passwordError = (touched.password || submitted) && !password ? 'Enter your password' : undefined

  const previewEmailError = previewState === 'fieldError' ? 'Enter a valid email address' : emailError
  const summaryErrors: FormErrorSummaryItem[] = []
  if (submitted && previewEmailError) summaryErrors.push({ fieldId: 'signin-email', message: previewEmailError })
  if (submitted && passwordError) summaryErrors.push({ fieldId: 'signin-password', message: passwordError })

  function schedule(callback: () => void, delay: number) {
    if (staticPreview) return
    const id = window.setTimeout(callback, delay)
    timers.current.push(id)
  }

  function handleSubmit() {
    setSubmitted(true)
    setSocialFailed(false)
    if (!isValidEmail(email) || !password) {
      setState('fieldError')
      return
    }

    setState('submitting')
    schedule(() => {
      const outcome = resolveOutcome(email, password)
      setState(outcome)
      if (outcome === 'success') {
        schedule(() => onSignedIn?.(), 650)
      }
      if (outcome === 'accountRestricted') {
        schedule(() => onNavigateRestricted?.(), 1400)
      }
    }, 1100)
  }

  function handleSocial(provider: SocialProviderId) {
    setSocialLoading(provider)
    setSocialFailed(false)
    schedule(() => {
      setSocialLoading(null)
      // Apple stands in for a provider round-trip that does not complete.
      if (provider === 'apple') {
        setSocialFailed(true)
        return
      }
      onSignedIn?.()
    }, 1200)
  }

  const banner = (() => {
    if (socialFailed) {
      return (
        <InlineAlert tone="error" title="That did not complete">
          We could not finish signing you in with that provider. Please try again or use your email and password.
        </InlineAlert>
      )
    }
    switch (activeState) {
      case 'invalidCredentials':
        return (
          <InlineAlert tone="error" title="We could not sign you in">
            The email or password you entered is not correct. Check the details and try again, or reset your
            password.
          </InlineAlert>
        )
      case 'unverifiedEmail':
        return (
          <InlineAlert
            tone="warning"
            title="Verify your email to continue"
            action={
              <TextButton onClick={() => onNavigateVerifyEmail?.(email)}>Send a new verification link</TextButton>
            }
          >
            Your account exists but the email address has not been confirmed yet.
          </InlineAlert>
        )
      case 'accountRestricted':
        return (
          <InlineAlert tone="security" title="This account is restricted">
            Sign-in is unavailable for this account. Our support team can explain why and what happens next.
          </InlineAlert>
        )
      case 'rateLimited':
        return (
          <InlineAlert tone="warning" title="Too many attempts">
            For your security we have paused sign-in attempts for {authConfig.lockoutMinutes} minutes. You can reset
            your password in the meantime.
          </InlineAlert>
        )
      case 'offline':
        return (
          <InlineAlert tone="offline" title="You appear to be offline">
            Check your connection and try again — nothing you typed has been lost.
          </InlineAlert>
        )
      case 'serverUnavailable':
        return (
          <InlineAlert tone="error" title="Delve is not reachable right now">
            Something went wrong on our side. Please try again in a few minutes.
          </InlineAlert>
        )
      case 'success':
        return (
          <InlineAlert tone="success" title="Signed in">
            Taking you {destinationLabel ? `back to ${destinationLabel}` : 'back to Delve'}…
          </InlineAlert>
        )
      default:
        return null
    }
  })()

  return (
    <AuthShell
      layout={layout}
      image="dunes"
      imageSide="left"
      panelHeadline="Welcome back to the road."
      panelSupporting="Your saved places, journeys and deals are exactly where you left them."
      header={<AuthHeader onClose={onClose} trailing={headerTrailing} />}
      footer={<TermsAndPrivacyText actionLabel="signing in" />}
    >
      <AuthTitleBlock
        title="Welcome back"
        subtitle={
          destinationLabel
            ? `Sign in to continue to ${destinationLabel}.`
            : 'Sign in to pick up your journeys, saved places and bookings.'
        }
      />

      <div className="flex flex-col gap-4">
        {summaryErrors.length > 0 && <FormErrorSummary errors={summaryErrors} />}
        {banner}

        <AuthForm onSubmit={handleSubmit} busy={busy} ariaLabel="Sign in to Delve">
          <EmailField
            id="signin-email"
            label={authConfig.allowPhoneSignIn ? 'Email or phone number' : 'Email address'}
            placeholder="you@example.com"
            value={email}
            onChange={value => {
              setEmail(value)
              if (state !== 'idle') setState('idle')
            }}
            onBlur={() => setTouched(current => ({ ...current, email: true }))}
            error={previewEmailError}
            required
            hint={
              authConfig.allowPhoneSignIn
                ? 'Use the email address or phone number on your account.'
                : undefined
            }
          />

          <PasswordField
            id="signin-password"
            value={password}
            onChange={value => {
              setPassword(value)
              if (state !== 'idle') setState('idle')
            }}
            onBlur={() => setTouched(current => ({ ...current, password: true }))}
            error={passwordError}
            autoComplete="current-password"
            required
            previewState={previewState === 'fieldError' ? 'error' : undefined}
            labelAction={
              <button
                type="button"
                onClick={onNavigateForgotPassword}
                className="text-sm font-semibold"
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}
              >
                Forgot password?
              </button>
            }
          />

          <Checkbox
            checked={rememberMe}
            onChange={setRememberMe}
            label="Keep me signed in"
            description={`Stays signed in on this device for up to ${authConfig.rememberMeDurationDays} days.`}
          />

          <PrimaryButton
            type="submit"
            loading={busy}
            loadingLabel="Signing you in…"
            disabled={activeState === 'rateLimited' || activeState === 'accountRestricted'}
          >
            Sign in
          </PrimaryButton>
        </AuthForm>

        {authConfig.socialProviders.some(provider => provider.enabled) && (
          <>
            <AuthDivider />
            <SocialAuthGroup onSelect={handleSocial} loadingProvider={socialLoading} disabled={busy} />
          </>
        )}

        <p className="text-sm text-center" style={{ color: 'var(--fg-muted)' }}>
          New to Delve?{' '}
          <button
            type="button"
            onClick={onNavigateSignUp}
            className="font-semibold"
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}
          >
            Create a free account
          </button>
        </p>

        {(activeState === 'accountRestricted' || activeState === 'rateLimited') && <SupportLink />}
      </div>
    </AuthShell>
  )
}
