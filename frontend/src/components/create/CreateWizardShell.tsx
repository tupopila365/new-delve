import type { ReactNode } from 'react'
import { CreateStudioHeader } from './CreateStudioHeader'
import './CreateWizardShell.css'

export type WizardStep = { id: number; label: string }

type Props = {
  title: string
  subtitle?: string
  steps: readonly WizardStep[]
  step: number
  onLeave: () => void
  onStepBack: () => void
  onStepNext: () => void
  onPrimary: () => void
  primaryLabel: string
  primaryPendingLabel?: string
  primaryPending?: boolean
  primaryDisabled?: boolean
  error?: string | null
  children: ReactNode
}

export function CreateWizardShell({
  title,
  subtitle,
  steps,
  step,
  onLeave,
  onStepBack,
  onStepNext,
  onPrimary,
  primaryLabel,
  primaryPendingLabel = 'Publishing…',
  primaryPending = false,
  primaryDisabled = false,
  error,
  children,
}: Props) {
  const isFirst = step <= 1
  const isLast = step >= steps.length

  return (
    <main className="create-wizard">
      <CreateStudioHeader
        variant="light"
        title={title}
        subtitle={subtitle}
        onBack={onLeave}
        actionLabel={isLast ? primaryLabel : 'Continue'}
        actionDisabled={primaryDisabled || primaryPending}
        actionPending={isLast && primaryPending}
        actionPendingLabel={primaryPendingLabel}
        onAction={() => {
          if (isLast) onPrimary()
          else onStepNext()
        }}
      />

      <nav className="create-wizard__steps" aria-label="Form progress">
        {steps.map((s) => (
          <div
            key={s.id}
            className={`create-wizard__step${
              step === s.id ? ' is-active' : step > s.id ? ' is-done' : ''
            }`}
          >
            <span className="create-wizard__dot" aria-hidden>
              {step > s.id ? '✓' : s.id}
            </span>
            <span className="create-wizard__label">{s.label}</span>
          </div>
        ))}
      </nav>

      <div className="create-wizard__body">
        {error ? (
          <p className="create-wizard__error" role="alert">
            {error}
          </p>
        ) : null}
        {children}
      </div>

      <footer className="create-wizard__nav">
        {isFirst ? (
          <button type="button" className="btn btn-ghost" onClick={onLeave}>
            Cancel
          </button>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={onStepBack}>
            Back
          </button>
        )}
        {isLast ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onPrimary}
            disabled={primaryDisabled || primaryPending}
          >
            {primaryPending ? primaryPendingLabel : primaryLabel}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={onStepNext}>
            Continue
          </button>
        )}
      </footer>
    </main>
  )
}
