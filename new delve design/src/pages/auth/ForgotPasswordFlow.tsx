import { useState } from 'react'
import type { ReactNode } from 'react'
import { MailCheck } from 'lucide-react'
import {
  AuthForm,
  AuthHeader,
  AuthShell,
  AuthTitleBlock,
  EmailField,
  FormErrorSummary,
  InlineAlert,
  PrimaryButton,
  SuccessPanel,
  SupportLink,
  TextButton,
} from '../../components/auth'
import type { AuthShellLayout } from '../../components/auth/AuthShell'
import type { FormErrorSummaryItem } from '../../components/auth/FormErrorSummary'
import { isValidEmail, maskEmail } from '../../data/authConfig'
import { AuthApiError, requestPasswordReset } from '../../api/authClient'

export type ForgotPasswordStep = 'request' | 'checkInbox'

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
  const [touched, setTouched] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [networkError, setNetworkError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  function go(next: ForgotPasswordStep) {
    if (!controlledStep) setInternalStep(next)
    onStepChange?.(next)
  }

  const emailError =
    (touched || submitted) && !email.trim()
      ? 'Enter your email address'
      : (touched || submitted) && !isValidEmail(email)
        ? 'Enter a valid email address'
        : undefined

  const summaryErrors: FormErrorSummaryItem[] = []
  if (submitted && emailError) summaryErrors.push({ fieldId: 'forgot-email', message: emailError })

  async function handleSubmit() {
    if (staticPreview) {
      go('checkInbox')
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
      go('checkInbox')
    } catch (err) {
      setNetworkError(err instanceof AuthApiError ? err.message : 'We could not send a reset email right now.')
    } finally {
      setSending(false)
    }
  }

  if (step === 'checkInbox') {
    return (
      <AuthShell layout={layout} image="coast">
        <AuthHeader onClose={onClose} trailing={headerTrailing} />
        <div className="px-5 py-8 sm:px-8 flex flex-col gap-4">
          <SuccessPanel
            icon={<MailCheck size={28} />}
            title="Check your inbox"
            message={
              statusMessage ||
              `If an account exists for ${maskEmail(email) || 'that address'}, a password reset link has been sent.`
            }
            primaryAction={
              <PrimaryButton onClick={onBackToSignIn} loadingLabel="Opening…">
                Back to sign in
              </PrimaryButton>
            }
          />
          <p className="text-sm text-center" style={{ color: 'var(--fg-muted)' }}>
            Didn’t get it? Check spam, or{' '}
            <TextButton
              onClick={() => {
                go('request')
                setSubmitted(false)
              }}
            >
              try again
            </TextButton>
            .
          </p>
          <SupportLink />
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell layout={layout} image="coast">
      <AuthHeader onClose={onClose} trailing={headerTrailing} />
      <AuthForm onSubmit={() => void handleSubmit()} busy={sending}>
        <AuthTitleBlock
          eyebrow="Account recovery"
          title="Forgot your password?"
          subtitle="Enter the email on your Delve account. If it matches, we’ll send a reset link."
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
            onBlur={() => setTouched(true)}
            error={emailError}
            disabled={sending}
            autoComplete="email"
          />
          <PrimaryButton type="submit" loading={sending} loadingLabel="Sending link…">
            Send reset link
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
