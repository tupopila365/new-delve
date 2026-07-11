import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import './FormField.css'

type BaseProps = {
  label: string
  children?: ReactNode
  hint?: string
  error?: string
  id?: string
}

type InputProps = BaseProps & InputHTMLAttributes<HTMLInputElement>
type TextAreaProps = BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>

export function FormField({ label, children, hint, error, id, className = '' }: InputProps) {
  return (
    <div className={`form-field ${className}`}>
      <label className="form-field__label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && !error && <p className="form-field__hint">{hint}</p>}
      {error && <p className="form-field__error" role="alert">{error}</p>}
    </div>
  )
}

export function FormTextarea({
  label,
  hint,
  error,
  id,
  className = '',
  ...props
}: TextAreaProps) {
  return (
    <div className={`form-field ${className}`}>
      <label className="form-field__label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className="input form-field__textarea"
        {...props}
      />
      {hint && !error && <p className="form-field__hint">{hint}</p>}
      {error && <p className="form-field__error" role="alert">{error}</p>}
    </div>
  )
}