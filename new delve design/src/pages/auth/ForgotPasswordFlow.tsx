import { useState } from 'react'
import type { ReactNode } from 'react'
import { KeyRound, MailCheck } from 'lucide-react'
import {
  AuthForm,
  AuthHeader,
  AuthShell,
  AuthTitleBlock,
  EmailField,
  FormErrorSummary,
  InlineAlert,
  OTPInput,
  PasswordField,
  PasswordRequirementList,
  PasswordStrength,
  PrimaryButton,
  ResendCodeControl,
  SuccessPanel,
  SupportLink,
  TextButton,
} from '../../components/auth'
import type { AuthShellLayout } from '../../components/auth/AuthShell'
import type { FormErrorSummaryItem } from '../../components/auth/FormErrorSummary'
import { authConfig, evaluatePassword, isValidEmail, maskEmail } from '../../data/authConfig'
import { AuthApiError, requestPasswordReset, resetPasswordWithCode } from '../../api/authClient'

export type ForgotPasswordStep = 'request' | 'enterCode' | 'newPassword' | 'success'

export interface ForgotPasswordFlowProps {
  layout?: AuthShellLayout
  headerTrailing?: ReactNode
  step?: ForgotPasswordStep
  onStepChange?: (step: ForgotPasswordStep) => void
  onBackToSignIn?: () => void
  onDone?: () => void
  onClose?: () => void
  initialEmail?: string
  staticPreview?: boolean
}

