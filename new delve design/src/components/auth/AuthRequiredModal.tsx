import { useId } from 'react'
import { Bookmark, CalendarCheck, MessageCircle, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import ModalOverlay from './ModalOverlay'
import PrimaryButton from './PrimaryButton'
import SecondaryButton from './SecondaryButton'
import TermsAndPrivacyText from './TermsAndPrivacyText'

export type GuestAction = 'save' | 'book' | 'join' | 'message' | 'generic'

export interface AuthRequiredCopy {
  title: string
  message: string
  icon: ReactNode
}

export const guestActionCopy: Record<GuestAction, AuthRequiredCopy> = {
  save: {
    title: 'Save this for later',
    message: 'Create a free Delve account to keep places, deals and journeys in one place.',
    icon: <Bookmark size={22} />,
  },
  book: {
    title: 'Sign in to book',
    message: 'You need an account so we can hold your booking and send you the confirmation.',
    icon: <CalendarCheck size={22} />,
  },
  join: {
    title: 'Join the community',
    message: 'Sign in to post, answer local questions and follow other travelers.',
    icon: <Users size={22} />,
  },
  message: {
    title: 'Sign in to send a message',
    message: 'Messaging hosts and guides is available to signed-in travelers.',
    icon: <MessageCircle size={22} />,
  },
  generic: {
    title: 'Sign in to continue',
    message: "You'll come straight back to where you left off.",
    icon: <Bookmark size={22} />,
  },
}

export interface AuthRequiredModalProps {
  open: boolean
  action?: GuestAction
  onSignIn: () => void
  onCreateAccount: () => void
  onClose: () => void
  /** Where the traveler returns after authenticating. */
  destinationLabel?: string
  contained?: boolean
}

export default function AuthRequiredModal({
  open,
  action = 'generic',
  onSignIn,
  onCreateAccount,
  onClose,
  destinationLabel,
  contained = false,
}: AuthRequiredModalProps) {
  const titleId = useId()
  const bodyId = useId()
  const copy = guestActionCopy[action]

  return (
    <ModalOverlay
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={bodyId}
      width={420}
      contained={contained}
    >
      <div
        className="flex items-center justify-center rounded-2xl"
        style={{ width: 52, height: 52, background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}
      >
        {copy.icon}
      </div>

      <h2
        id={titleId}
        className="font-display font-bold mt-4"
        style={{ fontSize: 22, letterSpacing: '-0.01em', color: 'var(--fg)', margin: '16px 0 0' }}
      >
        {copy.title}
      </h2>
      <p id={bodyId} className="text-sm mt-2" style={{ color: 'var(--fg-muted)', lineHeight: 1.6 }}>
        {copy.message}
      </p>

      {destinationLabel && (
        <p className="text-xs mt-3" style={{ color: 'var(--fg-muted)' }}>
          After signing in we will take you back to <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{destinationLabel}</span>.
        </p>
      )}

      <div className="flex flex-col gap-2.5 mt-6">
        <PrimaryButton onClick={onCreateAccount}>Create free account</PrimaryButton>
        <SecondaryButton onClick={onSignIn}>I already have an account</SecondaryButton>
      </div>

      <div className="mt-4">
        <TermsAndPrivacyText actionLabel="creating an account" />
      </div>
    </ModalOverlay>
  )
}
