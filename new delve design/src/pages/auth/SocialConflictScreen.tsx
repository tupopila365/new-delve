import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link2, ShieldQuestion } from 'lucide-react'
import {
  AuthHeader,
  AuthShell,
  AuthTitleBlock,
  InlineAlert,
  PrimaryButton,
  SecondaryButton,
  SocialAuthButton,
  SupportLink,
  TextButton,
} from '../../components/auth'
import type { AuthShellLayout } from '../../components/auth/AuthShell'
import { maskEmail } from '../../data/authConfig'
import type { SocialProviderId } from '../../data/authConfig'

export interface SocialConflictScreenProps {
  layout?: AuthShellLayout
  headerTrailing?: ReactNode
  /** Provider the traveler just used. */
  attemptedProvider?: SocialProviderId
  /** How the existing account signs in today. */
  existingMethod?: 'password' | SocialProviderId
  email?: string
  onUseExistingMethod?: () => void
  onLinkAccounts?: () => void
  onBackToSignIn?: () => void
  onClose?: () => void
  staticPreview?: boolean
}

const providerName: Record<SocialProviderId | 'password', string> = {
  google: 'Google',
  apple: 'Apple',
  phone: 'your phone number',
  password: 'an email address and password',
}

/**
 * Reached only after the provider has confirmed control of the address, so
 * naming the existing method here does not leak anything to a stranger.
 */
export default function SocialConflictScreen({
  layout = 'auto',
  headerTrailing,
  attemptedProvider = 'google',
  existingMethod = 'password',
  email = 'traveler@example.com',
  onUseExistingMethod,
  onLinkAccounts,
  onBackToSignIn,
  onClose,
  staticPreview = false,
}: SocialConflictScreenProps) {
  const [linking, setLinking] = useState(false)
  const masked = maskEmail(email)

  function handleLink() {
    setLinking(true)
    if (staticPreview) return
    window.setTimeout(() => {
      setLinking(false)
      onLinkAccounts?.()
    }, 1100)
  }

  return (
    <AuthShell
      layout={layout}
      image="coast"
      imageSide="right"
      panelHeadline="One traveler, one account."
      panelSupporting="Keeping your journeys, saved places and bookings together means never losing a trip history."
      header={<AuthHeader onBack={onBackToSignIn} backLabel="Back to sign in" trailing={headerTrailing} onClose={onClose} />}
    >
      <AuthTitleBlock
        icon={<ShieldQuestion size={24} />}
        title="You already have a Delve account"
        subtitle={
          <>
            The address <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{masked}</span> is already registered
            with {providerName[existingMethod]}. Sign in that way, or link{' '}
            {providerName[attemptedProvider]} to the same account.
          </>
        }
      />

      <div className="flex flex-col gap-4">
        <InlineAlert tone="info" title="Why you are seeing this">
          Delve keeps one account per email address so your history, reviews and bookings stay in one place.
        </InlineAlert>

        {existingMethod === 'password' ? (
          <PrimaryButton onClick={onUseExistingMethod}>Sign in with email and password</PrimaryButton>
        ) : (
          <SocialAuthButton
            provider={existingMethod}
            label={`Continue with ${providerName[existingMethod]}`}
            onClick={onUseExistingMethod}
          />
        )}

        <SecondaryButton
          onClick={handleLink}
          loading={linking}
          iconLeft={<Link2 size={17} />}
        >
          Link {providerName[attemptedProvider]} to this account
        </SecondaryButton>

        <p className="text-xs" style={{ color: 'var(--fg-muted)', lineHeight: 1.6 }}>
          Linking lets you use either method next time. You can unlink a provider later from account settings.
        </p>

        <TextButton align="center" tone="muted" onClick={onBackToSignIn}>
          Use a different account
        </TextButton>

        <SupportLink />
      </div>
    </AuthShell>
  )
}
