import type { InputHTMLAttributes } from 'react'
import { Calendar } from 'lucide-react'
import './DateInput.css'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

export function DateInput({ label, error, id, className = '', ...props }: Props) {
  return (
    <div className={`form-field ${className}`}>
      <label className="form-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="date-input">
        <input
          id={id}
          type="date"
          className={`input date-input__field ${error ? 'text-input--error' : ''}`}
          {...props}
        />
        <Calendar size={18} strokeWidth={2.25} className="date-input__icon" aria-hidden />
      </div>
      {error && <p className="form-field__error" role="alert">{error}</p>}
    </div>
  )
}