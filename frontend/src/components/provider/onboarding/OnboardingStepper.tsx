import type { OnboardingStep } from '../../../data/providerOnboarding'

type Props = {
  current: OnboardingStep
  steps: { id: OnboardingStep; label: string }[]
}

export function OnboardingStepper({ current, steps }: Props) {
  const currentIdx = steps.findIndex((s) => s.id === current)

  return (
    <nav className="prov-onboard__steps" aria-label="Onboarding progress">
      {steps.map((step, idx) => {
        const done = idx < currentIdx
        const active = step.id === current
        return (
          <span
            key={step.id}
            className={`prov-onboard__dot${active ? ' prov-onboard__dot--active' : ''}${done ? ' prov-onboard__dot--done' : ''}`}
            aria-current={active ? 'step' : undefined}
            title={step.label}
          />
        )
      })}
    </nav>
  )
}
