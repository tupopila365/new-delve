import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  AuthForm,
  AuthHeader,
  AuthShell,
  AuthTitleBlock,
  Checkbox,
  FormErrorSummary,
  InlineAlert,
  PasswordField,
  PrimaryButton,
  SupportLink,
  TermsAndPrivacyText,
  TextButton,
  TextField,
} from '../../components/auth'
import type { AuthShellLayout } from '../../components/auth/AuthShell'
import type { FormErrorSummaryItem } from '../../components/auth/FormErrorSummary'
import { loginWithIdentifier, resendVerificationEmail } from '../../api/authClient'
import { GENERIC_AUTH_FAILURE_MESSAGE } from '@delve/contracts'

export interface SignInScreenProps {
  layout?: AuthShellLayout
  headerTrailing?: ReactNode
  onSignedIn?: () => void
  onNavigateSignUp?: () => void
  onNavigateForgotPassword?: () => void
  onNavigateVerifyEmail?: (email: string) => void
  onNavigateRestricted?: () => void
  onClose?: () => void
  destinationLabel?: string
  /** Design-board only. */
  previewState?: string
  staticPreview?: boolean
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
}: SignInScreenProps) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [touched, setTouched] = useState<{ identifier: boolean; password: boolean }>({
    identifier: false,
    password: false,
  })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const identifierError =
    (touched.identifier || submitted) && !identifier.trim() ? 'Enter your email or username' : undefined
  const passwordError = (touched.password || submitted) && !password ? 'Enter your password' : undefined

  const summaryErrors: FormErrorSummaryItem[] = []
  if (submitted && identifierError) summaryErrors.push({ fieldId: 'signin-identifier', message: identifierError })
  if (submitted && passwordError) summaryErrors.push({ fieldId: 'signin-password', message: passwordError })

  async function handleSubmit() {
    setSubmitted(true)
    setErrorCode(null)
    setErrorMessage(null)
    if (!identifier.trim() || !password) return

    setSubmitting(true)
    try {
      await loginWithIdentifier(identifier.trim(), password)
      setSuccess(true)
      onSignedIn?.()
    } catch (err) {
      const code = (err as { code?: string }).code
      const message = err instanceof Error ? err.message : GENERIC_AUTH_FAILURE_MESSAGE
      setErrorCode(code || 'INVALID_CREDENTIALS')
      setErrorMessage(message)
      if (code === 'ACCOUNT_RESTRICTED') onNavigateRestricted?.()
      if (code === 'EMAIL_NOT_VERIFIED') {
        const maybeEmail = identifier.includes('@') ? identifier.trim() : ''
        if (maybeEmail) onNavigateVerifyEmail?.(maybeEmail)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    if (!identifier.includes('@')) return
    try {
      await resendVerificationEmail(identifier.trim())
      setErrorMessage('If an unverified account exists for that email, a new link has been sent.')
      setErrorCode('EMAIL_NOT_VERIFIED')
    } catch {
      setErrorMessage('Could not resend the verification email right now.')
    }
  }

  const banner = (() => {
    if (success) {
      return (
        <InlineAlert tone="success" title="Signed in">
          Taking you {destinationLabel ? `back to ${destinationLabel}` : 'back to Delve'}…
        </InlineAlert>
      )
    }
    if (errorCode === 'EMAIL_NOT_VERIFIED') {
      return (
        <InlineAlert
          tone="warning"
          title="Verify your email to continue"
          action={
            identifier.includes('@') ? <TextButton onClick={() => void handleResend()}>Send a new verification link</TextButton> : undefined
          }
        >
          {errorMessage || 'Verify your email before signing in.'}
        </InlineAlert>
      )
    }
    if (errorCode === 'ACCOUNT_RESTRICTED') {
      return (
        <InlineAlert tone="security" title="This account is restricted">
          Sign-in is unavailable for this account. Contact support for help.
        </InlineAlert>
      )
    }
    if (errorCode === 'RATE_LIMITED') {
      return (
        <InlineAlert tone="warning" title="Too many attempts">
          {errorMessage || 'Please wait a moment and try again.'}
        </InlineAlert>
      )
    }
    if (errorMessage) {
      return (
        <InlineAlert tone="error" title="We couldn’t sign you in">
          {errorMessage === GENERIC_AUTH_FAILURE_MESSAGE
            ? 'We couldn’t sign you in with those details.'
            : errorMessage}
        </InlineAlert>
      )
    }
    return null
  })()

  return (
    <AuthShell layout={layout} image="coast">
      <AuthHeader onClose={onClose} trailing={headerTrailing} />
      <AuthForm onSubmit={() => void handleSubmit()} busy={submitting}>
        <AuthTitleBlock
          eyebrow="Welcome back"
          title="Sign in to Delve"
          subtitle="Use your email or username with your password."
        />

        {banner}
        {summaryErrors.length > 0 && <FormErrorSummary errors={summaryErrors} />}

        <div className="flex flex-col gap-4 mt-2">
          <TextField
            id="signin-identifier"
            name="username"
            label="Email or username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={identifier}
            onChange={value => setIdentifier(value)}
            onBlur={() => setTouched(t => ({ ...t, identifier: true }))}
            error={identifierError}
            disabled={submitting || success}
          />
          <PasswordField
            id="signin-password"
            name="password"
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={value => setPassword(value)}
            onBlur={() => setTouched(t => ({ ...t, password: true }))}
            error={passwordError}
            disabled={submitting || success}
          />

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Checkbox
              id="signin-remember"
              checked={rememberMe}
              onChange={setRememberMe}
              label="Keep me signed in on this device"
              disabled={submitting || success}
            />
            <TextButton onClick={onNavigateForgotPassword} disabled={submitting}>
              Forgot password?
            </TextButton>
          </div>

          <PrimaryButton type="submit" loading={submitting} disabled={success}>
            Sign in
          </PrimaryButton>

          <p className="text-sm text-center" style={{ color: 'var(--fg-muted)' }}>
            New to Delve?{' '}
            <TextButton onClick={onNavigateSignUp} disabled={submitting}>
              Create an account
            </TextButton>
          </p>

          <TermsAndPrivacyText />
          <SupportLink />
        </div>
      </AuthForm>
    </AuthShell>
  )
}
