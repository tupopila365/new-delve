import { Mail } from 'lucide-react'
import TextField from './TextField'
import type { TextFieldProps } from './TextField'

export type EmailFieldProps = Omit<TextFieldProps, 'type' | 'inputMode' | 'iconLeft' | 'label'> & {
  label?: string
  hideIcon?: boolean
}

export default function EmailField({
  label = 'Email address',
  placeholder = 'you@example.com',
  autoComplete = 'email',
  hideIcon = false,
  ...rest
}: EmailFieldProps) {
  return (
    <TextField
      {...rest}
      label={label}
      type="email"
      inputMode="email"
      placeholder={placeholder}
      autoComplete={autoComplete}
      iconLeft={hideIcon ? undefined : <Mail size={17} />}
    />
  )
}
