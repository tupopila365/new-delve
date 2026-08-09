import { Check } from 'lucide-react'
import { passwordRequirements as defaultRequirements } from '../../data/authConfig'
import type { PasswordRequirement } from '../../data/authConfig'

export interface PasswordRequirementListProps {
  value: string
  /** Requirements are derived from the backend password policy, never hard-coded. */
  requirements?: PasswordRequirement[]
  columns?: 1 | 2
  /** Only colour requirements once the traveler has engaged with the field. */
  showState?: boolean
  title?: string
}

export default function PasswordRequirementList({
  value,
  requirements = defaultRequirements,
  columns = 1,
  showState = true,
  title = 'Your password needs',
}: PasswordRequirementListProps) {
  return (
    <div
      className="mt-3 rounded-xl p-3"
      style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
    >
      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--fg-muted)' }}>
        {title}
      </p>
      <ul
        className={columns === 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5' : 'flex flex-col gap-1.5'}
        style={{ listStyle: 'none', margin: 0, padding: 0 }}
      >
        {requirements.map(requirement => {
          const met = showState && requirement.test(value)
          return (
            <li key={requirement.id} className="flex items-center gap-2 text-xs">
              <span
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{
                  width: 16,
                  height: 16,
                  background: met ? 'var(--auth-success)' : 'transparent',
                  border: met ? 'none' : '1px solid var(--border)',
                  color: '#fff',
                }}
              >
                {met && <Check size={11} strokeWidth={3} />}
              </span>
              <span style={{ color: met ? 'var(--fg)' : 'var(--fg-muted)' }}>{requirement.label}</span>
              <span className="auth-visually-hidden">{met ? ' — met' : ' — not met yet'}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
