import type { ReactNode } from 'react'
import { Ban, Lock } from 'lucide-react'
import {
  AuthHeader,
  AuthShell,
  AuthTitleBlock,
  InlineAlert,
  PrimaryButton,
  SupportLink,
  TextButton,
} from '../../components/auth'
import type { AuthShellLayout } from '../../components/auth/AuthShell'
import { authConfig, buildSupportReference } from '../../data/authConfig'

export interface AccountRestrictedScreenProps {
  layout?: AuthShellLayout
  headerTrailing?: ReactNode
  /** 'restricted' is temporary and appealable; 'disabled' is a closed account. */
  variant?: 'restricted' | 'disabled'
  referenceId?: string
  onContactSupport?: () => void
  onBackToSignIn?: () => void
  onClose?: () => void
}

export default function AccountRestrictedScreen({
  layout = 'auto',
  headerTrailing,
  variant = 'restricted',
  referenceId = buildSupportReference(),
  onContactSupport,
  onBackToSignIn,
  onClose,
}: AccountRestrictedScreenProps) {
  const isDisabled = variant === 'disabled'

  return (
    <AuthShell
      layout={layout}
      image="dunes"
      imageSide="left"
      panelHeadline="Every traveler deserves a safe community."
      panelSupporting="Restrictions protect travelers and hosts. Most are resolved quickly once we have heard from you."
      header={<AuthHeader onBack={onBackToSignIn} backLabel="Back to sign in" trailing={headerTrailing} onClose={onClose} />}
    >
      <AuthTitleBlock
        icon={isDisabled ? <Ban size={24} /> : <Lock size={24} />}
        title={isDisabled ? 'This account has been disabled' : 'This account is restricted'}
        subtitle={
          isDisabled
            ? 'Sign-in is no longer available for this account. Our support team can confirm what happened and what your options are.'
            : 'Sign-in is temporarily unavailable while we review recent activity on this account.'
        }
      />

      <div className="flex flex-col gap-4">
        <InlineAlert tone="security" title="What happens next">
          {isDisabled
            ? 'Contact support with the reference below and we will explain the decision and any next steps.'
            : `Reviews usually finish within one business day. Quote the reference below and support can prioritise it.`}
        </InlineAlert>

        <SupportLink variant="card" referenceId={referenceId} />

        <div
          className="rounded-xl p-3.5"
          style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>
            Good to know
          </p>
          <ul className="text-xs flex flex-col gap-1.5" style={{ color: 'var(--fg-muted)', margin: 0, paddingLeft: 16 }}>
            <li>Your bookings and saved places are not deleted while an account is under review.</li>
            <li>Password resets will not lift a restriction, so there is no need to try one.</li>
            <li>Support will only ever contact you from {authConfig.supportEmail}.</li>
          </ul>
        </div>

        <PrimaryButton
          onClick={onContactSupport ?? (() => { window.location.href = `mailto:${authConfig.supportEmail}` })}
        >
          Contact support
        </PrimaryButton>

        <TextButton align="center" tone="muted" onClick={onBackToSignIn}>
          Back to sign in
        </TextButton>
      </div>
    </AuthShell>
  )
}
