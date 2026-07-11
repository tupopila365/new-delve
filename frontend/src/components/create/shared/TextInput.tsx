import type { InputHTMLAttributes } from 'react'
import './TextInput.css'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  error?: string
}

export function TextInput({ error, className = '', ...props }: Props) {
  return (
    <input
      className={`input text-input ${error ? 'text-input--error' : ''} ${className}`}
      {...props}
    />
  )
}