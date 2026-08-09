import { evaluatePassword } from '../../data/authConfig'
import type { PasswordEvaluation, PasswordStrengthLevel } from '../../data/authConfig'

export interface PasswordStrengthProps {
  /** Pass a value, or a pre-computed evaluation when the parent already has one. */
  value?: string
  evaluation?: PasswordEvaluation
  showLabel?: boolean
}

const levelColor: Record<PasswordStrengthLevel, string> = {
  empty: 'var(--border)',
  weak: 'var(--auth-danger)',
  fair: 'var(--auth-warning)',
  good: '#3B82F6',
  strong: 'var(--auth-success)',
}

export default function PasswordStrength({ value = '', evaluation, showLabel = true }: PasswordStrengthProps) {
  const result = evaluation ?? evaluatePassword(value)
  const color = levelColor[result.level]

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map(segment => (
          <span
            key={segment}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 999,
              background: result.score >= segment ? color : 'var(--border)',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>
      {showLabel && (
        <p className="text-xs mt-1.5" style={{ color: 'var(--fg-muted)' }} aria-live="polite">
          {result.level === 'empty' ? (
            'Password strength appears as you type.'
          ) : (
            <>
              Strength: <span style={{ color, fontWeight: 600 }}>{result.label}</span>
            </>
          )}
        </p>
      )}
    </div>
  )
}
