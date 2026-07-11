import type { ReactNode } from 'react'
import './FormRow.css'

type Props = {
  children: ReactNode
  className?: string
}

export function FormRow({ children, className = '' }: Props) {
  return (
    <div className={`form-row ${className}`}>
      {children}
    </div>
  )
}