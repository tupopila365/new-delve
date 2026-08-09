import { useState } from 'react'
import type { ReactNode } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import TextField from './TextField'
import type { FieldState } from '../../data/authConfig'

export interface PasswordFieldProps {
  label?: string
  value: string
  onChange?: (value: string) => void
  onBlur?: () => void
  name?: string
  id?: string
  placeholder?: string
  hint?: string
  error?: string
  successMessage?: string
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  loading?: boolean
  autoComplete?: 'current-password' | 'new-password'
  previewState?: FieldState
  /** Renders in the label row, e.g. a "Forgot password?" link. */
  labelAction?: ReactNode
  /** Start revealed only in documentation contexts — never with real input. */
  defaultRevealed?: boolean
  autoFocus?: boolean
}

export default function PasswordField({
  label = 'Password',
  value,
  onChange,
  onBlur,
  name,
  id,
  placeholder = '••••••••••',
  hint,
  error,
  successMessage,
  disabled = false,
  readOnly = false,
  required = false,
  loading = false,
  autoComplete = 'current-password',
  previewState,
  labelAction,
  defaultRevealed = false,
  autoFocus,
}: PasswordFieldProps) {
  const [revealed, setRevealed] = useState(defaultRevealed)
  const canToggle = !disabled && !readOnly && previewState !== 'disabled'

  return (
    <TextField
      label={label}
      id={id}
      name={name}
      type={revealed ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      hint={hint}
      error={error}
      successMessage={successMessage}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      loading={loading}
      autoComplete={autoComplete}
      previewState={previewState}
      labelAction={labelAction}
      autoFocus={autoFocus}
      iconLeft={<Lock size={17} />}
      trailing={
        <button
          type="button"
          onClick={() => canToggle && setRevealed(current => !current)}
          aria-label={revealed ? 'Hide password' : 'Show password'}
          aria-pressed={revealed}
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{
            width: 40,
            height: 40,
            marginRight: -8,
            background: 'transparent',
            border: 'none',
            color: 'var(--fg-muted)',
            cursor: canToggle ? 'pointer' : 'not-allowed',
          }}
        >
          {revealed ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      }
    />
  )
}