export default function ForgotPasswordFlow({
  layout = 'auto',
  headerTrailing,
  step: controlledStep,
  onStepChange,
  onBackToSignIn,
  onClose,
  initialEmail = '',
  staticPreview = false,
}: ForgotPasswordFlowProps) {
  const [internalStep, setInternalStep] = useState<ForgotPasswordStep>('request')
  const step = controlledStep ?? internalStep

  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [networkError, setNetworkError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resendToken, setResendToken] = useState(0)

  function go(next: ForgotPasswordStep) {
    if (!controlledStep) setInternalStep(next)
    onStepChange?.(next)
  }

  const emailError =
    (touched.email || submitted) && !email.trim()
      ? 'Enter your email address'
      : (touched.email || submitted) && !isValidEmail(email)
        ? 'Enter a valid email address'
        : undefined

  const passwordEvaluation = evaluatePassword(password)
  const passwordError =
    (touched.password || submitted) && !password
      ? 'Enter a new password'
      : (touched.password || submitted) && !passwordEvaluation.meetsPolicy
        ? 'Choose a stronger password'
        : undefined
  const confirmPasswordError =
    (touched.confirmPassword || submitted) && !confirmPassword
      ? 'Confirm your new password'
      : (touched.confirmPassword || submitted) && confirmPassword !== password
        ? 'Both passwords need to match'
        : undefined

  const summaryErrors: FormErrorSummaryItem[] = []
  if (submitted && emailError) summaryErrors.push({ fieldId: 'forgot-email', message: emailError })
  if (submitted && passwordError) summaryErrors.push({ fieldId: 'forgot-password', message: passwordError })
  if (submitted && confirmPasswordError) {
    summaryErrors.push({ fieldId: 'forgot-confirmPassword', message: confirmPasswordError })
  }

  async function handleRequestCode() {
    if (staticPreview) {
      go('enterCode')
      return
    }
    setSubmitted(true)
    setNetworkError(null)
    setStatusMessage(null)
    if (!email.trim() || !isValidEmail(email)) return
    if (sending) return

    setSending(true)
    try {
      const data = await requestPasswordReset(email.trim())
      setStatusMessage(data.message)
      setResendToken(token => token + 1)
      go('enterCode')
    } catch (err) {
      setNetworkError(err instanceof AuthApiError ? err.message : 'We could not send a reset email right now.')
    } finally {
      setSending(false)
    }
  }

  async function handleResend() {
    if (!email.trim() || resending) return
    setResending(true)
    setCodeError(null)
    try {
      const data = await requestPasswordReset(email.trim())
      setStatusMessage(data.message)
      setResendToken(token => token + 1)
      setCode('')
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : 'Could not resend right now.')
    } finally {
      setResending(false)
    }
  }

  function proceedToPassword(nextCode = code) {
    if (nextCode.length < authConfig.verification.otpLength) {
      setCodeError('Enter all six digits.')
      return
    }
    setCodeError(null)
    go('newPassword')
  }

  async function handleResetPassword() {
    setSubmitted(true)
    setNetworkError(null)
    if (code.length < authConfig.verification.otpLength) {
      setCodeError('Enter all six digits.')
      go('enterCode')
      return
    }
    if (passwordError || confirmPasswordError) return
    if (saving) return

    setSaving(true)
    try {
      const data = await resetPasswordWithCode({
        email: email.trim(),
        code,
        newPassword: password,
        newPasswordConfirmation: confirmPassword,
      })
      setStatusMessage(data.message)
      setPassword('')
      setConfirmPassword('')
      go('success')
    } catch (err) {
      const authErr = err instanceof AuthApiError ? err : null
      const msg = err instanceof Error ? err.message : 'We could not reset your password.'
      if (authErr?.code === 'EXPIRED') {
        setCodeError(msg)
        go('enterCode')
      } else if (authErr?.code === 'INVALID') {
        setCodeError(msg)
        go('enterCode')
      } else if (authErr?.code === 'USED') {
        setCodeError(msg)
        go('enterCode')
      } else {
        setNetworkError(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  if (step === 'success') {
    return (
      <AuthShell layout={layout} image="coast">
        <AuthHeader onClose={onClose} trailing={headerTrailing} />
        <div className="px-5 py-8 sm:px-8">
          <SuccessPanel
            icon={<KeyRound size={28} />}
            title="Password updated"
            message={
              statusMessage ||
              'Your password has been changed. Other sessions were signed out. Sign in with your new password.'
            }
            primaryAction={<PrimaryButton onClick={onBackToSignIn}>Sign in</PrimaryButton>}
          />
        </div>
      </AuthShell>
    )
  }

  if (step === 'newPassword') {
    return (
      <AuthShell layout={layout} image="coast">
        <AuthHeader onClose={onClose} trailing={headerTrailing} />
        <AuthForm onSubmit={() => void handleResetPassword()} busy={saving}>
          <AuthTitleBlock
            icon={<KeyRound size={24} />}
            title="Choose a new password"
            subtitle={`Enter a new password for ${maskEmail(email)}.`}
          />
          {networkError && (
            <InlineAlert tone="error" title="We couldn’t update your password">
              {networkError}
            </InlineAlert>
          )}
          {summaryErrors.length > 0 && <FormErrorSummary errors={summaryErrors} />}
          <div className="flex flex-col gap-4 mt-2">
            <PasswordField
              id="forgot-password"
              label="New password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              onBlur={() => setTouched(t => ({ ...t, password: true }))}
              error={passwordError}
              disabled={saving}
            />
            <PasswordStrength value={password} />
            <PasswordRequirementList value={password} />
            <PasswordField
              id="forgot-confirmPassword"
              label="Confirm password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              onBlur={() => setTouched(t => ({ ...t, confirmPassword: true }))}
              error={confirmPasswordError}
              disabled={saving}
            />
            <PrimaryButton type="submit" loading={saving} loadingLabel="Updating password…">
              Update password
            </PrimaryButton>
            <TextButton onClick={() => go('enterCode')} disabled={saving}>
              Back to code entry
            </TextButton>
          </div>
        </AuthForm>
      </AuthShell>
    )
  }

  if (step === 'enterCode') {
    return (
      <AuthShell layout={layout} image="coast">
        <AuthHeader onClose={onClose} trailing={headerTrailing} />
        <div className="px-5 py-8 sm:px-8 flex flex-col gap-4">
          <SuccessPanel
            icon={<MailCheck size={28} />}
            title="Check your inbox"
            message={
              statusMessage ||
              `If an account exists for ${maskEmail(email) || 'that address'}, a 6-digit reset code has been sent.`
            }
          />

          <OTPInput
            value={code}
            onChange={setCode}
            label="Reset code"
            error={codeError || undefined}
            disabled={saving}
            autoFocus
            onComplete={value => proceedToPassword(value)}
          />

          <PrimaryButton
            onClick={() => proceedToPassword()}
            disabled={code.length < authConfig.verification.otpLength}
          >
            Continue
          </PrimaryButton>

          <div
            className="rounded-xl p-3.5"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--fg)' }}>
              Did not receive it?
            </p>
            <ResendCodeControl
              onResend={() => void handleResend()}
              sending={resending}
              resetToken={resendToken}
              startImmediately
              label="Send a new code"
            />
          </div>

          <TextButton onClick={() => go('request')}>Use a different email</TextButton>
          <TextButton align="center" tone="muted" onClick={onBackToSignIn}>
            Back to sign in
          </TextButton>
          <SupportLink />
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell layout={layout} image="coast">
      <AuthHeader onClose={onClose} trailing={headerTrailing} />
      <AuthForm onSubmit={() => void handleRequestCode()} busy={sending}>
        <AuthTitleBlock
          eyebrow="Account recovery"
          title="Forgot your password?"
          subtitle="Enter the email on your Delve account. If it matches, we’ll send a 6-digit reset code."
        />

        <div role="status" aria-live="polite" className="sr-only">
          {networkError || ''}
        </div>

        {networkError && (
          <InlineAlert tone="error" title="We couldn’t send that email">
            {networkError}
          </InlineAlert>
        )}
        {summaryErrors.length > 0 && <FormErrorSummary errors={summaryErrors} />}

        <div className="flex flex-col gap-4 mt-2">
          <EmailField
            id="forgot-email"
            name="email"
            value={email}
            onChange={setEmail}
            onBlur={() => setTouched(t => ({ ...t, email: true }))}
            error={emailError}
            disabled={sending}
            autoComplete="email"
          />
          <PrimaryButton type="submit" loading={sending} loadingLabel="Sending code…">
            Send reset code
          </PrimaryButton>
          <p className="text-sm text-center" style={{ color: 'var(--fg-muted)' }}>
            Remembered it?{' '}
            <TextButton onClick={onBackToSignIn} disabled={sending}>
              Sign in
            </TextButton>
          </p>
          <SupportLink />
        </div>
      </AuthForm>
    </AuthShell>
  )
}
