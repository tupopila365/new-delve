import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { VerifyEmailResult } from '@delve/contracts'
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
  TextButton,
} from '../../components/auth'
import { authConfig, maskEmail } from '../../data/authConfig'
import { resendVerificationEmail, verifyEmailCode } from '../../api/authClient'

const TITLES: Record<VerifyEmailResult | 'missing', string> = {
  success: 'Email verified',
  already_verified: 'Already verified',
  expired: 'Code expired',
  used: 'Code already used',
  invalid: 'Invalid code',
  account_disabled: 'Account unavailable',
  missing: 'Verify your email',
}

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const emailFromQuery = params.get('email')?.trim() || ''
  const resultHint = (params.get('result') || params.get('status')) as string | null

  const [email, setEmail] = useState(emailFromQuery)
  const [code, setCode] = useState('')
  const [result, setResult] = useState<VerifyEmailResult | null>(
    resultHint === 'success' || resultHint === 'already_verified' ? (resultHint as VerifyEmailResult) : null,
  )
  const [message, setMessage] = useState(
    resultHint === 'success' || resultHint === 'already_verified'
      ? 'Your email is verified. You can continue to Delve.'
      : 'Enter the 6-digit code we sent to your email.',
  )
  const [verifying, setVerifying] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resendNote, setResendNote] = useState<string | null>(null)
  const [resendToken, setResendToken] = useState(0)

  useEffect(() => {
    if (emailFromQuery) setEmail(emailFromQuery)
  }, [emailFromQuery])

  async function submitCode(nextCode = code) {
    if (!email.trim()) {
      setCodeError('Enter the email address you used to register.')
      return
    }
    if (nextCode.length < authConfig.verification.otpLength) {
      setCodeError('Enter all six digits.')
      return
    }

    setVerifying(true)
    setCodeError(null)
    setResendNote(null)
    try {
      const data = await verifyEmailCode(email.trim(), nextCode)
      setResult(data.result)
      setMessage(data.message)
      if (data.result === 'invalid' || data.result === 'expired') {
        setCodeError(data.message)
      }
    } catch (err) {
      setResult('invalid')
      setCodeError(err instanceof Error ? err.message : 'Could not verify that code right now.')
    } finally {
      setVerifying(false)
    }
  }

  async function handleResend() {
    if (!email.trim() || resending) return
    setResending(true)
    setResendNote(null)
    try {
      const data = await resendVerificationEmail(email.trim())
      setResendNote(data.message)
      setResendToken(token => token + 1)
      setCode('')
      setCodeError(null)
      setResult(null)
      setMessage('Enter the 6-digit code we sent to your email.')
    } catch (err) {
      setResendNote(err instanceof Error ? err.message : 'Could not resend right now.')
    } finally {
      setResending(false)
    }
  }

  const continueDelve = (
    <PrimaryButton onClick={() => navigate('/', { state: { openAuth: 'signIn' } })}>
      Continue to Delve
    </PrimaryButton>
  )
  const signIn = (
    <PrimaryButton onClick={() => navigate('/', { state: { openAuth: 'signIn' } })}>Sign in</PrimaryButton>
  )
  const goHome = <SecondaryButton onClick={() => navigate('/')}>Back to Delve</SecondaryButton>

  if (result === 'success' || result === 'already_verified') {
    return (
      <AuthShell layout="stacked" image="dunes">
        <AuthHeader onClose={() => navigate('/')} />
        <div className="px-5 py-10 sm:px-8">
          <SuccessPanel
            title={result === 'success' ? 'Your email is verified' : TITLES[result]}
            message={message}
            primaryAction={continueDelve}
            secondaryAction={goHome}
          />
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell layout="stacked" image="dunes">
      <AuthHeader onClose={() => navigate('/')} />
      <div className="px-5 py-10 sm:px-8 flex flex-col gap-4">
        <AuthTitleBlock
          title="Verify your email"
          subtitle={
            email.trim()
              ? `Enter the 6-digit code we sent to ${maskEmail(email)}.`
              : 'Enter your email and the 6-digit code from your inbox.'
          }
        />

        <div role="status" aria-live="polite" className="sr-only">
          {message}
        </div>

        {result === 'account_disabled' && (
          <InlineAlert tone="error" title={TITLES.account_disabled}>
            {message}
          </InlineAlert>
        )}

        {result === 'used' && (
          <>
            <InlineAlert tone="info" title={TITLES.used}>
              {message}
            </InlineAlert>
            {signIn}
            {goHome}
          </>
        )}

        {result !== 'used' && result !== 'account_disabled' && (
          <>
            {!emailFromQuery && (
              <>
                <label className="text-sm font-semibold" htmlFor="verify-email">
                  Email
                </label>
                <input
                  id="verify-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className="min-h-[48px] rounded-xl px-3 text-base"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={verifying}
                />
              </>
            )}

            <OTPInput
              value={code}
              onChange={setCode}
              error={codeError || undefined}
              disabled={verifying}
              loading={verifying}
              autoFocus
              onComplete={value => void submitCode(value)}
            />

            <PrimaryButton
              loading={verifying}
              loadingLabel="Verifying…"
              onClick={() => void submitCode()}
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
                startImmediately={Boolean(emailFromQuery)}
                label="Send a new code"
                disabled={!email.trim()}
              />
            </div>

            {resendNote && (
              <InlineAlert tone="info" title="Email update">
                {resendNote}
              </InlineAlert>
            )}

            <TextButton align="center" onClick={() => navigate('/', { state: { openAuth: 'signIn' } })}>
              Back to sign in
            </TextButton>
          </>
        )}
      </div>
    </AuthShell>
  )
}
