import type { InputHTMLAttributes } from 'react'
import type { MessageComposerTheme } from './MessageComposer'
import './MessageComposer.css'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  theme?: MessageComposerTheme
}

export function ComposerPillInput({ theme = 'dark', className = '', ...props }: Props) {
  return (
    <input
      className={`composer-pill-input composer-pill-input--${theme}${className ? ` ${className}` : ''}`}
      {...props}
    />
  )
}
