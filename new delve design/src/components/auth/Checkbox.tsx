import { useId } from 'react'
import type { ReactNode } from 'react'
import { Check } from 'lucide-react'

export interface CheckboxProps {
  checked: boolean
  onChange?: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
  error?: string
  required?: boolean
  id?: string
}

export default function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  error,
  required = false,
  id,
}: CheckboxProps) {
  const reactId = useId()
  const inputId = id ?? `checkbox-${reactId}`
  const messageId = `${inputId}-message`

  return (
    <div>
      <div className="flex items-start gap-3" style={{ minHeight: 44 }}>
        <span className="relative flex-shrink-0" style={{ width: 22, height: 22, marginTop: 11 }}>
          <input
            id={inputId}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? messageId : undefined}
            onChange={event => onChange?.(event.target.checked)}
            className="auth-checkbox-input"
          />
          <span
            aria-hidden="true"
            className="flex items-center justify-center"
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              border: `1.5px solid ${error ? 'var(--auth-danger)' : checked ? 'var(--primary)' : 'var(--border)'}`,
              background: checked ? 'var(--primary)' : 'var(--surface)',
              color: '#fff',
              transition: 'background 0.15s, border-color 0.15s',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {checked && <Check size={14} strokeWidth={3} />}
          </span>
        </span>
        <label
          htmlFor={inputId}
          className="text-sm flex-1 py-2.5"
          style={{ color: disabled ? 'var(--fg-muted)' : 'var(--fg)', cursor: disabled ? 'not-allowed' : 'pointer', lineHeight: 1.5 }}
        >
          {label}
          {description && (
            <span className="block text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
              {description}
            </span>
          )}
        </label>
      </div>
      {error && (
        <p id={messageId} role="alert" className="text-xs mt-0.5 ml-9" style={{ color: 'var(--auth-danger)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
