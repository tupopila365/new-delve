import type { FormEvent, ReactNode } from 'react'

export interface AuthFormProps {
  children: ReactNode
  onSubmit?: () => void
  /** Blocks a second submit while a request is in flight. */
  busy?: boolean
  ariaLabel?: string
  gap?: number
}

export default function AuthForm({ children, onSubmit, busy = false, ariaLabel, gap = 18 }: AuthFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    onSubmit?.()
  }

  return (
    <form onSubmit={handleSubmit} aria-label={ariaLabel} noValidate className="flex flex-col" style={{ gap }}>
      {children}
    </form>
  )
}
