import { useId } from 'react'
import { ShieldAlert } from 'lucide-react'
import ModalOverlay from './ModalOverlay'
import PrimaryButton from './PrimaryButton'
import TextButton from './TextButton'
import { authConfig } from '../../data/authConfig'

export interface SessionExpiredModalProps {
  open: boolean
  onSignIn: () => void
  onDismiss?: () => void
  /** Where the traveler is returned to once they sign in again. */
  destinationLabel?: string
  contained?: boolean
}

export default function SessionExpiredModal({
  open,
  onSignIn,
  onDismiss,
  destinationLabel,
  contained = false,
}: SessionExpiredModalProps) {
  const titleId = useId()
  const bodyId = useId()

  return (
    <ModalOverlay
      open={open}
      labelledBy={titleId}
      describedBy={bodyId}
      width={420}
      showClose={false}
      dismissible={false}
      contained={contained}
    >
      <div
        className="flex items-center justify-center rounded-2xl"
        style={{
          width: 52,
          height: 52,
          background: 'color-mix(in srgb, var(--auth-warning) 16%, var(--surface))',
          color: 'var(--auth-warning)',
        }}
      >
        <ShieldAlert size={24} />
      </div>

      <h2
        id={titleId}
        className="font-display font-bold"
        style={{ fontSize: 22, color: 'var(--fg)', margin: '16px 0 0' }}
      >
        Your session has expired
      </h2>
      <p id={bodyId} className="text-sm mt-2" style={{ color: 'var(--fg-muted)', lineHeight: 1.6 }}>
        For your security we signed you out after {authConfig.sessionIdleTimeoutMinutes} minutes of inactivity. Sign
        in again to pick up where you left off
        {destinationLabel ? ` on ${destinationLabel}` : ''}.
      </p>

      <div className="mt-6 flex flex-col gap-1">
        <PrimaryButton onClick={onSignIn}>Sign in again</PrimaryButton>
        {onDismiss && (
          <TextButton align="center" tone="muted" onClick={onDismiss}>
            Continue as a guest
          </TextButton>
        )}
      </div>
    </ModalOverlay>
  )
}
