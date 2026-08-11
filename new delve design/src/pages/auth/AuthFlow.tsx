import { useState } from 'react'
import type { ReactNode } from 'react'
import SignInScreen from './SignInScreen'
import SignUpScreen from './SignUpScreen'
import ForgotPasswordFlow from './ForgotPasswordFlow'
import EmailVerificationScreen from './EmailVerificationScreen'
import PhoneVerificationScreen from './PhoneVerificationScreen'
import SessionExpiredScreen from './SessionExpiredScreen'
import AccountRestrictedScreen from './AccountRestrictedScreen'
import type { AuthShellLayout } from '../../components/auth/AuthShell'

export type AuthRoute =
  | 'signIn'
  | 'signUp'
  | 'forgotPassword'
  | 'emailVerification'
  | 'phoneVerification'
  | 'sessionExpired'
  | 'accountRestricted'

export interface AuthFlowProps {
  initialRoute?: AuthRoute
  layout?: AuthShellLayout
  headerTrailing?: ReactNode
  onAuthenticated?: () => void
  onExit?: () => void
  onSetUpProfile?: () => void
  destinationLabel?: string
  onRouteChange?: (route: AuthRoute) => void
  staticPreview?: boolean
}

/** Connects every auth screen into the walkable flow used by the app. */
export default function AuthFlow({
  initialRoute = 'signIn',
  layout = 'auto',
  headerTrailing,
  onAuthenticated,
  onExit,
  onSetUpProfile,
  destinationLabel,
  onRouteChange,
  staticPreview = false,
}: AuthFlowProps) {
  const [route, setRoute] = useState<AuthRoute>(initialRoute)
  const [email, setEmail] = useState('')

  function go(next: AuthRoute) {
    setRoute(next)
    onRouteChange?.(next)
  }

  const shared = { layout, headerTrailing, staticPreview }

  switch (route) {
    case 'signUp':
      return (
        <SignUpScreen
          {...shared}
          onNavigateSignIn={() => go('signIn')}
          onComplete={onAuthenticated}
          onSetUpProfile={onSetUpProfile ?? onAuthenticated}
          onClose={onExit}
        />
      )

    case 'forgotPassword':
      return (
        <ForgotPasswordFlow
          {...shared}
          initialEmail={email}
          onBackToSignIn={() => go('signIn')}
          onDone={() => go('signIn')}
          onClose={onExit}
        />
      )

    case 'emailVerification':
      return (
        <EmailVerificationScreen
          {...shared}
          email={email || 'traveler@example.com'}
          onBackToSignIn={() => go('signIn')}
          onChangeEmail={() => go('signUp')}
          onContinue={onAuthenticated}
          onClose={onExit}
        />
      )

    case 'phoneVerification':
      return (
        <PhoneVerificationScreen
          {...shared}
          onVerified={onAuthenticated}
          onChangeNumber={() => go('signUp')}
          onSkip={onAuthenticated}
          onClose={onExit}
        />
      )

    case 'sessionExpired':
      return (
        <SessionExpiredScreen
          layout={layout}
          headerTrailing={headerTrailing}
          destinationLabel={destinationLabel}
          onSignIn={() => go('signIn')}
          onContinueAsGuest={onExit}
        />
      )

    case 'accountRestricted':
      return (
        <AccountRestrictedScreen
          layout={layout}
          headerTrailing={headerTrailing}
          onBackToSignIn={() => go('signIn')}
          onClose={onExit}
        />
      )

    default:
      return (
        <SignInScreen
          {...shared}
          destinationLabel={destinationLabel}
          onSignedIn={onAuthenticated}
          onNavigateSignUp={() => go('signUp')}
          onNavigateForgotPassword={() => go('forgotPassword')}
          onNavigateVerifyEmail={value => {
            setEmail(value)
            go('emailVerification')
          }}
          onNavigateRestricted={() => go('accountRestricted')}
          onClose={onExit}
        />
      )
  }
}
