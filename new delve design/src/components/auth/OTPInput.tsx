import { useEffect, useRef, useState } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import { authConfig } from '../../data/authConfig'

export interface OTPInputProps {
  value: string
  onChange: (value: string) => void
  /** Length comes from backend verification settings. */
  length?: number
  label?: string
  hint?: string
  error?: string
  success?: boolean
  disabled?: boolean
  loading?: boolean
  autoFocus?: boolean
  onComplete?: (value: string) => void
}

export default function OTPInput({
  value,
  onChange,
  length = authConfig.verification.otpLength,
  label = 'Verification code',
  hint,
  error,
  success = false,
  disabled = false,
  loading = false,
  autoFocus = false,
  onComplete,
}: OTPInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const digits = Array.from({ length }, (_, index) => value[index] ?? '')

  useEffect(() => {
    if (autoFocus) inputs.current[0]?.focus()
  }, [autoFocus])

  function commit(next: string) {
    const trimmed = next.slice(0, length)
    onChange(trimmed)
    if (trimmed.length === length) onComplete?.(trimmed)
  }

  function handleDigit(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const next = digits.slice()
    next[index] = digit
    commit(next.join('').replace(/\s/g, ''))
    if (digit && index < length - 1) {
      inputs.current[index + 1]?.focus()
      setActiveIndex(index + 1)
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const next = digits.slice()
      if (next[index]) {
        next[index] = ''
        commit(next.join(''))
      } else if (index > 0) {
        next[index - 1] = ''
        commit(next.join(''))
        inputs.current[index - 1]?.focus()
        setActiveIndex(index - 1)
      }
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      inputs.current[index - 1]?.focus()
      setActiveIndex(index - 1)
    }
    if (event.key === 'ArrowRight' && index < length - 1) {
      inputs.current[index + 1]?.focus()
      setActiveIndex(index + 1)
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    commit(pasted)
    const focusIndex = Math.min(pasted.length, length - 1)
    inputs.current[focusIndex]?.focus()
    setActiveIndex(focusIndex)
  }

  const borderFor = (index: number) => {
    if (error) return 'var(--auth-danger)'
    if (success) return 'var(--auth-success)'
    if (activeIndex === index) return 'var(--primary)'
    return digits[index] ? 'var(--fg-muted)' : 'var(--border)'
  }

  return (
    <fieldset style={{ border: 'none', margin: 0, padding: 0 }} disabled={disabled || loading}>
      <legend className="text-sm font-semibold mb-2" style={{ color: 'var(--fg)', padding: 0 }}>
        {label}
      </legend>
      <div className="flex gap-2 sm:gap-2.5" onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={element => {
              inputs.current[index] = element
            }}
            className="auth-otp-input"
            value={digit}
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            aria-label={`Digit ${index + 1} of ${length}`}
            aria-invalid={error ? true : undefined}
            maxLength={1}
            disabled={disabled || loading}
            onChange={event => handleDigit(index, event.target.value)}
            onKeyDown={event => handleKeyDown(index, event)}
            onFocus={() => setActiveIndex(index)}
            style={{
              borderColor: borderFor(index),
              boxShadow: activeIndex === index && !error ? '0 0 0 3px var(--auth-focus-halo)' : 'none',
              opacity: disabled ? 0.6 : 1,
            }}
          />
        ))}
      </div>
      {(error || hint) && (
        <p
          className="text-xs mt-2"
          role={error ? 'alert' : undefined}
          style={{ color: error ? 'var(--auth-danger)' : 'var(--fg-muted)' }}
        >
          {error ?? hint}
        </p>
      )}
    </fieldset>
  )
}
