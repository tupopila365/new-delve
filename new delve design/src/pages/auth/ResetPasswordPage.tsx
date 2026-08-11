import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound, ShieldCheck } from 'lucide-react'
import {
  AuthForm,
  AuthHeader,
  AuthShell,
  AuthTitleBlock,
  FormErrorSummary,
  InlineAlert,
  PasswordField,
  PasswordRequirementList,
  PasswordStrength,
  PrimaryButton,
  SuccessPanel,
  SupportLink,
  TextButton,
} from '../../components/auth'
import type { FormErrorSummaryItem } from '../../components/auth/FormErrorSummary'
import { evaluatePassword } from '../../data/authConfig'
import {
  AuthApiError,
  inspectPasswordResetToken,
  resetPasswordWithToken,
} from '../../api/authClient'

type View = 'loading' | 'form' | 'success' | 'expired' | 'used' | 'invalid'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''

  const [view, setView] = useState<View>(token ? 'loading' : 'invalid')
  const [message, setMessage] = useState('Checking your reset link…')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState<{ password?: boolean; confirm?: boolean }>({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [networkError, setNetworkError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setView('invalid')
      setMessage('This password reset link is invalid.')
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const data = await inspectPasswordResetToken(token)
        if (cancelled) return
        if (data.result === 'valid') {
          setView('form')
          setMessage(data.message)
        } else {
          setView(data.result)
          setMessage(data.message)
        }
      } catch {
        if (cancelled) return
        setView('invalid')
        setMessage('This password reset link is invalid.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const strength = evaluatePassword(password)
  const passwordError =
    (touched.password || submitted) && !password
      ? 'Enter a new password'
      : (touched.password || submitted) && !strength.meetsPolicy
        ? 'Choose a stronger password'
        : undefined
  const confirmError =
    (touched.confirm || submitted) && !confirm
      ? 'Confirm your new password'
      : (touched.confirm || submitted) && confirm !== password
        ? 'Both passwords need to match'
        : undefined

  const summaryErrors: FormErrorSummaryItem[] = []
  if (submitted && passwordError) summaryErrors.push({ fieldId: 'reset-password', message: passwordError })
  if (submitted && confirmError) summaryErrors.push({ fieldId: 'reset-confirm', message: confirmError })

  async function handleSubmit() {
    setSubmitted(true)
    setNetworkError(null)
    if (!password || !strength.meetsPolicy || confirm !== password) return
    if (saving) return
    setSaving(true)
    try {
      const data = await resetPasswordWithToken({
        token,
        newPassword: password,
        newPasswordConfirmation: confirm,
      })
      setPassword('')
      setConfirm('')
      setMessage(data.message)
      setView('success')
    } catch (err) {
      const code = err instanceof AuthApiError ? err.code : undefined
      const msg = err instanceof Error ? err.message : 'We could not reset your password.'
      if (code === 'EXPIRED') {
        setView('expired')
        setMessage(msg)
      } else if (code === 'USED') {
        setView('used')
        setMessage(msg)
      } else if (code === 'INVALID') {
        setView('invalid')
        setMessage(msg)
      } else {
        setNetworkError(msg)
        setPassword('')
        setConfirm('')
      }
    } finally {
      setSaving(false)
    }
  }

  const goSignIn = () => navigate('/', { state: { openAuth: 'signIn' } })
  const goForgot = () => navigate('/', { state: { openAuth: 'forgotPassword' } })

  return (
    <AuthShell layout="stacked" image="dunes">
      <AuthHeader onClose={() => navigate('/')} />
      <div className="px-5 py-8 sm:px-8 flex flex-col gap-4">
        {view === 'loading' && (
          <InlineAlert tone="info" title="Checking link">
            {message}
          </InlineAlert>
        )}

        {view === 'success' && (
          <SuccessPanel
            icon={<ShieldCheck size={28} />}
            title="Password updated"
            message={message}
            primaryAction={<PrimaryButton onClick={goSignIn}>Sign in</PrimaryButton>}
          />
        )}

        {view === 'expired' && (
          <>
            <AuthTitleBlock
              icon={<KeyRound size={24} />}
              title="Reset link expired"
              subtitle="That verification link has expired. Request a new one to continue."
            />
            <InlineAlert tone="warning" title="Link expired">
              {message}
            </InlineAlert>
            <PrimaryButton onClick={goForgot}>Request a new reset link</PrimaryButton>
            <TextButton onClick={goSignIn}>Back to sign in</TextButton>
          </>
        )}

        {view === 'used' && (
          <>
            <AuthTitleBlock title="Link already used" subtitle="This reset link was already used." />
            <InlineAlert tone="info" title="Already used">
              {message} If you already changed your password, sign in. Otherwise request a new reset link.
            </InlineAlert>
            <PrimaryButton onClick={goSignIn}>Sign in</PrimaryButton>
            <TextButton onClick={goForgot}>Request a new reset link</TextButton>
          </>
        )}

        {view === 'invalid' && (
          <>
            <AuthTitleBlock title="Invalid reset link" subtitle="This password reset link is invalid." />
            <InlineAlert tone="error" title="Invalid link">
              {message}
            </InlineAlert>
            <PrimaryButton onClick={goForgot}>Request a new reset link</PrimaryButton>
            <SupportLink />
          </>
        )}

        {view === 'form' && (
          <AuthForm onSubmit={() => void handleSubmit()} busy={saving}>
            <AuthTitleBlock
              icon={<KeyRound size={24} />}
              title="Choose a new password"
              subtitle="After you save, other signed-in devices will be signed out."
            />
            <div role="status" aria-live="polite" className="sr-only">
              {networkError || ''}
            </div>
            {networkError && (
              <InlineAlert tone="error" title="We couldn’t update your password">
                {networkError}
              </InlineAlert>
            )}
            {summaryErrors.length > 0 && <FormErrorSummary errors={summaryErrors} />}
            <div className="flex flex-col gap-4">
              <PasswordField
                id="reset-password"
                label="New password"
                name="new-password"
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
                id="reset-confirm"
                label="Confirm password"
                name="new-password-confirm"
                autoComplete="new-password"
                value={confirm}
                onChange={setConfirm}
                onBlur={() => setTouched(t => ({ ...t, confirm: true }))}
                error={confirmError}
                disabled={saving}
              />
              <PrimaryButton type="submit" loading={saving} loadingLabel="Updating password…">
                Update password
              </PrimaryButton>
              <SupportLink />
            </div>
          </AuthForm>
        )}
      </div>
    </AuthShell>
  )
}
