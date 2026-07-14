import { useEffect, useRef, type ReactNode } from 'react'
import { CreateStudioHeader } from './CreateStudioHeader'
import './CreateWizardShell.css'

export type WizardStep = { id: number; label: string }

type Props = {
  title: string
  subtitle?: string
  steps: readonly WizardStep[]
  step: number
  variant?: 'light' | 'dark'
  onLeave: () => void
  onStepBack: () => void
  onStepNext: () => void
  onPrimary: () => void
  /** Jump to a visited step without discarding the draft. */
  onStepSelect?: (stepId: number) => void
  /** Highest step the user has reached — used for which step tabs are tappable. */
  furthestStep?: number
  primaryLabel: string
  primaryPendingLabel?: string
  primaryPending?: boolean
  primaryDisabled?: boolean
  error?: string | null
  /** Multiple reasons publish/continue can't proceed — shown as an inline list. */
  errors?: string[]
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
  onStepSelect,
  furthestStep,
  primaryLabel,
  primaryPendingLabel = 'Publishing…',
  primaryPending = false,
  primaryDisabled = false,
  error,
  errors,
  children,
  variant = 'light',
}: Props) {
  const isFirst = step <= 1
  const isLast = step >= steps.length
  const maxReached = Math.max(step, furthestStep ?? step)
  const issueList = [
    ...(error?.trim() ? [error.trim()] : []),
    ...((errors ?? []).map((item) => item.trim()).filter(Boolean)),
  ]
  const uniqueIssues = [...new Set(issueList)]
  const errorRef = useRef<HTMLDivElement>(null)
  const issueKey = uniqueIssues.join('\n')

  useEffect(() => {
    if (uniqueIssues.length === 0) return
    errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [issueKey, step, uniqueIssues.length])

  return (
    <main className={`create-wizard create-wizard--${variant}`}>
      <CreateStudioHeader
        variant={variant}
        title={title}
        subtitle={subtitle}
        onBack={isFirst ? onLeave : onStepBack}
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
        {steps.map((s) => {
          const canSelect = Boolean(onStepSelect) && s.id <= maxReached
          return (
            <button
              key={s.id}
              type="button"
              className={`create-wizard__step${
                step === s.id ? ' is-active' : s.id < step ? ' is-done' : ''
              }${canSelect ? ' is-selectable' : ''}`}
              onClick={() => {
                if (canSelect) onStepSelect?.(s.id)
              }}
              disabled={!canSelect}
              aria-current={step === s.id ? 'step' : undefined}
            >
              <span className="create-wizard__dot" aria-hidden>
                {s.id < step ? '✓' : s.id}
              </span>
              <span className="create-wizard__label">{s.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="create-wizard__body">
        {uniqueIssues.length > 0 ? (
          <div ref={errorRef} className="create-wizard__error" role="alert">
            <p className="create-wizard__error-title">
              {uniqueIssues.length === 1
                ? 'Almost there — fix this to continue:'
                : `Almost there — fix these ${uniqueIssues.length} items to continue:`}
            </p>
            <ul className="create-wizard__error-list">
              {uniqueIssues.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
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
            className="create-wizard__cta"
            onClick={onPrimary}
            disabled={primaryDisabled || primaryPending}
          >
            {primaryPending ? primaryPendingLabel : primaryLabel}
          </button>
        ) : (
          <button type="button" className="create-wizard__cta" onClick={onStepNext}>
            Continue
          </button>
        )}
      </footer>
    </main>
  )
}
