import { type ReactNode } from 'react'
import { AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react'
import ResponsiveSheet from './ResponsiveSheet'

export type ConfirmVariant = 'danger' | 'warning' | 'info'

export interface ConfirmDialogProps {
  /** Whether the confirmation dialog is currently open */
  isOpen: boolean
  /** Primary headline summarizing the action (e.g., "Delete Saved Trip?") */
  title: string
  /** Explanatory description clarifying consequences or required confirmation */
  description: string
  /** Text for primary confirmation button (e.g., "Delete", "Confirm", "Proceed") */
  confirmLabel?: string
  /** Text for dismissal/cancel button (defaults to "Cancel") */
  cancelLabel?: string
  /** Handler fired when the user confirms the action */
  onConfirm: () => void | Promise<void>
  /** Handler fired when the user cancels or closes the dialog */
  onCancel: () => void
  /** Visual severity variant: 'danger' (red), 'warning' (deal orange), 'info' (delve purple) */
  variant?: ConfirmVariant
  /** Whether an asynchronous confirm action is currently in progress */
  isLoading?: boolean
  /** Custom icon override. If omitted, uses default Lucide icon corresponding to variant */
  icon?: ReactNode
  /** Maximum width preset on desktop screens. Default is 'sm' for compact, punchy dialogs */
  maxWidth?: 'sm' | 'md' | 'lg'
}

interface VariantStyleConfig {
  icon: typeof AlertTriangle
  iconBg: string
  iconColor: string
  iconBorder: string
  confirmBtnBg: string
  confirmBtnHover: string
  confirmBtnShadow: string
  defaultConfirmLabel: string
}

const variantStyles: Record<ConfirmVariant, VariantStyleConfig> = {
  danger: {
    icon: AlertTriangle,
    iconBg: 'rgba(239, 68, 68, 0.12)',
    iconColor: '#EF4444',
    iconBorder: 'rgba(239, 68, 68, 0.25)',
    confirmBtnBg: '#DC2626',
    confirmBtnHover: '#B91C1C',
    confirmBtnShadow: '0 8px 20px -4px rgba(220, 38, 38, 0.35)',
    defaultConfirmLabel: 'Delete',
  },
  warning: {
    icon: AlertCircle,
    iconBg: 'rgba(224, 92, 26, 0.12)',
    iconColor: '#E05C1A',
    iconBorder: 'rgba(224, 92, 26, 0.25)',
    confirmBtnBg: '#E05C1A',
    confirmBtnHover: '#C44E14',
    confirmBtnShadow: '0 8px 20px -4px rgba(224, 92, 26, 0.35)',
    defaultConfirmLabel: 'Continue',
  },
  info: {
    icon: Info,
    iconBg: 'rgba(140, 82, 255, 0.12)',
    iconColor: '#8C52FF',
    iconBorder: 'rgba(140, 82, 255, 0.25)',
    confirmBtnBg: '#8C52FF',
    confirmBtnHover: '#7337E6',
    confirmBtnShadow: '0 8px 20px -4px rgba(140, 82, 255, 0.35)',
    defaultConfirmLabel: 'Confirm',
  },
}

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
  isLoading = false,
  icon,
  maxWidth = 'sm',
}: ConfirmDialogProps) {
  const config = variantStyles[variant]
  const DefaultIcon = config.icon
  const resolvedConfirmLabel = confirmLabel || config.defaultConfirmLabel

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onCancel}
      maxWidth={maxWidth}
      showCloseButton={!isLoading}
      dismissOnBackdrop={!isLoading}
      ariaLabel={title}
    >
      <div className="flex flex-col items-center sm:items-start text-center sm:text-left py-2">
        {/* Status Icon Capsule */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-200"
          style={{
            backgroundColor: config.iconBg,
            color: config.iconColor,
            border: `1px solid ${config.iconBorder}`,
          }}
          aria-hidden="true"
        >
          {icon || <DefaultIcon className="w-7 h-7" />}
        </div>

        {/* Headline */}
        <h3
          className="text-lg sm:text-xl font-bold tracking-tight m-0 mb-2"
          style={{
            fontFamily: 'Syne, var(--font-display, sans-serif)',
            color: 'var(--fg)',
          }}
        >
          {title}
        </h3>

        {/* Description Body */}
        <p
          className="text-sm leading-relaxed m-0 mb-6"
          style={{ color: 'var(--fg-muted)' }}
        >
          {description}
        </p>

        {/* Action Buttons (Full min-h-[44px] accessible touch targets) */}
        <div className="w-full flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="min-h-[44px] px-5 py-2.5 rounded-xl font-medium transition-colors cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
            style={{
              backgroundColor: 'var(--surface-subtle)',
              color: 'var(--fg)',
              border: '1px solid var(--border)',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = 'var(--border)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = 'var(--surface-subtle)'
              }
            }}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="min-h-[44px] px-6 py-2.5 rounded-xl font-semibold text-white transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none"
            style={{
              backgroundColor: config.confirmBtnBg,
              boxShadow: config.confirmBtnShadow,
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = config.confirmBtnHover
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = config.confirmBtnBg
              }
            }}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
            <span>{resolvedConfirmLabel}</span>
          </button>
        </div>
      </div>
    </ResponsiveSheet>
  )
}
