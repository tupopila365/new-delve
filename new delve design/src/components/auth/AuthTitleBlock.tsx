import type { ReactNode } from 'react'

export interface AuthTitleBlockProps {
  title: string
  subtitle?: ReactNode
  /** Small purple eyebrow above the title, e.g. "Create your account". */
  eyebrow?: string
  icon?: ReactNode
  align?: 'left' | 'center'
  size?: 'md' | 'lg'
}

export default function AuthTitleBlock({
  title,
  subtitle,
  eyebrow,
  icon,
  align = 'left',
  size = 'lg',
}: AuthTitleBlockProps) {
  return (
    <div className={align === 'center' ? 'text-center' : ''} style={{ marginBottom: 24 }}>
      {icon && (
        <div
          className={`inline-flex items-center justify-center rounded-2xl mb-4 ${align === 'center' ? '' : ''}`}
          style={{ width: 52, height: 52, background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}
        >
          {icon}
        </div>
      )}
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--primary)' }}>
          {eyebrow}
        </p>
      )}
      <h1
        className="font-display font-bold"
        style={{
          fontSize: size === 'lg' ? 30 : 24,
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          color: 'var(--fg)',
          margin: 0,
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm mt-2.5" style={{ color: 'var(--fg-muted)', lineHeight: 1.6 }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
