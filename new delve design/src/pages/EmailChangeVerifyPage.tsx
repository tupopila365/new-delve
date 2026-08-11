import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AuthHeader, AuthShell, InlineAlert, PrimaryButton, SuccessPanel } from '../components/auth'
import { verifyEmailChange } from '../api/authClient'

export default function EmailChangeVerifyPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token')
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Confirming your new email…')

  useEffect(() => {
    if (!token) {
      setState('error')
      setMessage('This confirmation link is missing a token.')
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const result = await verifyEmailChange(token)
        if (cancelled) return
        setState('success')
        setMessage(result.message)
      } catch (err) {
        if (cancelled) return
        setState('error')
        setMessage(err instanceof Error ? err.message : 'Could not confirm email change')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <AuthShell layout="stacked" image="coast">
      <AuthHeader onClose={() => navigate('/')} />
      <div className="px-5 py-10 sm:px-8">
        {state === 'loading' && <InlineAlert tone="info" title="Confirming">{message}</InlineAlert>}
        {state === 'success' && (
          <SuccessPanel
            title="Email updated"
            message={message}
            primaryAction={
              <PrimaryButton onClick={() => navigate('/', { state: { openAuth: 'signIn' } })}>Sign in</PrimaryButton>
            }
          />
        )}
        {state === 'error' && (
          <InlineAlert tone="error" title="Could not update email">
            {message}
          </InlineAlert>
        )}
      </div>
    </AuthShell>
  )
}
