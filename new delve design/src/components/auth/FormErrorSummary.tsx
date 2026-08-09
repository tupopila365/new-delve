import { AlertTriangle } from 'lucide-react'

export interface FormErrorSummaryItem {
  fieldId: string
  message: string
}

export interface FormErrorSummaryProps {
  errors: FormErrorSummaryItem[]
  title?: string
}

/** Shown after a failed submit so screen readers get one clear entry point. */
export default function FormErrorSummary({
  errors,
  title = 'Please check the following',
}: FormErrorSummaryProps) {
  if (errors.length === 0) return null

  return (
    <div
      role="alert"
      tabIndex={-1}
      className="rounded-xl p-3.5"
      style={{
        background: 'color-mix(in srgb, var(--auth-danger) 8%, var(--surface))',
        border: '1px solid color-mix(in srgb, var(--auth-danger) 35%, transparent)',
      }}
    >
      <p className="text-sm font-semibold flex items-center gap-2 mb-2" style={{ color: 'var(--fg)' }}>
        <AlertTriangle size={16} style={{ color: 'var(--auth-danger)' }} />
        {title}
      </p>
      <ul className="flex flex-col gap-1" style={{ margin: 0, paddingLeft: 26 }}>
        {errors.map(error => (
          <li key={error.fieldId} className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            <a
              href={`#${error.fieldId}`}
              style={{ color: 'var(--primary)', textDecoration: 'underline', textUnderlineOffset: 2 }}
            >
              {error.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
