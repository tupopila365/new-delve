import { useId } from 'react'
import ModalOverlay from './ModalOverlay'
import PrimaryButton from './PrimaryButton'
import SecondaryButton from './SecondaryButton'
import TextButton from './TextButton'
import { guestActionCopy } from './AuthRequiredModal'
import type { GuestAction } from './AuthRequiredModal'

export interface AuthRequiredBottomSheetProps {
  open: boolean
  action?: GuestAction
  onSignIn: () => void
  onCreateAccount: () => void
  onClose: () => void
  onContinueBrowsing?: () => void
  contained?: boolean
}

/** Mobile counterpart of AuthRequiredModal — same copy, thumb-reachable actions. */
export default function AuthRequiredBottomSheet({
  open,
  action = 'generic',
  onSignIn,
  onCreateAccount,
  onClose,
  onContinueBrowsing,
  contained = false,
}: AuthRequiredBottomSheetProps) {
  const titleId = useId()
  const bodyId = useId()
  const copy = guestActionCopy[action]

  return (
    <ModalOverlay
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={bodyId}
      presentation="sheet"
      showClose={false}
      contained={contained}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex items-center justify-center rounded-2xl flex-shrink-0"
          style={{ width: 46, height: 46, background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}
        >
          {copy.icon}
        </span>
        <div className="flex-1 min-w-0">
          <h2
            id={titleId}
            className="font-display font-bold"
            style={{ fontSize: 19, color: 'var(--fg)', margin: 0 }}
          >
            {copy.title}
          </h2>
          <p id={bodyId} className="text-sm mt-1.5" style={{ color: 'var(--fg-muted)', lineHeight: 1.55 }}>
            {copy.message}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 mt-5">
        <PrimaryButton onClick={onCreateAccount}>Create free account</PrimaryButton>
        <SecondaryButton onClick={onSignIn}>Sign in</SecondaryButton>
        <TextButton align="center" tone="muted" onClick={onContinueBrowsing ?? onClose}>
          Keep browsing as a guest
        </TextButton>
      </div>
    </ModalOverlay>
  )
}
