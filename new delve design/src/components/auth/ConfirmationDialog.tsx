import { useId } from 'react'
import type { ReactNode } from 'react'
import ModalOverlay from './ModalOverlay'
import PrimaryButton from './PrimaryButton'
import SecondaryButton from './SecondaryButton'

export interface ConfirmationDialogProps {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const titleId = useId()
  const descId = useId()

  return (
    <ModalOverlay
      open={open}
      onClose={busy ? undefined : onCancel}
      labelledBy={titleId}
      describedBy={descId}
      showClose={!busy}
      dismissible={!busy}
    >
      <div className="flex flex-col gap-4 pt-2">
        <h2 id={titleId} className="font-display text-xl font-bold m-0 pr-10" style={{ color: 'var(--fg)' }}>
          {title}
        </h2>
        <div id={descId} className="text-sm" style={{ color: 'var(--fg-muted)', lineHeight: 1.5 }}>
          {description}
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <SecondaryButton onClick={onCancel} disabled={busy} fullWidth={false} size="md">
            {cancelLabel}
          </SecondaryButton>
          <PrimaryButton onClick={onConfirm} loading={busy} loadingLabel="Working…" fullWidth={false} size="md">
            {confirmLabel}
          </PrimaryButton>
        </div>
      </div>
    </ModalOverlay>
  )
}
