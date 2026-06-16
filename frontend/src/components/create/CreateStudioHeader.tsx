import { ArrowLeft, X } from 'lucide-react'
import './CreateStudioHeader.css'

type Props = {
  title: string
  subtitle?: string
  onBack: () => void
  onClose?: () => void
  actionLabel?: string
  actionDisabled?: boolean
  actionPending?: boolean
  onAction?: () => void
}

export function CreateStudioHeader({
  title,
  subtitle,
  onBack,
  onClose,
  actionLabel = 'Share',
  actionDisabled,
  actionPending,
  onAction,
}: Props) {
  return (
    <header className="create-studio-header">
      <button type="button" className="create-studio-header__icon" onClick={onBack} aria-label="Go back">
        <ArrowLeft size={18} strokeWidth={2.25} aria-hidden />
      </button>
      <div className="create-studio-header__copy">
        <strong>{title}</strong>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      {onAction ? (
        <button
          type="button"
          className="create-studio-header__share"
          disabled={actionDisabled || actionPending}
          onClick={onAction}
        >
          {actionPending ? '…' : actionLabel}
        </button>
      ) : onClose ? (
        <button type="button" className="create-studio-header__icon" onClick={onClose} aria-label="Close">
          <X size={18} strokeWidth={2.25} aria-hidden />
        </button>
      ) : (
        <span className="create-studio-header__spacer" aria-hidden />
      )}
    </header>
  )
}
