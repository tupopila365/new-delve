import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { VerifyEmailResult } from '@delve/contracts'
import {
  AuthHeader,
  AuthShell,
  AuthTitleBlock,
  PrimaryButton,
  SecondaryButton,
  SuccessPanel,
  InlineAlert,
  TextButton,
} from '../../components/auth'
import { resendVerificationEmail, verifyEmailToken } from '../../api/authClient'

const TITLES: Record<VerifyEmailResult | 'loading' | 'missing', string> = {
  loading: 'Verifying',
  missing: 'Missing link',
  success: 'Email verified',
  already_verified: 'Already verified',
  expired: 'Link expired',
  used: 'Link already used',
  invalid: 'Invalid link',
  account_disabled: 'Account unavailable',
}

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token')
  const resultHint = (params.get('result') || params.get('status')) as string | null
  const [result, setResult] = useState<VerifyEmailResult | 'loading' | 'missing'>(
    !token && resultHint === 'success' ? 'success' : 'loading',
  )
  const [message, setMessage] = useState('Verifying your email…')
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resendNote, setResendNote] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const id = window.setTimeout(() => setResendCooldown(c => Math.max(0, c - 1)), 1000)
    return () => window.clearTimeout(id)
  }, [resendCooldown])

  useEffect(() => {
    if (!token) {
      if (resultHint === 'success') {
        setResult('success')
        setMessage('Your email is verified. You can continue to Delve.')
        return
      }
      if (resultHint && resultHint in TITLES) {
        setResult(resultHint as VerifyEmailResult)
        setMessage('Open the latest verification email from Delve, or request a new link after signing up.')
        return
      }
      setResult('missing')
      setMessage('This verification link is missing a token.')
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const data = await verifyEmailToken(token)
        if (cancelled) return
        setResult(data.result)
        if (data.result === 'success') {
          setMessage('Your email is verified. You can continue to Delve.')
        } else if (data.result === 'expired') {
          setMessage('That verification link has expired. Request a new one to continue.')
        } else if (data.result === 'already_verified' || data.result === 'used') {
          setMessage(data.message)
        } else {
          setMessage(data.message)
        }
      } catch (err) {
        if (cancelled) return
        setResult('invalid')
        setMessage(err instanceof Error ? err.message : 'This verification link is invalid or has expired.')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token, resultHint])

  async function handleResend() {
    if (!resendEmail.trim() || resending || resendCooldown > 0) return
    setResending(true)
    setResendNote(null)
    try {
      const data = await resendVerificationEmail(resendEmail.trim())
      setResendNote(data.message)
      setResendCooldown(60)
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

  return (
    <AuthShell layout="stacked" image="dunes">
      <AuthHeader onClose={() => navigate('/')} />
      <div className="px-5 py-10 sm:px-8 flex flex-col gap-4">
        <div role="status" aria-live="polite" className="sr-only">
          {result !== 'loading' ? message : ''}
        </div>

        {result === 'loading' && (
          <InlineAlert tone="info" title={TITLES.loading}>
            {message}
          </InlineAlert>
        )}

        {(result === 'success' || result === 'already_verified') && (
          <SuccessPanel
            title={result === 'success' ? 'Your email is verified' : TITLES[result]}
            message={message}
            primaryAction={continueDelve}
            secondaryAction={goHome}
          />
        )}

        {result === 'expired' && (
          <>
            <AuthTitleBlock title="Verification link expired" subtitle={message} />
            <InlineAlert tone="warning" title="Link expired">
              Enter the email you used to register. If an unverified account exists, we’ll send a new link.
            </InlineAlert>
            <label className="text-sm font-semibold" htmlFor="verify-resend-email">
              Email
            </label>
            <input
              id="verify-resend-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              className="min-h-[48px] rounded-xl px-3 text-base"
              style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
              value={resendEmail}
              onChange={e => setResendEmail(e.target.value)}
              disabled={resending}
            />
            <PrimaryButton
              onClick={() => void handleResend()}
              loading={resending}
              loadingLabel="Sending…"
              disabled={resendCooldown > 0}
            >
              {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend verification email'}
            </PrimaryButton>
            {resendNote && (
              <InlineAlert tone="info" title="Request sent">
                {resendNote}
              </InlineAlert>
            )}
            <TextButton onClick={() => navigate('/', { state: { openAuth: 'signIn' } })}>Sign in</TextButton>
          </>
        )}

        {result === 'used' && (
          <>
            <AuthTitleBlock
              title="Link already used"
              subtitle="This email may already be verified. Sign in to continue."
            />
            <InlineAlert tone="info" title="Already used">
              {message}
            </InlineAlert>
            {signIn}
            {goHome}
          </>
        )}

        {(result === 'invalid' || result === 'missing') && (
          <>
            <InlineAlert tone="error" title={TITLES[result === 'missing' ? 'missing' : 'invalid']}>
              {message}
            </InlineAlert>
            {signIn}
            {goHome}
          </>
        )}

        {result === 'account_disabled' && (
          <InlineAlert tone="error" title={TITLES.account_disabled}>
            {message}
          </InlineAlert>
        )}
      </div>
    </AuthShell>
  )
}
