import type { ReactNode } from 'react'
import { Clock, ShieldAlert } from 'lucide-react'
import {
  AuthHeader,
  AuthShell,
  AuthTitleBlock,
  InlineAlert,
  PrimaryButton,
  SecondaryButton,
  SupportLink,
} from '../../components/auth'
import type { AuthShellLayout } from '../../components/auth/AuthShell'

export interface SessionExpiredScreenProps {
  layout?: AuthShellLayout
  headerTrailing?: ReactNode
  onSignIn?: () => void
  onContinueAsGuest?: () => void
  /** Where the traveler is returned to after signing in again. */
  destinationLabel?: string
}

/** Full-page counterpart to SessionExpiredModal, used on a cold app open. */
export default function SessionExpiredScreen({
  layout = 'auto',
  headerTrailing,
  onSignIn,
  onContinueAsGuest,
  destinationLabel,
}: SessionExpiredScreenProps) {
  return (
    <AuthShell
      layout={layout}
      image="dunes"
      imageSide="left"
      panelHeadline="We keep sessions short on purpose."
      panelSupporting="Shared laptops, hostel computers, borrowed phones — signing out protects your bookings."
      header={<AuthHeader trailing={headerTrailing} />}
    >
      <AuthTitleBlock
        icon={<ShieldAlert size={24} />}
        title="Your session has expired"
        subtitle={
          destinationLabel
            ? `Your session has expired. Sign in again to continue to ${destinationLabel}.`
            : 'Your session has expired. Sign in again to continue.'
        }
      />

      <div className="flex flex-col gap-4">
        <InlineAlert tone="info" title="Nothing was lost">
          Saved places, drafts and bookings stay on your account. Signing in restores them straight away.
        </InlineAlert>

        <div
          className="rounded-xl p-3.5 flex items-center gap-3"
          style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
        >
          <Clock size={17} style={{ color: 'var(--fg-muted)' }} />
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            Tip: choose <span style={{ color: 'var(--fg)', fontWeight: 600 }}>Keep me signed in</span> on a device
            that is only yours when you trust it.
          </p>
        </div>

        <PrimaryButton onClick={onSignIn}>Sign in again</PrimaryButton>
        <SecondaryButton onClick={onContinueAsGuest}>Keep browsing as a guest</SecondaryButton>

        <SupportLink />
      </div>
    </AuthShell>
  )
}
