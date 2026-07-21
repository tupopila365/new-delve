import { useState } from 'react'
import { apiFetch } from '../../api/client'
import { authFormError } from '../../utils/authErrors'

type Props = {
  email?: string
  authenticated?: boolean
  className?: string
  messageClassName?: string
  errorClassName?: string
  onSent?: () => void
}

export function ResendVerificationButton({
  email,
  authenticated = false,
  className = 'auth-page__secondary',
  messageClassName = 'auth-page__success',
  errorClassName = 'auth-page__error',
  onSent,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function onResend() {
    if (busy) return
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      const body = authenticated || !email?.trim() ? undefined : JSON.stringify({ email: email.trim() })
      const res = await apiFetch<{ detail: string }>('/api/accounts/resend-verification/', {
        method: 'POST',
        auth: authenticated,
        body,
      })
      setMsg(res.detail)
      onSent?.()
    } catch (e) {
      setErr(authFormError(e, 'Could not resend email.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" className={className} disabled={busy} onClick={() => void onResend()}>
        {busy ? 'Sending…' : 'Resend email'}
      </button>
      {msg ? (
        <p className={messageClassName} role="status">
          {msg}
        </p>
      ) : null}
      {err ? (
        <p className={errorClassName} role="alert">
          {err}
        </p>
      ) : null}
    </>
  )
}
