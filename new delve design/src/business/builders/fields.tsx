import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'

export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
        {label}
        {required ? <span style={{ color: '#C83B3B' }}> *</span> : <span className="font-normal normal-case"> (optional)</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{hint}</p>}
      {error && (
        <p className="text-xs flex items-start gap-1" style={{ color: '#C83B3B' }} role="alert">
          <AlertCircle size={12} className="mt-0.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full min-w-0 px-3 py-2.5 rounded-lg text-sm min-h-[44px] ${props.className ?? ''}`}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${props['aria-invalid'] ? '#C83B3B' : 'var(--border)'}`,
        color: 'var(--fg)',
        outline: 'none',
        ...((props.style as object) ?? {}),
      }}
    />
  )
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full min-w-0 px-3 py-2.5 rounded-lg text-sm resize-y min-h-[96px] ${props.className ?? ''}`}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${props['aria-invalid'] ? '#C83B3B' : 'var(--border)'}`,
        color: 'var(--fg)',
        outline: 'none',
        ...((props.style as object) ?? {}),
      }}
    />
  )
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full min-w-0 px-3 py-2.5 rounded-lg text-sm min-h-[44px] ${props.className ?? ''}`}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--fg)',
        outline: 'none',
        ...((props.style as object) ?? {}),
      }}
    />
  )
}

export function ChoiceGrid({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: { id: string; label: string; description?: string; disabled?: boolean }[]
  value: string
  onChange: (id: string) => void
  columns?: 2 | 3
}) {
  return (
    <div className={`grid gap-2 ${columns === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
      {options.map(opt => {
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            disabled={opt.disabled}
            onClick={() => onChange(opt.id)}
            className="text-left px-3 py-3 rounded-xl min-h-[44px] transition-colors"
            style={{
              background: active ? 'rgba(95,47,201,0.1)' : 'var(--surface)',
              border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
              color: opt.disabled ? 'var(--fg-muted)' : 'var(--fg)',
              opacity: opt.disabled ? 0.55 : 1,
              cursor: opt.disabled ? 'not-allowed' : 'pointer',
            }}
            aria-pressed={active}
          >
            <p className="text-sm font-semibold">{opt.label}</p>
            {opt.description && <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{opt.description}</p>}
          </button>
        )
      })}
    </div>
  )
}

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section
      className="rounded-2xl p-4 sm:p-5 flex flex-col gap-4 min-w-0"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div>
        <h2 className="text-base font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}>{title}</h2>
        {description && <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>{description}</p>}
      </div>
      {children}
    </section>
  )
}

export function InlineNotice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warning' | 'error' | 'success'
  children: ReactNode
}) {
  const colors = {
    info: { bg: 'rgba(39,105,199,0.08)', border: 'rgba(39,105,199,0.25)', fg: '#2769C7', Icon: Info },
    warning: { bg: 'rgba(183,104,8,0.08)', border: 'rgba(183,104,8,0.25)', fg: '#B76808', Icon: AlertCircle },
    error: { bg: 'rgba(200,59,59,0.08)', border: 'rgba(200,59,59,0.25)', fg: '#C83B3B', Icon: AlertCircle },
    success: { bg: 'rgba(22,132,91,0.08)', border: 'rgba(22,132,91,0.25)', fg: '#16845B', Icon: CheckCircle2 },
  }[tone]
  const Icon = colors.Icon
  return (
    <div
      className="flex items-start gap-2.5 px-3 py-3 rounded-xl text-sm"
      style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.fg }}
      role="status"
    >
      <Icon size={16} className="shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
