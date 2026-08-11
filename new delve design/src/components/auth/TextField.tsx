import { useId, useState } from 'react'
import type { InputHTMLAttributes, KeyboardEvent, ReactNode } from 'react'
import { AlertCircle, Check } from 'lucide-react'
import LoadingSpinner from './LoadingSpinner'
import type { FieldState } from '../../data/authConfig'

export interface TextFieldProps {
  label: string
  value: string
  onChange?: (value: string) => void
  onBlur?: () => void
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
  onKeyUp?: (event: KeyboardEvent<HTMLInputElement>) => void
  id?: string
  name?: string
  type?: 'text' | 'email' | 'tel' | 'password' | 'number'
  placeholder?: string
  /** Helper copy under the field. Hidden while an error is showing. */
  hint?: string
  error?: string
  successMessage?: string
  loading?: boolean
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  autoComplete?: string
  autoCapitalize?: InputHTMLAttributes<HTMLInputElement>['autoCapitalize']
  autoCorrect?: string
  spellCheck?: boolean
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
  maxLength?: number
  autoFocus?: boolean
  iconLeft?: ReactNode
  /** Rendered inside the field on the right, e.g. a show/hide toggle. */
  trailing?: ReactNode
  /** Rendered to the left of the input, outside the border, e.g. a dial code. */
  leading?: ReactNode
  /** Forces a visual state for the design board without user interaction. */
  previewState?: FieldState
  labelAction?: ReactNode
}

export default function TextField({
  label,
  value,
  onChange,
  onBlur,
  onKeyDown,
  onKeyUp,
  id,
  name,
  type = 'text',
  placeholder,
  hint,
  error,
  successMessage,
  loading = false,
  disabled = false,
  readOnly = false,
  required = false,
  autoComplete,
  autoCapitalize,
  autoCorrect,
  spellCheck,
  inputMode,
  maxLength,
  autoFocus,
  iconLeft,
  trailing,
  leading,
  previewState,
  labelAction,
}: TextFieldProps) {
  const reactId = useId()
  const fieldId = id ?? `field-${reactId}`
  const [focused, setFocused] = useState(false)
  const [hovered, setHovered] = useState(false)

  const state: FieldState =
    previewState ??
    (loading
      ? 'loading'
      : disabled
        ? 'disabled'
        : readOnly
          ? 'readOnly'
          : error
            ? 'error'
            : successMessage
              ? 'success'
              : focused
                ? 'focus'
                : hovered
                  ? 'hover'
                  : value
                    ? 'filled'
                    : 'default')

  const isDisabled = disabled || previewState === 'disabled'
  const isReadOnly = readOnly || previewState === 'readOnly'
  const isLoading = loading || previewState === 'loading'
  const hasError = Boolean(error) || previewState === 'error'
  const hasSuccess = (Boolean(successMessage) || previewState === 'success') && !hasError

  const borderColor = hasError
    ? 'var(--auth-danger)'
    : hasSuccess
      ? 'var(--auth-success)'
      : state === 'focus'
        ? 'var(--primary)'
        : state === 'hover'
          ? 'var(--fg-muted)'
          : 'var(--border)'

  const messageId = `${fieldId}-message`
  const message = hasError ? error : hasSuccess ? successMessage : hint
  const displayValue =
    previewState === 'filled' && !value ? 'Amara' : previewState === 'readOnly' && !value ? value : value

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <label
          htmlFor={fieldId}
          className="text-sm font-semibold"
          style={{ color: isDisabled ? 'var(--fg-muted)' : 'var(--fg)' }}
        >
          {label}
          {required && (
            <span aria-hidden="true" style={{ color: 'var(--auth-danger)', marginLeft: 2 }}>
              *
            </span>
          )}
        </label>
        {labelAction}
      </div>

      <div className="flex items-stretch gap-2">
        {leading}
        <div
          className="flex items-center gap-2 flex-1 min-w-0"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            minHeight: 48,
            padding: '0 14px',
            borderRadius: 12,
            border: `1px solid ${borderColor}`,
            background: isDisabled
              ? 'var(--surface-subtle)'
              : isReadOnly
                ? 'var(--surface-subtle)'
                : 'var(--surface)',
            boxShadow: state === 'focus' ? '0 0 0 3px var(--auth-focus-halo)' : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
            opacity: isDisabled ? 0.7 : 1,
          }}
        >
          {iconLeft && (
            <span className="flex-shrink-0" style={{ color: 'var(--fg-muted)', display: 'flex' }}>
              {iconLeft}
            </span>
          )}
          <input
            id={fieldId}
            name={name}
            type={type}
            value={displayValue}
            placeholder={placeholder}
            disabled={isDisabled}
            readOnly={isReadOnly}
            required={required}
            autoComplete={autoComplete}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            spellCheck={spellCheck}
            inputMode={inputMode}
            maxLength={maxLength}
            autoFocus={autoFocus}
            aria-invalid={hasError || undefined}
            aria-describedby={message ? messageId : undefined}
            onChange={event => onChange?.(event.target.value)}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false)
              onBlur?.()
            }}
            className="flex-1 min-w-0 text-base"
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--fg)',
              height: 46,
              fontFamily: 'inherit',
              fontSize: 16,
              cursor: isReadOnly ? 'default' : 'text',
            }}
          />
          {isLoading && <LoadingSpinner size={16} color="var(--fg-muted)" />}
          {!isLoading && hasSuccess && <Check size={17} style={{ color: 'var(--auth-success)' }} />}
          {!isLoading && hasError && <AlertCircle size={17} style={{ color: 'var(--auth-danger)' }} />}
          {trailing}
        </div>
      </div>

      {message && (
        <p
          id={messageId}
          className="text-xs mt-1.5 flex items-start gap-1.5"
          role={hasError ? 'alert' : undefined}
          style={{
            color: hasError ? 'var(--auth-danger)' : hasSuccess ? 'var(--auth-success)' : 'var(--fg-muted)',
            lineHeight: 1.45,
          }}
        >
          {message}
        </p>
      )}
    </div>
  )
}
