import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { usernameSchema } from '@delve/contracts'
import {
  AuthApiError,
  changeUsername,
  checkUsernameAvailable,
  fetchUsernameChangeStatus,
} from '../api/authClient'
import { formatUsername } from '../lib/formatUsername'

export default function UsernameSettingsPanel() {
  const [current, setCurrent] = useState('')
  const [changedAt, setChangedAt] = useState<string | null>(null)
  const [nextAt, setNextAt] = useState<string | null>(null)
  const [canChange, setCanChange] = useState(true)
  const [nextUsername, setNextUsername] = useState('')
  const [password, setPassword] = useState('')
  const [availability, setAvailability] = useState<string>('Enter a new username to check availability')
  const [available, setAvailable] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<number | null>(null)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const status = await fetchUsernameChangeStatus()
        setCurrent(status.username)
        setChangedAt(status.usernameChangedAt)
        setNextAt(status.nextChangeAvailableAt)
        setCanChange(status.canChange)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Could not load username settings')
      }
    })()
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
      abort.current?.abort()
    }
  }, [])

  function scheduleCheck(value: string) {
    setAvailable(null)
    if (timer.current) window.clearTimeout(timer.current)
    abort.current?.abort()
    const parsed = usernameSchema.safeParse(value)
    if (!parsed.success) {
      setAvailability(parsed.error.issues[0]?.message || 'Invalid username')
      return
    }
    timer.current = window.setTimeout(() => {
      const controller = new AbortController()
      abort.current = controller
      void (async () => {
        try {
          const result = await checkUsernameAvailable(parsed.data, controller.signal)
          if (controller.signal.aborted) return
          setAvailable(result.available)
          setAvailability(
            result.available
              ? 'Username is available'
              : result.reason === 'reserved'
                ? 'That username is reserved'
                : result.reason === 'taken'
                  ? 'That username is already taken'
                  : 'Username is unavailable',
          )
        } catch {
          if (!controller.signal.aborted) setAvailability('Could not check availability')
        }
      })()
    }, 400)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    setError(null)
    if (!canChange) return
    const parsed = usernameSchema.safeParse(nextUsername)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Invalid username')
      return
    }
    if (!password) {
      setError('Enter your current password')
      return
    }
    setBusy(true)
    try {
      const result = await changeUsername({ username: parsed.data, currentPassword: password })
      setCurrent(result.username)
      setChangedAt(result.usernameChangedAt)
      setNextAt(result.nextChangeAvailableAt)
      setCanChange(false)
      setNextUsername('')
      setPassword('')
      setMessage(`Username updated to ${formatUsername(result.username)}`)
    } catch (err: unknown) {
      if (err instanceof AuthApiError && err.code === 'USERNAME_CHANGE_COOLDOWN') {
        const details = err.details as { nextChangeAvailableAt?: string } | undefined
        if (details?.nextChangeAvailableAt) setNextAt(details.nextChangeAvailableAt)
        setCanChange(false)
      }
      setError(err instanceof Error ? err.message : 'Could not change username')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className="rounded-2xl px-3.5 py-4 mb-2.5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      aria-labelledby="username-settings-heading"
    >
      <h2 id="username-settings-heading" className="font-display text-lg font-bold mb-1" style={{ color: 'var(--fg)' }}>
        Username
      </h2>
      <p className="text-sm mb-3" style={{ color: 'var(--fg-muted)' }}>
        Current handle: <strong style={{ color: 'var(--fg)' }}>{formatUsername(current) || '—'}</strong>
      </p>
      <ul className="text-xs mb-3 space-y-1" style={{ color: 'var(--fg-muted)' }}>
        <li>3–30 characters · letters, numbers, underscores, periods</li>
        <li>Must start and end with a letter or number · no consecutive periods</li>
        <li>Usernames are case-insensitive and shown as @username</li>
        <li>You can change your username once every 30 days</li>
      </ul>
      <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
        Last change: {changedAt ? new Date(changedAt).toLocaleString() : 'Never (registration does not count)'}
        <br />
        Next change:{' '}
        {canChange ? 'Available now' : nextAt ? new Date(nextAt).toLocaleString() : 'Unavailable'}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        <label className="text-sm font-semibold" style={{ color: 'var(--fg)' }} htmlFor="account-new-username">
          New username
        </label>
        <input
          id="account-new-username"
          value={nextUsername}
          disabled={!canChange || busy}
          onChange={e => {
            setNextUsername(e.target.value)
            scheduleCheck(e.target.value)
          }}
          className="rounded-xl px-3 py-2.5 text-sm"
          style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          autoComplete="username"
        />
        <p className="text-xs" aria-live="polite" style={{ color: available === false ? 'var(--danger, #c2410c)' : 'var(--fg-muted)' }}>
          {availability}
        </p>
        <label className="text-sm font-semibold" style={{ color: 'var(--fg)' }} htmlFor="account-current-password">
          Current password
        </label>
        <input
          id="account-current-password"
          type="password"
          value={password}
          disabled={!canChange || busy}
          onChange={e => setPassword(e.target.value)}
          className="rounded-xl px-3 py-2.5 text-sm"
          style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          autoComplete="current-password"
        />
        {!canChange && (
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            Username changes are locked until {nextAt ? new Date(nextAt).toLocaleString() : 'the cooldown ends'}.
          </p>
        )}
        {error && (
          <p className="text-sm" style={{ color: 'var(--danger, #c2410c)' }}>
            {error}
          </p>
        )}
        {message && (
          <p className="text-sm" style={{ color: 'var(--primary)' }}>
            {message}
          </p>
        )}
        <button
          type="submit"
          disabled={!canChange || busy || available === false}
          className="mt-1 rounded-xl px-3 py-2.5 text-sm font-semibold"
          style={{
            background: canChange ? 'var(--primary)' : 'var(--surface-subtle)',
            color: canChange ? '#fff' : 'var(--fg-muted)',
            border: 'none',
            cursor: canChange ? 'pointer' : 'not-allowed',
          }}
        >
          {busy ? 'Saving…' : 'Change username'}
        </button>
      </form>
    </section>
  )
}
